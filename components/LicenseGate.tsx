import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Loader2, Lock, RefreshCw, Smartphone, UserCog, MessageCircle, Gift } from 'lucide-react';
import { loadFromCloud } from '../services/cloudSync';
import { LOGO_ICON_DATA_URI } from '../assets/logoIcon';
import { LOGO_WORDMARK_DATA_URI } from '../assets/logoWordmark';

interface LicenseCache {
  code: string;
  checkedAt: number;
  validUntil: string;
}

interface AssistantCache {
  access_token: string;
  slug: string;
  checkedAt: number;
  validUntil: string;
}

interface LicenseGateProps {
  children: React.ReactNode;
}

const API_URL = 'https://corepanel-api.tajikr450.workers.dev/api/auth';
const ADMIN_AUTH_URL = 'https://corepanel-api.tajikr450.workers.dev/api/auth/admin';
const VOUCHER_API_URL = 'https://corepanel-api.tajikr450.workers.dev/api/license/redeem-voucher';
const PUBLIC_SETTINGS_URL = 'https://corepanel-api.tajikr450.workers.dev/api/public/settings';

interface PublicSettings {
  support_bot_username?: string;
  sales_bot_username?: string;
}

export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const isMiniApp = new URLSearchParams(window.location.search).has('code') && window.location.pathname.includes('miniapp');
  if (isMiniApp) {
    return <>{children}</>;
  }

  // Assistant mode is entirely URL-driven: the owner shares a link like
  // panel.example.com/?admin=<slug>, and whoever opens that link only ever
  // sees the assistant login (username + password) — never the owner's
  // license-code field. No mode toggle to confuse anyone with; someone who
  // just visits the plain URL always gets the normal owner screen.
  const adminSlug = new URLSearchParams(window.location.search).get('admin');
  const isAssistantMode = !!adminSlug;

  const [deviceId, setDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [licenseCode, setLicenseCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  // Assistant-mode fields
  const [assistantUsername, setAssistantUsername] = useState<string>('');
  const [assistantPassword, setAssistantPassword] = useState<string>('');
  // NEW — self-service renewal, so a customer whose license already expired
  // isn't stuck: this screen never got past /api/auth's "expired" rejection
  // before, and the existing voucher-redeem field only lives inside the
  // dashboard (which requires being past that same rejection) — a dead end.
  const [showVoucherField, setShowVoucherField] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redeemMsg, setRedeemMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // NEW — support-bot / trial-bot links, driven entirely by server-side
  // settings (see /api/public/settings) rather than hardcoded here. Empty
  // until the owner sets them from the admin console — no redeploy needed
  // later when a bot's username changes.
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({});

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
    if (isAssistantMode && adminSlug) {
      checkAssistantCache(adminSlug, id);
    } else {
      checkLicenseCache(id);
    }

    // Best-effort — never blocks the login form if it fails or is slow.
    fetch(PUBLIC_SETTINGS_URL)
      .then((res) => res.json())
      .then((data) => { if (data && data.ok) setPublicSettings(data.settings || {}); })
      .catch(() => {});
  }, []);

  const checkAssistantCache = async (slug: string, currentDeviceId: string) => {
    try {
      const cachedStr = localStorage.getItem('assistant_session_cache');
      if (cachedStr) {
        const cache: AssistantCache = JSON.parse(cachedStr);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        // Only reuse the cached session if it's for this exact shop's link —
        // a device that was an assistant for shop A must re-enter
        // credentials if it opens shop B's assistant link.
        if (cache.access_token && cache.slug === slug && cache.checkedAt && (now - cache.checkedAt < oneDayMs)) {
          setIsLoading(true);
          let loaded = false;
          try {
            loaded = await loadFromCloud({ access_token: cache.access_token });
          } catch (e) {
            console.warn('loadFromCloud error during assistant cached check:', e);
          }
          if (loaded) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
          localStorage.removeItem('assistant_session_cache');
        }
      }
    } catch (e) {
      console.error('Failed to read assistant session cache', e);
    }
    setIsLoading(false);
  };

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
            loaded = await loadFromCloud({ code: cache.code });
          } catch (e) {
            console.warn('loadFromCloud error during cached check:', e);
          }
          if (loaded) {
              localStorage.removeItem('assistant_session_cache');
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
        // A device is only ever one role at a time — clear any stale
        // assistant session so Settings.tsx (and anything else checking
        // role) never gets confused by leftover state from an earlier test.
        localStorage.removeItem('assistant_session_cache');
        
        // Load state from cloud before showing children
        setIsLoading(true);
        try {
          await loadFromCloud({ code: code.trim() });
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

  // Assistant login — same shape of flow as validateLicense, but hits
  // /api/auth/admin with slug+username+password instead of a license code.
  const validateAssistantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSlug) return;
    if (!assistantUsername.trim() || !assistantPassword.trim()) {
      setErrorMsg('لطفاً نام‌کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setNetworkError(false);

    try {
      const response = await fetch(ADMIN_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: adminSlug,
          username: assistantUsername.trim(),
          password: assistantPassword,
          device_id: deviceId,
        }),
      });

      const data = await response.json();

      if (response.status === 429 || data.reason === 'rate_limited') {
        setErrorMsg('⏳ تعداد تلاش بیش از حد مجاز بود. لطفاً یک دقیقه صبر کنید و دوباره امتحان کنید.');
      } else if (data.ok && data.access_token) {
        const newCache: AssistantCache = {
          access_token: data.access_token,
          slug: adminSlug,
          checkedAt: Date.now(),
          validUntil: data.expires_at || '',
        };
        localStorage.setItem('assistant_session_cache', JSON.stringify(newCache));
        // Same reasoning as the owner path above, in reverse.
        localStorage.removeItem('license_cache');

        setIsLoading(true);
        try {
          await loadFromCloud({ access_token: data.access_token });
        } catch (e) {
          console.warn('loadFromCloud error during assistant validate:', e);
        }

        setIsAuthenticated(true);
        setErrorMsg(null);
      } else {
        let message = 'نام‌کاربری یا رمز عبور اشتباه است.';
        if (data.reason === 'revoked') message = 'این فروشگاه غیرفعال شده.';
        else if (data.reason === 'expired') message = 'اعتبار لایسنس این فروشگاه تموم شده.';
        else if (data.reason === 'requires_multi_device_license') message = 'دسترسی دستیار برای این فروشگاه فعال نیست.';
        else if (data.reason === 'device_limit') message = 'ظرفیت دستگاه‌های این لایسنس پره.';
        setErrorMsg(message);
      }
    } catch (e) {
      console.error('Assistant login failed', e);
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
      {/* Background Decor — soft brand-colored blobs, kept light enough to stay readable */}
      <div className="fixed -top-24 -right-24 w-[420px] h-[420px] bg-gradient-to-br from-brand-teal to-brand-light rounded-[40%_60%_65%_35%/45%_45%_55%_55%] opacity-40 blur-[40px] pointer-events-none" />
      <div className="fixed -bottom-32 -left-24 w-[460px] h-[460px] bg-gradient-to-tr from-brand-amber to-brand-orange rounded-[55%_45%_35%_65%/55%_35%_65%_45%] opacity-30 blur-[50px] pointer-events-none" />
      <div className="fixed top-1/3 -left-16 w-[220px] h-[220px] bg-brand-navy rounded-full opacity-[0.05] blur-[30px] pointer-events-none" />

      <div className="relative max-w-md w-full bg-white border border-black/5 rounded-3xl shadow-xl z-10 overflow-hidden transform hover:scale-[1.015] transition-transform duration-300">

        {/* Colored header band — separates the brand identity from the plain form below */}
        <div className="bg-gradient-to-l from-brand-teal to-brand-light px-8 pt-8 pb-8 text-center relative">
          {isAssistantMode ? (
            <div className="relative inline-block">
              <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                <UserCog size={28} className="text-brand-teal" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-amber rounded-full flex items-center justify-center text-[10px] text-brand-navy font-bold border-2 border-white">
                🔑
              </div>
            </div>
          ) : (
            <div className="mx-auto bg-white rounded-2xl shadow-lg px-5 py-3 inline-flex items-center gap-2.5">
              <img src={LOGO_ICON_DATA_URI} alt="AsanHub" className="w-9 h-9 object-contain shrink-0" />
              <img src={LOGO_WORDMARK_DATA_URI} alt="AsanHub" className="h-7 w-auto object-contain" />
            </div>
          )}
          <h1 className="text-2xl font-black text-white mt-4">
            {isAssistantMode ? 'ورود دستیار' : 'فعالسازی پنل مدیریت'}
          </h1>
          {!isAssistantMode && (
            <p className="text-xs text-white/85 mt-1.5">مدیریت هوشمند فروشگاه تلگرامی شما</p>
          )}
        </div>

        <div className="px-8 pb-8 pt-6">
          <p className="text-sm text-brand-navy/80 leading-relaxed text-center mb-6">
            {isAssistantMode
              ? 'نام‌کاربری و رمز عبوری که مدیر فروشگاه در اختیارتان گذاشته را وارد کنید.'
              : 'جهت دسترسی به خدمات و بخش‌های مختلف پنل هوشمند مدیریت بات، لطفاً لایسنس‌کد معتبر خود را وارد نمایید.'}
          </p>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5 animate-slide-up">
            <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-normal">{errorMsg}</div>
          </div>
        )}

        {/* Assistant login form — shown only when opened via the shop's
            assistant link (?admin=<slug>); no license-code field, no
            voucher-renewal field, nothing owner-only visible here at all. */}
        {isAssistantMode ? (
          <form onSubmit={validateAssistantLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-brand-navy mb-2 font-bold">نام‌کاربری:</label>
              <input
                type="text"
                required
                value={assistantUsername}
                onChange={(e) => setAssistantUsername(e.target.value)}
                className="w-full bg-black/[0.03] border border-black/10 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal rounded-xl px-4 py-3 text-sm text-center text-brand-navy outline-none transition-all duration-200"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm text-brand-navy mb-2 font-bold">رمز عبور:</label>
              <input
                type="password"
                required
                value={assistantPassword}
                onChange={(e) => setAssistantPassword(e.target.value)}
                className="w-full bg-black/[0.03] border border-black/10 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal rounded-xl px-4 py-3 text-sm text-center text-brand-navy outline-none transition-all duration-200"
                disabled={isSubmitting}
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !assistantUsername.trim() || !assistantPassword.trim()}
                className="w-full py-3.5 bg-brand-teal hover:bg-brand-teal/90 text-white disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>در حال ورود...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>ورود</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
        <>
        {/* Main form */}
        <form onSubmit={handleActivate} className="space-y-5">
          <div>
            <label className="block text-sm text-brand-navy mb-2 font-bold">لایسنس‌کد:</label>
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
        </>
        )}

        {/* NEW — support-bot / free-trial links, owner mode only (an
            assistant is already an existing customer's team member, not
            someone who needs a trial or the general support entry point).
            Each hides itself unless the server-side setting is actually
            configured (see /api/public/settings) — so this never shows a
            dead link to a real visitor before the owner sets it. */}
        {!isAssistantMode && (publicSettings.support_bot_username || publicSettings.sales_bot_username) && (
          <div className="mt-6 pt-6 border-t border-black/5 flex flex-col gap-2">
            {publicSettings.support_bot_username && (
              <a
                href={`https://t.me/${publicSettings.support_bot_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-black/[0.03] hover:bg-black/[0.06] border border-black/5 text-brand-navy/70 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle size={14} />
                پشتیبانی
              </a>
            )}
            {publicSettings.sales_bot_username && (
              <a
                href={`https://t.me/${publicSettings.sales_bot_username}?start=trial`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-brand-amber/15 hover:bg-brand-amber/25 border border-brand-amber/20 text-brand-orange rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Gift size={14} />
                دریافت پنل آزمایشی رایگان
              </a>
            )}
          </div>
        )}

        {/* Device Information section */}
        <div className="mt-8 pt-6 border-t border-black/5 flex items-center justify-between text-[10px] text-brand-navy/60 font-mono">
          <div className="flex items-center gap-1.5">
            <Smartphone size={12} className="text-brand-navy/60" />
            <span>دستگاه شما:</span>
          </div>
          <span className="bg-black/[0.03] px-2 py-1 rounded border border-black/5 max-w-[200px] truncate" title={deviceId}>
            {deviceId}
          </span>
        </div>
        </div>

      </div>
    </div>
  );
};
