import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { MessageSquareText, Copy, Check, Loader2, ToggleLeft, ToggleRight, Trash2, ListChecks } from 'lucide-react';

const GET_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/get';
const SETUP_URL = 'https://corepanel-api.tajikr450.workers.dev/api/payment-sms/setup';
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
  extracted_amount: number | null;
  matched_order_id: string | null;
  status: string;
  created_at: number;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  confirmed: { text: '✅ تایید شد', color: 'text-emerald-400' },
  no_match: { text: '⚠️ سفارشی پیدا نشد', color: 'text-amber-400' },
  multiple_match: { text: '⚠️ چند سفارش مطابق', color: 'text-amber-400' },
  over_cap: { text: '💰 مبلغ بالا (دستی)', color: 'text-blue-400' },
  parse_failed: { text: '❓ مبلغ تشخیص داده نشد', color: 'text-slate-400' },
  processing: { text: '⏳ در حال بررسی', color: 'text-slate-400' },
};

export const PaymentSmsAutoConfirmCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [capToman, setCapToman] = useState(5000000);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchStatus = async () => {
    const code = getLicenseCode();
    if (!code) { setLoading(false); return; }
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
        if (data.cap_toman) setCapToman(data.cap_toman);
        if (data.window_minutes) setWindowMinutes(data.window_minutes);
      }
    } catch (e) {
      console.warn('Failed to load payment-sms status', e);
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
        setMsg({ text: '✅ لینک و رمز webhook ساخته شد. مراحل زیر رو دنبال کن.', ok: true });
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

  const handleToggleEnabled = async () => {
    const code = getLicenseCode();
    if (!code) return;
    const newVal = !enabled;
    setEnabled(newVal); // optimistic
    try {
      const res = await fetch(TOGGLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, enabled: newVal }),
      });
      const data = await res.json();
      if (!data.ok) { setEnabled(!newVal); setMsg({ text: '❌ تغییر وضعیت ناموفق بود.', ok: false }); }
    } catch (e) {
      setEnabled(!newVal);
      setMsg({ text: '❌ خطا در ارتباط با سرور.', ok: false });
    }
  };

  const handleClear = async () => {
    if (!window.confirm('مطمئنی؟ با این کار لینک فعلی برای همیشه غیرفعال می‌شه و باید اپ گوشیت رو دوباره تنظیم کنی.')) return;
    const code = getLicenseCode();
    if (!code) return;
    setIsSaving(true);
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
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      title="تایید خودکار پرداخت (پیامک بانکی)"
      action={<MessageSquareText size={20} className="text-cyan-400" />}
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-500 leading-relaxed">
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
            <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
              <div>
                <div className="text-sm font-bold text-slate-800">وضعیت</div>
                <div className="text-xs text-slate-500 mt-1">
                  {enabled ? 'فعال — پیامک‌ها بررسی می‌شن' : 'غیرفعال — پیامکی بررسی نمی‌شه'}
                </div>
              </div>
              <button onClick={handleToggleEnabled} className="text-cyan-400">
                {enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-slate-500" />}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">آدرس webhook (این رو توی اپ فورواردر پیامک وارد کن)</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={webhookUrl || ''}
                  className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-600 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
                >
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs text-slate-600 leading-relaxed space-y-2">
              <p className="font-bold text-slate-800">راهنمای نصب:</p>
              <p>۱. روی گوشی‌ای که پیامک بانکی روش میاد، یه اپ SMS Forwarder نصب کن (اندروید: «SMS Forwarder»، آیفون: هرکدوم از اپ‌های SMS Forwarder موجود در App Store که از Custom API/Webhook پشتیبانی می‌کنن).</p>
              <p>۲. توی تنظیمات اپ، مقصد رو روی «Custom API / Webhook» بذار و آدرس بالا رو وارد کن (روش POST، بدنه JSON).</p>
              <p>۳. فیلد متن پیامک رو با نام <code className="bg-black/30 px-1.5 py-0.5 rounded">text</code> بفرست (اکثر اپ‌ها این فیلدها رو خودشون قابل‌تنظیم می‌ذارن).</p>
              <p>۴. یه پیامک تست بفرست و بعد از چند ثانیه، «تاریخچه» پایین همین کارت رو چک کن ببین دریافت شده یا نه.</p>
              <p className="text-amber-400 pt-1">⚠️ مبلغ بالای {capToman.toLocaleString('fa-IR')} تومان همیشه دستی تایید می‌شه. سفارش‌های در انتظار هم فقط تا {windowMinutes} دقیقه بعد از ثبت، برای تایید خودکار معتبرن.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleLogs}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ListChecks size={16} />
                <span>{showLogs ? 'بستن تاریخچه' : 'مشاهده تاریخچه‌ی اخیر'}</span>
              </button>
              <button
                onClick={handleClear}
                disabled={isSaving}
                className="py-2.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>غیرفعال کامل</span>
              </button>
            </div>

            {showLogs && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {loadingLogs ? (
                  <div className="flex justify-center py-6 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">هنوز پیامکی دریافت نشده.</p>
                ) : (
                  logs.map((log) => {
                    const label = STATUS_LABELS[log.status] || { text: log.status, color: 'text-slate-400' };
                    return (
                      <div key={log.id} className="p-3 bg-black/20 border border-white/5 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${label.color}`}>{label.text}</span>
                          <span className="text-slate-500">{new Date(log.created_at).toLocaleString('fa-IR')}</span>
                        </div>
                        {log.extracted_amount ? (
                          <div className="text-slate-600">مبلغ تشخیص‌داده‌شده: {log.extracted_amount.toLocaleString('fa-IR')} تومان{log.matched_order_id ? ` — سفارش ${log.matched_order_id}` : ''}</div>
                        ) : null}
                        <div className="text-slate-500 mt-1 truncate" title={log.raw_text}>{log.raw_text}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {msg && (
          <div className={`text-xs font-bold text-center ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
