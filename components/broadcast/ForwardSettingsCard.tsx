import React from 'react';
import { GlassCard } from '../GlassCard';
import { Eye } from 'lucide-react';

interface ForwardSettingsCardProps {
  forwardLink: string;
  setForwardLink: (val: string) => void;
}

export const ForwardSettingsCard: React.FC<ForwardSettingsCardProps> = ({
  forwardLink,
  setForwardLink,
}) => {
  return (
    <GlassCard title="تنظیمات فوروارد پست" className="border-t-4 border-t-blue-500">
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
          <Eye className="dark:text-blue-400 text-blue-600 shrink-0 mt-1"/>
          <div className="text-sm text-blue-200/80">
            <p className="font-bold mb-1">افزایش ویو (View) کانال</p>
            <p>با استفاده از این روش، پیام دقیقاً از کانال شما به کاربران فوروارد می‌شود و سین (View) پست اصلی افزایش می‌یابد.</p>
          </div>
        </div>
        <div>
          <label className="text-sm dark:text-slate-400 text-slate-500 mb-2 block">لینک پست کانال</label>
          <input
            value={forwardLink}
            onChange={e => setForwardLink(e.target.value)}
            placeholder="https://t.me/channelname/123"
            className="w-full dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl p-3 dark:text-white text-slate-800 dir-ltr text-left font-mono outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </GlassCard>
  );
};
