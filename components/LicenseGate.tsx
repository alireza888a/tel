import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, AlertCircle, Loader2, Lock, RefreshCw, Smartphone } from 'lucide-react';
import { loadFromCloud } from '../services/cloudSync';

interface LicenseCache {
  code: string;
  checkedAt: number;
  validUntil: string;
}

interface LicenseGateProps {
  children: React.ReactNode;
}

const API_URL = 'https://corepanel-api.tajikr450.workers.dev/api/auth';
const VOUCHER_API_URL = 'https://corepanel-api.tajikr450.workers.dev/api/license/redeem-voucher';

export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const isMiniApp = new URLSearchParams(window.location.search).has('code') && window.location.pathname.includes('miniapp');
  if (isMiniApp) {
    return <>{children}</>;
  }

  const [deviceId, setDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [licenseCode, setLicenseCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  // NEW — self-service renewal, so a customer whose license already expired
  // isn't stuck: this screen never got past /api/auth's "expired" rejection
  // before, and the existing voucher-redeem field only lives inside the
  // dashboard (which requires being past that same rejection) — a dead end.
  const [showVoucherField, setShowVoucherField] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redeemMsg, setRedeemMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Initialize Device ID
  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      try {
        id = crypto.randomUUID();
      } catch (e) {
        // Safe fallback if crypto.randomUUID is not available in non-secure context or old browser
        id = 'dev-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);

    // Initial check for cache
    checkLicenseCache(id);
  }, []);

  const checkLicenseCache = async (currentDeviceId: string) => {
    try {
      const cachedStr = localStorage.getItem('license_cache');
      if (cachedStr) {
        const cache: LicenseCache = JSON.parse(cachedStr);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Check if checked less than 24 hours ago — but still must respect
        // whatever the server says RIGHT NOW (revoked/expired), not just
        // trust the stale local cache blindly. loadFromCloud returns false
        // (never throws) when the server rejects the code, so its return
        // value — not just "did it throw" — is what actually matters here.
        if (cache.code && cache.checkedAt && (now - cache.checkedAt < oneDayMs)) {
          setIsLoading(true);
          let loaded = false;
          try {
            loaded = await loadFromCloud(cache.code);
          } catch (e) {
            console.warn('loadFromCloud error during cached check:', e);
          }
          if (loaded) {
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
          }
          // The cached code was rejected by the server right now (revoked,
          // expired, or otherwise invalid) — fall through to a full
          // re-validation instead of letting them in anyway, so the exact
          // reason (and a proper Persian error message) is shown.
          await validateLicense(cache.code, currentDeviceId, true);
          return;
        }

        // If older than 24h, auto-validate with server
        if (cache.code) {
          await validateLicense(cache.code, currentDeviceId, true);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to read license cache', e);
    }
    setIsLoading(false);
  };

  const validateLicense = async (code: string, currentDeviceId: string, isAutoCheck: boolean = false) => {
    if (!code.trim()) {
      setErrorMsg('لطفاً لایسنس‌کد را وارد کنید.');
      return;
    }

    if (!isAutoCheck) {
      setIsSubmitting(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);
    setNetworkError(false);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim(),
          device_id: currentDeviceId,
        }),
      });

      const data = await response.json();

      if (response.status === 429 || data.reason === 'rate_limited') {
        setErrorMsg('⏳ تعداد تلاش بیش از حد مجاز بود. لطفاً یک دقیقه صبر کنید و دوباره امتحان کنید.');
      } else if (data.ok) {
        if (data.access_token) {
          localStorage.setItem('webhook_access_token', data.access_token);
        }

        // Update cache
        const newCache: LicenseCache = {
          code: code.trim(),
          checkedAt: Date.now(),
          validUntil: data.expires_at || '',
        };
        localStorage.setItem('license_cache', JSON.stringify(newCache));
        
        // Load state from cloud before showing children
        setIsLoading(true);
        try {
          await loadFromCloud(code.trim());
        } catch (e) {
          console.warn('loadFromCloud error during validate:', e);
        }

        setIsAuthenticated(true);
        setErrorMsg(null);
      } else {
        // Map reasons to elegant Persian messages
        let message = 'لایسنس‌کد نامعتبر است.';
        if (data.reason === 'invalid') {
          message = 'لایسنس‌کد اشتباه است.';
        } else if (data.reason === 'expired') {
          message = 'اعتبار لایسنس تموم شده.';
        } else if (data.reason === 'revoked') {
          message = 'این لایسنس غیرفعال شده.';
        } else if (data.reason === 'device_limit') {
          message = 'این لایسنس روی حداکثر تعداد دستگاه مجاز فعاله.';
        }
        setErrorMsg(message);
        // Clear invalid cache if auto-check failed
        localStorage.removeItem('license_cache');
      }
    } catch (e) {
      console.error('License validation failed', e);
      setNetworkError(true);
      setErrorMsg('اتصال به سرور برقرار نشد، دوباره تلاش کن.');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    validateLicense(licenseCode, deviceId);
  };

  const handleRetry = () => {
    const cachedStr = localStorage.getItem('license_cache');
    let codeToUse = licenseCode;
    if (cachedStr) {
      try {
        const cache = JSON.parse(cachedStr);
        if (cache.code) codeToUse = cache.code;
      } catch (err) {}
    }
    validateLicense(codeToUse || licenseCode, deviceId);
  };

  // NEW — lets a customer stuck on an "expired" (or device-limit) error
  // redeem a renewal/top-up voucher right here, without ever needing to
  // get past /api/auth first. Reuses whatever license code is already
  // typed in the field above. On success, immediately retries the normal
  // login so they land straight in the dashboard.
  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCode.trim() || !voucherCode.trim()) return;

    setIsRedeeming(true);
    setRedeemMsg(null);

    try {
      const response = await fetch(VOUCHER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: licenseCode.trim(), voucherCode: voucherCode.trim() }),
      });
      const data = await response.json();

      if (data.ok) {
        setRedeemMsg({ text: '✅ کد با موفقیت اعمال شد! در حال ورود...', ok: true });
        setVoucherCode('');
        // Re-run the normal login flow now that the license is extended —
        // this also clears the old "expired" errorMsg on success.
        await validateLicense(licenseCode, deviceId);
      } else {
        let msg = 'کد تمدید نامعتبر است.';
        if (data.reason === 'voucher_invalid') msg = 'این کد تمدید پیدا نشد.';
        else if (data.reason === 'voucher_already_used') msg = 'این کد تمدید قبلاً استفاده شده.';
        else if (data.reason === 'invalid') msg = 'لایسنس‌کدی که بالا نوشتید نامعتبره.';
        else if (data.reason === 'revoked') msg = 'این لایسنس غیرفعال شده — امکان تمدید خودکار نیست، با پشتیبانی تماس بگیرید.';
        setRedeemMsg({ text: '❌ ' + msg, ok: false });
      }
    } catch (e) {
      setRedeemMsg({ text: '❌ اتصال به سرور برقرار نشد، دوباره تلاش کنید.', ok: false });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F4F6F7] text-brand-navy flex flex-col items-center justify-center p-4">
        <div className="relative text-center max-w-md w-full bg-white border border-black/5 rounded-3xl p-8 shadow-lg flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-brand-teal rounded-2xl flex items-center justify-center shadow-lg">
              <Lock size={36} className="text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2 text-brand-navy">در حال تایید لایسنس...</h2>
          <p className="text-sm text-brand-navy/50 mb-6">لطفاً چند لحظه منتظر بمانید تا وضعیت لایسنس شما بررسی شود.</p>
          <Loader2 size={32} className="text-brand-teal animate-spin" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F6F7] text-brand-navy flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="relative max-w-md w-full bg-white border border-black/5 rounded-3xl p-8 shadow-lg z-10">
        
        {/* Header decoration */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="w-16 h-16 bg-brand-teal rounded-2xl flex items-center justify-center shadow-md">
              <Key size={28} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-amber rounded-full flex items-center justify-center text-[10px] text-brand-navy font-bold border-2 border-white">
              🔑
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-brand-navy mb-2">
            فعالسازی پنل مدیریت
          </h1>
          <p className="text-xs text-brand-navy/50 max-w-sm leading-relaxed">
            جهت دسترسی به خدمات و بخش‌های مختلف پنل هوشمند مدیریت بات، لطفاً لایسنس‌کد معتبر خود را وارد نمایید.
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5 animate-slide-up">
            <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-normal">{errorMsg}</div>
          </div>
        )}

        {/* Main form */}
        <form onSubmit={handleActivate} className="space-y-5">
          <div>
            <label className="block text-xs text-brand-navy/50 mb-2 font-medium">لایسنس‌کد:</label>
            <div className="relative">
              <input
                type="text"
                required
                value={licenseCode}
                onChange={(e) => setLicenseCode(e.target.value)}
                placeholder="مثال: XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-black/[0.03] border border-black/10 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal rounded-xl px-4 py-3 text-sm text-center text-brand-navy placeholder-brand-navy/30 outline-none transition-all duration-200 font-mono"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="pt-2">
            {networkError ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-brand-amber hover:bg-brand-amber/90 text-brand-navy rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw size={18} className={isSubmitting ? 'animate-spin' : ''} />
                تلاش مجدد
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !licenseCode.trim()}
                className="w-full py-3.5 bg-brand-teal hover:bg-brand-teal/90 text-white disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>در حال فعالسازی...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>فعالسازی پنل</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* NEW — self-service renewal, only surfaced once there's already an
            error above (expired / device limit / etc). Reuses whatever
            license code is already typed in the field above. */}
        {errorMsg && !networkError && (
          <div className="mt-4">
            {!showVoucherField ? (
              <button
                type="button"
                onClick={() => setShowVoucherField(true)}
                className="w-full text-xs text-brand-teal hover:underline text-center py-1"
              >
                🎟 کد تمدید یا شارژ دارید؟
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-black/[0.02] border border-black/5 space-y-3 animate-slide-up">
                <label className="block text-xs text-brand-navy/50 font-medium">کد تمدید / شارژ:</label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="مثال: RNW-XXXX-XXXX"
                  disabled={isRedeeming}
                  className="w-full bg-white border border-black/10 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal rounded-xl px-4 py-2.5 text-sm text-center text-brand-navy placeholder-brand-navy/30 outline-none transition-all duration-200 font-mono"
                />
                {redeemMsg && (
                  <div className={`text-xs leading-relaxed ${redeemMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {redeemMsg.text}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRedeemVoucher}
                    disabled={isRedeeming || !licenseCode.trim() || !voucherCode.trim()}
                    className="flex-1 py-2.5 bg-brand-teal hover:bg-brand-teal/90 text-white disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {isRedeeming ? <Loader2 size={15} className="animate-spin" /> : '✅'}
                    اعمال کد و ورود
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowVoucherField(false); setRedeemMsg(null); }}
                    disabled={isRedeeming}
                    className="px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-xs text-brand-navy/70"
                  >
                    انصراف
                  </button>
                </div>
                {!licenseCode.trim() && (
                  <p className="text-[11px] text-brand-orange">⚠️ اول لایسنس‌کد خودتون رو توی فیلد بالا وارد کنید.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Device Information section */}
        <div className="mt-8 pt-6 border-t border-black/5 flex items-center justify-between text-[10px] text-brand-navy/40 font-mono">
          <div className="flex items-center gap-1.5">
            <Smartphone size={12} className="text-brand-navy/40" />
            <span>دستگاه شما:</span>
          </div>
          <span className="bg-black/[0.03] px-2 py-1 rounded border border-black/5 max-w-[200px] truncate" title={deviceId}>
            {deviceId}
          </span>
        </div>

      </div>
    </div>
  );
};
