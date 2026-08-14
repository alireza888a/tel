import React from'react';
import { GlassCard } from'./components/GlassCard';
import { MessageSquare, RotateCcw } from'lucide-react';

export interface CustomTexts {
  booking_submitted?: string;
  booking_confirmed?: string;
  booking_rejected?: string;
  booking_reminder?: string;
  order_confirmed?: string;
  order_rejected?: string;
  receipt_received?: string;
  ticket_received?: string;
}

interface FieldDef {
  key: keyof CustomTexts;
  label: string;
  vars: string[];
  defaultValue: string;
}

const FIELDS: FieldDef[] = [
  {
    key:'booking_submitted',
    label:'ثبت اولیه‌ی نوبت (قبل از تایید ادمین)',
    vars: ['service','provider','date','time'],
    defaultValue:'✅ درخواست نوبت شما ثبت شد.\n🔖 {service}{provider}\n📅 {date} ساعت {time}\n\nمنتظر تایید ادمین باشید.',
  },
  {
    key:'booking_confirmed',
    label:'تایید نوبت',
    vars: ['date','time','service'],
    defaultValue:'✅ نوبت شما تایید شد!\n📅 {date} ساعت {time}{service}',
  },
  {
    key:'booking_rejected',
    label:'رد نوبت',
    vars: [],
    defaultValue:'❌ متاسفانه نوبت شما تایید نشد. لطفاً برای هماهنگی مجدد با پشتیبانی تماس بگیرید.',
  },
  {
    key:'booking_reminder',
    label:'یادآوری خودکار نوبت (همون روز)',
    vars: ['service','time'],
    defaultValue:'⏰ یادآوری: نوبت شما ({service}) ساعت {time} امروز است.',
  },
  {
    key:'order_confirmed',
    label:'تایید سفارش / پرداخت',
    // NOTE: {total} is formatted in Rial now (matches the cart/checkout
    // messages the buyer already saw) — was still Toman on the backend
    // until this pass, which would have shown a mismatched number if this
    // text got customized to include it.
    vars: ['order_id','total'],
    defaultValue:'پرداخت شما تایید شد ✅ سفارشتون در حال آماده‌سازیه.',
  },
  {
    key:'order_rejected',
    label:'رد سفارش / پرداخت',
    vars: ['order_id'],
    defaultValue:'متاسفانه پرداخت شما تایید نشد. لطفاً با پشتیبانی تماس بگیرید.',
  },
  {
    key:'receipt_received',
    label:'دریافت فیش پرداخت (قبل از تایید ادمین)',
    vars: ['order_id','total'],
    defaultValue:'رسید شما دریافت شد و سفارش ثبت گردید ⏳ پس از تایید توسط ادمین به شما اطلاع‌رسانی می‌شود.',
  },
  {
    key:'ticket_received',
    label:'ثبت تیکت پشتیبانی',
    vars: ['ticket_id'],
    defaultValue:'✅ پیام شما ثبت شد (تیکت #{ticket_id}). به‌زودی پاسخ داده می‌شود.',
  },
];

interface AutoMessagesCardProps {
  customTexts: CustomTexts;
  setCustomTexts: (val: CustomTexts) => void;
}

export const AutoMessagesCard: React.FC<AutoMessagesCardProps> = ({ customTexts, setCustomTexts }) => {
  const updateField = (key: keyof CustomTexts, value: string) => {
    setCustomTexts({ ...customTexts, [key]: value });
  };

  const resetField = (key: keyof CustomTexts) => {
    const next = { ...customTexts };
    delete next[key];
    setCustomTexts(next);
  };

  return (
    <GlassCard className="border-t-4 border-t-teal-500">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="text-teal-600"/>
        <h3 className="font-bold text-lg text-brand-navy">پیام‌های خودکار</h3>
      </div>

      {/* FIX: same leftover-dark-theme pattern as DatabaseChannelCard —
          white text on a near-white background made the actual message
          textareas (the whole point of this card) hard to read. */}
      <div className="text-sm text-brand-navy/60 mb-6 leading-relaxed bg-black/[0.03] p-3 rounded-lg border border-black/5">
        <p>متن پیام‌هایی که ربات خودکار برای خریدارها می‌فرسته رو شخصی‌سازی کنید. هرکدوم رو خالی بذارید، همون متن پیش‌فرض استفاده می‌شه.</p>
      </div>

      <div className="space-y-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-xs text-brand-navy/50">{field.label}</label>
                {customTexts[field.key] ? (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5">✏️ متن سفارشی فعاله</span>
                ) : (
                  <span className="text-[10px] text-brand-navy/40 bg-black/[0.03] border border-black/10 rounded-full px-2 py-0.5">پیش‌فرض (چیزی ننوشتی)</span>
                )}
              </div>
              {customTexts[field.key] && (
                <button
                  type="button"
                  onClick={() => resetField(field.key)}
                  className="flex items-center gap-1 text-[11px] text-brand-navy/50 hover:text-teal-600 transition-colors"
                >
                  <RotateCcw size={11} /> بازگشت به پیش‌فرض
                </button>
              )}
            </div>
            <textarea
              value={customTexts[field.key] ??''}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={'پیش‌فرض (فقط نمونه، ذخیره نشده):'+ field.defaultValue}
              rows={3}
              dir="rtl"
              className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy text-sm outline-none focus:border-teal-500 transition-colors resize-y placeholder:text-brand-navy/30 placeholder:italic"
            />
            {field.vars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {field.vars.map((v) => (
                  <span
                    key={v}
                    className="text-[10px] font-mono bg-teal-500/10 text-teal-700 border border-teal-500/20 rounded-full px-2 py-0.5"
                  >
                    {'{'+ v +'}'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
