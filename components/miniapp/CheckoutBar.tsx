import React from 'react';
import { Check } from 'lucide-react';

export interface CheckoutBarProps {
  totalItems: number;
  totalPrice: number;
  handleCheckout: () => void;
  /** Distance (px) from the bottom of the screen — sits just above BottomNavigation, which itself grows with the device's safe area in full-screen mode. */
  bottom: number;
}

export const CheckoutBar: React.FC<CheckoutBarProps> = ({
  totalItems,
  totalPrice,
  handleCheckout,
  bottom
}) => {
  if (totalItems <= 0) return null;

  return (
    <div
      className="fixed left-3 right-3 z-30 bg-white rounded-3xl border border-slate-100 p-3 shadow-[0_4px_24px_rgba(15,23,42,0.12)] animate-slide-up"
      style={{ bottom: `${bottom}px` }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-400">جمع سفارش ({totalItems} اقلام):</div>
          <div className="text-base font-black text-emerald-600">
            {totalPrice.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">تومان</span>
          </div>
        </div>

        <button
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
            handleCheckout();
          }}
          className="py-2.5 px-4 bg-gradient-to-l from-emerald-600 via-teal-600 to-green-600 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
        >
          <Check size={16} />
          <span>تکمیل و ادامه در ربات</span>
        </button>
      </div>
    </div>
  );
};
