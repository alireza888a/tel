import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { UserCog, Copy, Check, Lock, Trash2, Loader2 } from 'lucide-react';

const GET_URL = 'https://corepanel-api.tajikr450.workers.dev/api/admin-access/get';
const SET_URL = 'https://corepanel-api.tajikr450.workers.dev/api/admin-access/set';
const CLEAR_URL = 'https://corepanel-api.tajikr450.workers.dev/api/admin-access/clear';

const getLicenseCode = (): string | null => {
  try {
    const cached = JSON.parse(localStorage.getItem('license_cache') || '{}');
    return cached.code || null;
  } catch {
    return null;
  }
};

export const AssistantAccessCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

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
        setEligible(!!data.eligible);
        setConfigured(!!data.configured);
        setCurrentUsername(data.username || null);
        setSlug(data.slug || null);
        if (data.username) setUsername(data.username);
      }
    } catch (e) {
      console.warn('Failed to load assistant-access status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = getLicenseCode();
    if (!code || !username.trim() || password.length < 6) {
      setMsg({ text: 'نام‌کاربری و رمز عبور (حداقل ۶ کاراکتر) را وارد کنید.', ok: false });
      return;
    }
    setIsSaving(true);
    setMsg(null);
    try {
      const res = await fetch(SET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: '✅ دسترسی دستیار با موفقیت ذخیره شد.', ok: true });
        setPassword('');
        await fetchStatus();
      } else {
        setMsg({ text: '❌ ذخیره‌سازی ناموفق بود، دوباره تلاش کنید.', ok: false });
      }
    } catch (e) {
      setMsg({ text: '❌ اتصال به سرور برقرار نشد.', ok: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    const code = getLicenseCode();
    if (!code) return;
    setIsClearing(true);
    setMsg(null);
    try {
      const res = await fetch(CLEAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: '✅ دسترسی دستیار غیرفعال شد.', ok: true });
        setUsername('');
        setPassword('');
        await fetchStatus();
      }
    } catch (e) {
      setMsg({ text: '❌ اتصال به سرور برقرار نشد.', ok: false });
    } finally {
      setIsClearing(false);
    }
  };

  const assistantLink = slug ? `${window.location.origin}${window.location.pathname}?admin=${slug}` : '';

  const handleCopy = () => {
    if (!assistantLink) return;
    navigator.clipboard.writeText(assistantLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <GlassCard className="border-t-4 border-t-brand-teal">
        <div className="flex items-center justify-center py-8 text-brand-navy/40">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (!eligible) {
    return (
      <GlassCard className="border-t-4 border-t-brand-navy/20 relative">
        <div className="flex items-center gap-2 mb-3">
          <UserCog className="text-brand-navy/40" />
          <h3 className="font-bold text-lg text-brand-navy">دسترسی دستیار</h3>
        </div>
        <div className="rounded-2xl bg-black/[0.03] border border-black/5 p-6 text-center">
          <Lock size={28} className="text-brand-navy/30 mx-auto mb-3" />
          <p className="text-sm text-brand-navy/60 leading-relaxed mb-1">
            این قابلیت فقط برای لایسنس‌های چند‌دستگاهی (۲ دستگاه یا بیشتر) فعاله.
          </p>
          <p className="text-xs text-brand-navy/40">
            برای فعال‌سازی، لایسنستون رو به یه پلن با ظرفیت دستگاه بیشتر ارتقا بدید.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="border-t-4 border-t-brand-teal">
      <div className="flex items-center gap-2 mb-3">
        <UserCog className="text-brand-teal" />
        <h3 className="font-bold text-lg text-brand-navy">دسترسی دستیار</h3>
      </div>

      <div className="text-sm text-brand-navy/60 mb-6 leading-relaxed bg-black/[0.03] p-3 rounded-lg border border-black/5">
        <p>
          یه نام‌کاربری و رمز عبور برای دستیارتون بسازید. دستیار با این اطلاعات وارد پنل می‌شه، همون داده‌های فروشگاه رو می‌بینه،
          ولی هیچ‌وقت نمی‌تونه شماره کارت، توکن ربات، کانال بکاپ، یا لیست ادمین‌ها رو تغییر بده — این‌ها فقط دست خودتونه.
        </p>
      </div>

      {configured && slug && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-xs text-green-700 font-bold mb-2">✅ دسترسی دستیار فعاله (نام‌کاربری: {currentUsername})</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={assistantLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs text-brand-navy dir-ltr text-left font-mono outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-2 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-green-600 mt-2">این لینک رو برای دستیارتون بفرستید — با باز کردنش، فقط فرم ورود دستیار رو می‌بینه.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-brand-navy/50 mb-1.5">نام‌کاربری دستیار</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="مثال: assistant"
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-sm text-brand-navy outline-none focus:border-brand-teal transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-brand-navy/50 mb-1.5">
            {configured ? 'رمز عبور جدید (برای تغییر رمز)' : 'رمز عبور'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="حداقل ۶ کاراکتر"
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-sm text-brand-navy outline-none focus:border-brand-teal transition-colors"
          />
        </div>

        {msg && (
          <p className={`text-xs leading-relaxed ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-2.5 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            {configured ? 'به‌روزرسانی' : 'ساخت دسترسی دستیار'}
          </button>
          {configured && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isClearing}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Trash2 size={16} />
              غیرفعال کردن
            </button>
          )}
        </div>
      </form>
    </GlassCard>
  );
};
