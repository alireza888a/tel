import React from 'react';
import { GlassCard } from '../GlassCard';
import { Truck, Plus, Trash2 } from 'lucide-react';
import { formatNumberString, parseNumberString } from '../../utils/numberInput';

export interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  active: boolean;
}

interface ShippingMethodsCardProps {
  methods: ShippingMethod[];
  setMethods: (methods: ShippingMethod[]) => void;
}

export const ShippingMethodsCard: React.FC<ShippingMethodsCardProps> = ({ methods, setMethods }) => {
  const addMethod = () => {
    setMethods([...methods, { id: 'ship_' + Math.random().toString(36).substr(2, 9), name: '', cost: 0, active: true }]);
  };

  const updateMethod = (id: string, patch: Partial<ShippingMethod>) => {
    setMethods(methods.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const removeMethod = (id: string) => {
    setMethods(methods.filter(m => m.id !== id));
  };

  return (
    <GlassCard className="border-t-4 border-t-amber-500">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="text-amber-600" />
        <h3 className="font-bold text-lg text-brand-navy">روش‌های ارسال</h3>
      </div>

      <div className="text-sm text-brand-navy/60 mb-5 leading-relaxed bg-black/[0.03] p-3 rounded-lg border border-black/5">
        <p>
          اگه حداقل یه روش ارسال اینجا فعال باشه، خریدار قبل از تسویه‌حساب مجبوره یکی رو انتخاب کنه و هزینه‌اش به مبلغ سفارش اضافه می‌شه. اگه هیچ روشی تعریف نکنید (یا همه رو غیرفعال کنید)، این مرحله کلاً نشون داده نمی‌شه — دقیقاً مثل قبل از این قابلیت.
        </p>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-6 bg-black/[0.03] rounded-xl border border-dashed border-black/10 text-xs text-brand-navy/40 mb-4">
          هنوز روش ارسالی تعریف نکردید.
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {methods.map((m) => (
            <div key={m.id} className="p-3 bg-black/[0.03] rounded-xl border border-black/5 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMethod(m.id, { name: e.target.value })}
                  placeholder="مثال: پیک موتوری (تهران)"
                  className="flex-1 bg-white border border-black/10 text-brand-navy rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeMethod(m.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="حذف این روش"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-brand-navy/50 mb-1">هزینه (تومان — صفر یعنی رایگان)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberString(String(m.cost || 0))}
                    onChange={(e) => updateMethod(m.id, { cost: Number(parseNumberString(e.target.value)) || 0 })}
                    placeholder="0"
                    dir="ltr"
                    className="w-full bg-white border border-black/10 text-brand-navy rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 transition-colors text-right"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-brand-navy/70 cursor-pointer shrink-0 pt-4">
                  <input
                    type="checkbox"
                    checked={m.active !== false}
                    onChange={(e) => updateMethod(m.id, { active: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-600"
                  />
                  <span>فعال</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addMethod}
        className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus size={14} />
        <span>افزودن روش ارسال</span>
      </button>
    </GlassCard>
  );
};
