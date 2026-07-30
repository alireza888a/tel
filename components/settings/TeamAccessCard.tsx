import React, { useState } from 'react';
import { GlassCard } from '../GlassCard';
import { Users, Plus, Trash2, ShieldCheck } from 'lucide-react';

interface TeamAccessCardProps {
  admins: { chatId: string; name: string; role: 'staff' }[];
  onAddAdmin: (chatId: string, name: string) => void;
  onRemoveAdmin: (chatId: string) => void;
}

export const TeamAccessCard: React.FC<TeamAccessCardProps> = ({
  admins,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [newChatId, setNewChatId] = useState('');
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatId.trim()) return;
    onAddAdmin(newChatId.trim(), newName.trim());
    setNewChatId('');
    setNewName('');
  };

  return (
    <GlassCard className="border-t-4 border-t-cyan-500">
      <div className="flex items-center gap-2 mb-3">
        <Users className="text-cyan-400" size={22} />
        <h3 className="font-bold text-lg dark:text-white text-slate-800">
          مدیریت دسترسی تیم (کارمندها)
        </h3>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        کارمندهایی که اینجا اضافه میکنید میتونن سفارش و نوبت رو تایید/رد کنن و آمار رو ببینن، ولی نمیتونن فروشگاه رو خاموش کنن یا بکاپ بگیرن — این کارها فقط برای «آیدی عددی ادمین» بالا (مدیر اصلی) مجازه.
      </p>

      {/* Form to add staff */}
      <form onSubmit={handleSubmit} className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              آیدی عددی تلگرام کارمند <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newChatId}
              onChange={(e) => setNewChatId(e.target.value)}
              placeholder="مثال: 123456789"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono dir-ltr text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              نام (اختیاری، فقط برای شناسایی خودتون)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: محمد (پشتیبانی)"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 text-right"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>افزودن کارمند</span>
        </button>
      </form>

      {/* Staff list */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
          <ShieldCheck size={14} className="text-cyan-400" />
          لیست کارمندان دارای دسترسی ({admins.length})
        </h4>

        {admins.length === 0 ? (
          <div className="text-center py-4 bg-black/10 rounded-xl border border-white/5">
            <p className="text-xs text-slate-500">هنوز هیچ کارمندی اضافه نشده است.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            {admins.map((admin) => (
              <div
                key={admin.chatId}
                className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                    {admin.name || admin.chatId}
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold text-[11px] bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20" dir="ltr">
                    {admin.chatId}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 hidden sm:inline">
                    کارمند
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveAdmin(admin.chatId)}
                  className="text-slate-400 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="حذف دسترسی"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
