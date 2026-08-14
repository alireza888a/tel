import React from'react';
import { GlassCard } from'../GlassCard';
import { CreditCard } from'lucide-react';

interface PaymentSettingsCardProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  cardOwner: string;
  setCardOwner: (val: string) => void;
  maxPerOrder: string;
  setMaxPerOrder: (val: string) => void;
}

export const PaymentSettingsCard: React.FC<PaymentSettingsCardProps> = ({
  cardNumber,
  setCardNumber,
  cardOwner,
  setCardOwner,
  maxPerOrder,
  setMaxPerOrder,
}) => {
  return (
    <GlassCard className="border-t-4 border-t-amber-500">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="text-amber-600"/>
        <h3 className="font-bold text-lg text-brand-navy">اطلاعات پرداخت کارت‌به‌کارت (فروشگاه)</h3>
      </div>

      <div className="text-sm text-brand-navy/60 mb-6 leading-relaxed bg-black/[0.03] p-3 rounded-lg border border-black/5">
        <p>شماره کارت و نام صاحب حساب بانکی خود را جهت نمایش به کاربران ربات تلگرام در مرحله ثبت سفارش و تسویه حساب دستی وارد نمایید.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-brand-navy/50 mb-1.5">شماره ۱۶ رقمی کارت بانکی</label>
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="مثال: ۶۰۳۷۹۹۱۸۱۲۳۴۵۶۷۸"
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy dir-ltr text-left font-mono outline-none focus:border-amber-500 transition-colors"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-xs text-brand-navy/50 mb-1.5">نام و نام خانوادگی صاحب حساب</label>
          <input
            value={cardOwner}
            onChange={(e) => setCardOwner(e.target.value)}
            placeholder="مثال: علی جلالی"
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Shop-wide per-order quantity cap. Deliberately lives next to the
            payment settings (rather than a tab of its own) because it's a
            selling-rule, and merchants look for it while setting up how
            orders work. A product can override it individually from the
            products page. */}
        <div className="pt-4 border-t border-black/5">
          <label className="block text-sm font-bold text-brand-navy mb-1">حداکثر تعداد هر محصول در یک سفارش</label>
          <p className="text-[11px] text-brand-navy/50 mb-2 leading-relaxed">
            خالی بذارید تا هیچ محدودیتی نباشه (حالت پیش‌فرض). این عدد روی همه‌ی محصولات اعمال می‌شه، مگر محصولی که خودش عدد اختصاصی داشته باشه (از صفحه‌ی محصولات).
          </p>
          <input
            value={maxPerOrder}
            onChange={(e) => setMaxPerOrder(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="بدون محدودیت"
            inputMode="numeric"
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy outline-none focus:border-amber-500 transition-colors text-right"
            dir="ltr"
          />
        </div>
      </div>
    </GlassCard>
  );
};
