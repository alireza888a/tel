import React from 'react';
import { GlassCard } from '../GlassCard';
import { HardDrive, Download, Upload, FileJson, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';

interface BackupRestoreCardProps {
  handleBackup: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFactoryReset: () => void;
  autoBackupEnabled: boolean;
  onToggleAutoBackup: () => void;
  autoBackupFrequency: 'daily' | 'weekly';
  onChangeAutoBackupFrequency: (freq: 'daily' | 'weekly') => void;
}

export const BackupRestoreCard: React.FC<BackupRestoreCardProps> = ({
  handleBackup,
  handleFileSelect,
  handleFactoryReset,
  autoBackupEnabled,
  onToggleAutoBackup,
  autoBackupFrequency,
  onChangeAutoBackupFrequency,
}) => {
  return (
    <GlassCard className="border-t-4 border-t-blue-500">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="text-blue-400" />
        <h3 className="font-bold text-lg dark:text-white text-slate-800">مدیریت داده‌ها (پشتیبان‌گیری)</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={handleBackup}
          className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 text-green-400 rounded-lg group-hover:scale-110 transition-transform">
              <Download size={20} />
            </div>
            <div className="text-right">
              <div className="font-bold dark:text-white text-slate-800">دانلود فایل پشتیبان</div>
              <div className="text-[10px] text-slate-500">فرمت JSON شامل تمام تنظیمات</div>
            </div>
          </div>
          <FileJson size={20} className="text-slate-600" />
        </button>

        <label className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <div className="text-right">
              <div className="font-bold dark:text-white text-slate-800">بازگردانی اطلاعات</div>
              <div className="text-[10px] text-slate-500">آپلود فایل JSON و جایگزینی</div>
            </div>
          </div>
          <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          <FileJson size={20} className="text-slate-600" />
        </label>
      </div>

      {/* Auto Backup Section */}
      <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-400" />
            <h4 className="font-bold text-sm dark:text-white text-slate-800">بکاپ خودکار</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">فعال باشد</span>
            <button
              type="button"
              onClick={onToggleAutoBackup}
              className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                autoBackupEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          هر روز یا هفته، یه نسخه کامل از داده‌های ربات به‌صورت خودکار برای مدیرها (و کارمندهایی که تو تیم اضافه کردید) تو تلگرام فرستاده میشه.
        </p>

        {autoBackupEnabled && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Calendar size={14} className="text-blue-400" />
              بازه زمانی ارسال:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => onChangeAutoBackupFrequency('daily')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  autoBackupFrequency === 'daily'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                روزانه
              </button>
              <button
                type="button"
                onClick={() => onChangeAutoBackupFrequency('weekly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  autoBackupFrequency === 'weekly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                هفتگی
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-white/5">
        <button
          onClick={handleFactoryReset}
          className="w-full py-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <AlertTriangle size={16} />
          بازگشت به تنظیمات کارخانه (پاکسازی کامل)
        </button>
      </div>
    </GlassCard>
  );
};
