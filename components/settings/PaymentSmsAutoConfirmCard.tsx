import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { MessageSquareText, Copy, Check, Loader2, ToggleLeft, ToggleRight, Trash2, ListChecks, RefreshCw, ShieldAlert } from 'lucide-react';

const GET_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/get';
const SETUP_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/setup';
const SET_SENDERS_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/set-senders';
const TOGGLE_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/toggle';
const CLEAR_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/clear';
const LOGS_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/logs';

const getLicenseCode = (): string | null => {
  try {
    const cached = JSON.parse(localStorage.getItem('license_cache') || '{}');
    return cached.code || null;
  } catch {
    return null;
  }
};

interface SmsLogEntry {
  id: number;
  raw_text: string;
  sender: string | null;
  extracted_amount: number | null;
  matched_order_id: string | null;
  status: string;
  created_at: number;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  confirmed: { text: '✅ تایید شد', color: 'text-emerald-600' },
  no_match: { text: '⚠️ سفارشی پیدا نشد', color: 'text-amber-600' },
  multiple_match: { text: '⚠️ چند سفارش مطابق', color: 'text-amber-600' },
  over_cap: { text: '💰 مبلغ بالا (دستی)', color: 'text-blue-600' },
  parse_failed: { text: '❓ مبلغ تشخیص داده نشد', color: 'text-brand-navy/40' },
  untrusted_sender: { text: '🚨 فرستنده نامعتبر — نادیده گرفته شد', color: 'text-red-600' },
  no_sender_field: { text: '⚠️ فرستنده مشخص نشد — نیاز به بررسی دستی', color: 'text-amber-600' },
  processing: { text: '⏳ در حال بررسی', color: 'text-brand-navy/40' },
};

export const PaymentSmsAutoConfirmCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [capToman, setCapToman] = useState(5000000);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [trustedSenders, setTrustedSenders] = useState('');
  const [senderInput, setSenderInput] = useState('');
  const [savingSenders, setSavingSenders] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchStatus = async (isRetry = false) => {
    const code = getLicenseCode();
    if (!code) { setLoading(false); return; }
    setLoadError(false);
    try {
      const res = await fetch(GET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigured(!!data.configured);
        setEnabled(!!data.enabled);
        setWebhookUrl(data.webhook_url || null);
        setTrustedSenders(data.trusted_senders || '');
        setSenderInput(data.trusted_senders || '');
        if (data.cap_toman) setCapToman(data.cap_toman);
        if (data.window_minutes) setWindowMinutes(data.window_minutes);
      } else if (!isRetry) {
        // First failure right after a refresh is very often just the
        // shared rate limiter catching this request in the burst of a
        // dozen others the panel fires at once on load — wait a beat and
        // try exactly once more before treating it as a real error. This
        // makes the common transient case resolve invisibly instead of
        // ever showing the (wrong) "not configured" state at all.
        await new Promise((r) => setTimeout(r, 1500));
        await fetchStatus(true);
        return;
      } else {
        // FIX: this used to fall straight through on a failed response
        // (e.g. a 429 from the shared rate limiter — very possible right
        // after a full page refresh, when a dozen other panel requests
        // fire at the same time) leaving every field at its initial
        // default. That default is `configured: false`, which shows the
        // "ساخت لینک و شروع تنظیمات" setup button — indistinguishable from
        // a shop that was genuinely never configured, even though nothing
        // was actually lost server-side. Worse: tapping that button in
        // this state calls /api/payment-sms/setup again, which mints a
        // brand-new webhook secret and silently breaks whatever SMS
        // forwarder app was already pointed at the old one. Now a failed
        // load (after one silent retry) surfaces as its own explicit
        // error state instead.
        setLoadError(true);
      }
    } catch (e) {
      if (!isRetry) {
        await new Promise((r) => setTimeout(r, 1500));
        await fetchStatus(true);
        return;
      }
      console.warn('Failed to load payment-sms status', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const fetchLogs = async () => {
    const code = getLicenseCode();
    if (!code) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(LOGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, limit: 20 }),
      });
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch (e) {
      console.warn('Failed to load payment-sms logs', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleToggleLogs = () => {
    const next = !showLogs;
    setShowLogs(next);
    if (next) fetchLogs();
  };

  const handleSetup = async () => {
    const code = getLicenseCode();
    if (!code) return;
    setIsSaving(true);
    setMsg(null);
    try {
      const res = await fetch(SETUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: '✅ لینک ساخته شد. حالا اول شماره‌ی فرستنده‌ی بانک رو وارد کن، بعد فعالش کن.', ok: true });
        await fetchStatus();
      } else {
        setMsg({ text: '❌ ساخت لینک ناموفق بود، دوباره تلاش کنید.', ok: false });
      }
    } catch (e) {
      setMsg({ text: '❌ خطا در ارتباط با سرور.', ok: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSenders = async () => {
    const code = getLicenseCode();
    if (!code) return;
    setSavingSenders(true);
    setMsg(null);
    try {
      const res = await fetch(SET_SENDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, senders: senderInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setTrustedSenders(senderInput);
        setMsg({ text: '✅ شماره‌ی فرستنده(ها) ذخیره شد.', ok: true });
      } else {
        setMsg({ text: '❌ ذخیره ناموفق بود.', ok: false });
      }
    } catch (e) {
      setMsg({ text: '❌ خطا در ارتباط با سرور.', ok: false });
    } finally {
      setSavingSenders(false);
    }
  };

  const handleToggleEnabled = async () => {
    const code = getLicenseCode();
    if (!code) return;
    const newVal = !enabled;
    if (newVal && !trustedSenders.trim()) {
      setMsg({ text: '⚠️ اول باید شماره‌ی فرستنده‌ی بانک رو وارد و ذخیره کنی، بعد بتونی فعالش کنی.', ok: false });
      return;
    }
    setEnabled(newVal); // optimistic
    try {
      const res = await fetch(TOGGLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, enabled: newVal }),
      });
      const data = await res.json();
      if (!data.ok) {
        setEnabled(!newVal);
        if (data.reason === 'senders_required') {
          setMsg({ text: '⚠️ اول باید شماره‌ی فرستنده‌ی بانک رو وارد و ذخیره کنی.', ok: false });
        } else {
          setMsg({ text: '❌ تغییر وضعیت ناموفق بود.', ok: false });
        }
      }
    } catch (e) {
      setEnabled(!newVal);
      setMsg({ text: '❌ خطا در ارتباط با سرور.', ok: false });
    }
  };

  const handleClear = async () => {
    const code = getLicenseCode();
    if (!code) return;
    setIsSaving(true);
    setConfirmingClear(false);
    try {
      const res = await fetch(CLEAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigured(false);
        setEnabled(false);
        setWebhookUrl(null);
        setTrustedSenders('');
        setSenderInput('');
        setMsg({ text: '✅ غیرفعال شد.', ok: true });
      }
    } catch (e) {
      setMsg({ text: '❌ خطا در ارتباط با سرور.', ok: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <GlassCard title="تایید خودکار پرداخت (پیامک بانکی)">
        <div className="flex items-center justify-center py-10 text-brand-navy/40">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </GlassCard>
    );
  }

  if (loadError) {
    return (
      <GlassCard title="تایید خودکار پرداخت (پیامک بانکی)">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <ShieldAlert size={28} className="text-amber-600" />
          <p className="text-sm text-brand-navy/70 max-w-sm">
            بارگذاری وضعیت این بخش موفق نبود (احتمالاً یه خطای موقت شبکه). این به این معنی نیست که تنظیمات قبلی‌تون پاک شده — فقط نمایشش الان لود نشد.
          </p>
          <button
            onClick={() => { setLoading(true); fetchStatus(); }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} />
            <span>تلاش دوباره</span>
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      title="تایید خودکار پرداخت (پیامک بانکی)"
      action={<MessageSquareText size={20} className="text-cyan-600" />}
    >
      <div className="space-y-5">
        <p className="text-sm text-brand-navy/60 leading-relaxed">
          وقتی این فیچر روشن باشه، هر بار که پیامک واریز بانکی روی گوشی شما بیاد، یه اپ فورواردر پیامک اونو برای این آدرس می‌فرسته و اگه دقیقاً به یک سفارش در انتظار بخوره، خودکار تایید می‌شه — بدون نیاز به باز کردن پنل.
        </p>

        {!configured ? (
          <button
            onClick={handleSetup}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <MessageSquareText size={18} />}
            <span>ساخت لینک و شروع تنظیمات</span>
          </button>
        ) : (
          <>
            <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={16} className="text-red-600" />
                <label className="text-xs font-bold text-red-600">شماره/نام فرستنده‌ی پیامک بانک (اجباری برای فعال‌سازی)</label>
              </div>
              <p className="text-[11px] text-brand-navy/50 mb-2 leading-relaxed">
                بدون این، هرکسی که شماره‌ی گوشیت رو داشته باشه می‌تونه یه پیامک الکی بفرسته و سفارش رو مجانی تایید بگیره. این‌جا شماره یا نامی که بانک واقعاً باهاش برات پیامک می‌فرسته رو وارد کن (اگه چندتا داری، با ویرگول جدا کن).
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={senderInput}
                  onChange={(e) => setSenderInput(e.target.value)}
                  placeholder="مثلاً: 10005701, بانک ملت"
                  className="flex-1 bg-black/[0.03] border border-black/10 rounded-xl px-3 py-2.5 text-xs text-brand-navy outline-none focus:border-red-400"
                  dir="ltr"
                />
                <button
                  onClick={handleSaveSenders}
                  disabled={savingSenders}
                  className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {savingSenders ? <Loader2 className="animate-spin" size={16} /> : 'ذخیره'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/[0.03] border border-black/5 rounded-xl">
              <div>
                <div className="text-sm font-bold text-brand-navy">وضعیت</div>
                <div className="text-xs text-brand-navy/50 mt-1">
                  {enabled ? 'فعال — پیامک‌ها بررسی می‌شن' : 'غیرفعال — پیامکی بررسی نمی‌شه'}
                </div>
              </div>
              <button onClick={handleToggleEnabled} className="text-cyan-600">
                {enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-brand-navy/30" />}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-navy/50 mb-2">آدرس webhook (این رو توی اپ فورواردر پیامک وارد کن)</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={webhookUrl || ''}
                  className="flex-1 bg-black/[0.03] border border-black/5 rounded-xl px-3 py-2.5 text-xs text-brand-navy/70 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-black/[0.03] hover:bg-black/[0.06] rounded-xl text-brand-navy/50 transition-colors"
                >
                  {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs text-brand-navy/70 leading-relaxed space-y-2">
              <p className="font-bold text-brand-navy">راهنمای نصب:</p>
              <p>۱. روی گوشی‌ای که پیامک بانکی روش میاد، یه اپ SMS Forwarder نصب کن (اندروید: «SMS Forwarder»، آیفون: هرکدوم از اپ‌های SMS Forwarder موجود در App Store که از Custom API/Webhook پشتیبانی می‌کنن).</p>
              <p>۲. توی تنظیمات اپ، مقصد رو روی «Custom API / Webhook» بذار و آدرس بالا رو وارد کن (روش POST، بدنه JSON).</p>
              <p>۳. فیلد متن پیامک رو با نام <code className="bg-black/10 px-1.5 py-0.5 rounded">text</code> و فیلد فرستنده رو با نام <code className="bg-black/10 px-1.5 py-0.5 rounded">sender</code> بفرست (اکثر اپ‌ها این فیلدها رو خودشون قابل‌تنظیم می‌ذارن) — فیلد فرستنده خیلی مهمه، بدونش امکان تشخیص پیامک جعلی نیست.</p>
              <p>۴. یه پیامک تست بفرست و بعد از چند ثانیه، «تاریخچه» پایین همین کارت رو چک کن ببین دریافت شده یا نه.</p>
              <p className="text-amber-700 pt-1">⚠️ مبلغ بالای {capToman.toLocaleString('fa-IR')} تومان همیشه دستی تایید می‌شه. سفارش‌های در انتظار هم فقط تا {windowMinutes} دقیقه بعد از ثبت، برای تایید خودکار معتبرن.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleLogs}
                className="flex-1 py-2.5 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-brand-navy/70 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ListChecks size={16} />
                <span>{showLogs ? 'بستن تاریخچه' : 'مشاهده تاریخچه‌ی اخیر'}</span>
              </button>
              {showLogs && (
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  title="رفرش تاریخچه"
                  className="py-2.5 px-3 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-brand-navy/70 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
              )}
              {!confirmingClear ? (
                <button
                  onClick={() => setConfirmingClear(true)}
                  disabled={isSaving}
                  className="py-2.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  <span>غیرفعال کامل</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleClear} disabled={isSaving} className="py-2.5 px-3 rounded-xl bg-red-500 text-white text-xs font-bold">مطمئنم</button>
                  <button onClick={() => setConfirmingClear(false)} className="py-2.5 px-3 rounded-xl bg-black/[0.03] text-brand-navy/50 text-xs font-bold">انصراف</button>
                </div>
              )}
            </div>

            {showLogs && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {loadingLogs ? (
                  <div className="flex justify-center py-6 text-brand-navy/40"><Loader2 className="animate-spin" size={20} /></div>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-brand-navy/50 text-center py-4">هنوز پیامکی دریافت نشده.</p>
                ) : (
                  logs.map((log) => {
                    const label = STATUS_LABELS[log.status] || { text: log.status, color: 'text-brand-navy/40' };
                    return (
                      <div key={log.id} className="p-3 bg-black/[0.03] border border-black/5 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${label.color}`}>{label.text}</span>
                          <span className="text-brand-navy/40">{new Date(log.created_at).toLocaleString('fa-IR')}</span>
                        </div>
                        {log.extracted_amount ? (
                          <div className="text-brand-navy/70">مبلغ تشخیص‌داده‌شده: {log.extracted_amount.toLocaleString('fa-IR')} تومان{log.matched_order_id ? ` — سفارش ${log.matched_order_id}` : ''}</div>
                        ) : null}
                        {log.sender ? (
                          <div className="text-brand-navy/50 mt-1" dir="ltr">فرستنده: <span className="font-mono text-brand-navy">{log.sender}</span></div>
                        ) : null}
                        <div className="text-brand-navy/50 mt-1 truncate" title={log.raw_text}>{log.raw_text}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {msg && (
          <div className={`text-xs font-bold text-center ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
