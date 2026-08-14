import React from 'react';
import { GlassCard } from '../GlassCard';
import { MessageSquareCode } from 'lucide-react';

interface PostConfirmMenuCardProps {
  postConfirmMenuId: string;
  setPostConfirmMenuId: (val: string) => void;
  getKbMenus: () => Record<string, { id?: string; title?: string; content?: string }>;
  postOrderFormId: string;
  setPostOrderFormId: (val: string) => void;
  getKbForms: () => Record<string, { id?: string; title?: string }>;
}

export const PostConfirmMenuCard: React.FC<PostConfirmMenuCardProps> = ({
  postConfirmMenuId,
  setPostConfirmMenuId,
  getKbMenus,
  postOrderFormId,
  setPostOrderFormId,
  getKbForms,
}) => {
  return (
    <GlassCard className="border-t-4 border-t-blue-500">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareCode className="text-blue-600"/>
        <h3 className="font-bold text-lg text-brand-navy">پیام و فرم بعد از تایید سفارش (پیش‌فرض کلی)</h3>
      </div>

      <p className="text-xs text-brand-navy/60 mb-4 leading-relaxed bg-black/[0.03] border border-black/5 rounded-xl p-3">
        این تنظیم روی <b>همه‌ی محصولات</b> اجرا می‌شه، مگر اینکه خودِ یک محصول (توی صفحه‌ی محصولات) منو یا فرمِ مخصوص خودش رو داشته باشه — که در اون صورت، تنظیم همون محصول برنده‌ست.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-brand-navy/60 mb-1.5">انتخاب منوی ارسال خودکار</label>
          <select
            value={postConfirmMenuId}
            onChange={(e) => setPostConfirmMenuId(e.target.value)}
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">هیچکدام</option>
            {Object.entries(getKbMenus()).map(([id, menu]) => (
              <option key={id} value={id}>
                {(menu as { title?: string; content?: string })?.title || (menu as { title?: string; content?: string })?.content || id} ({id})
              </option>
            ))}
          </select>
          <p className="text-xs text-brand-navy/50 mt-2 leading-relaxed">
            وقتی سفارشی رو تایید می‌کنی، علاوه بر پیام تایید، این منو (با هر متن، عکس، دکمه یا لینکی که توش گذاشتی) هم مستقیم برای خریدار ارسال می‌شه.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-brand-navy/60 mb-1.5">انتخاب فرم دریافت اطلاعات</label>
          <select
            value={postOrderFormId}
            onChange={(e) => setPostOrderFormId(e.target.value)}
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 text-brand-navy outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">هیچکدام</option>
            {Object.entries(getKbForms()).map(([id, form]) => (
              <option key={id} value={id}>
                {(form as { title?: string })?.title || id} ({id})
              </option>
            ))}
          </select>
          <p className="text-xs text-brand-navy/50 mt-2 leading-relaxed">
            وقتی سفارشی رو تایید می‌کنی، این فرم (مثلاً برای گرفتن آدرس و شماره تماس) خودکار برای خریدار شروع می‌شه. فرم‌های جدید رو از صفحه‌ی «محصولات» بساز.
          </p>
        </div>
      </div>
    </GlassCard>
  );
};
