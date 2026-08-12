import React from 'react';
import { GlassCard } from '../GlassCard';
import { Cloud, Image as ImageIcon, Video, Music, AlertTriangle, Trash2 } from 'lucide-react';
import { MenuPage } from '../../types';

interface MenuContentEditorCardProps {
  currentMenu: MenuPage;
  currentMenuId: string;
  updateMenu: (menuId: string, updates: Partial<MenuPage>) => void;
  insertVariable: (variable: string) => void;
  isUploading: boolean;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => void;
  removeMedia: (id: string) => void;
  DYNAMIC_VARS: Array<{ label: string; code: string }>;
}

export const MenuContentEditorCard: React.FC<MenuContentEditorCardProps> = ({
  currentMenu,
  currentMenuId,
  updateMenu,
  insertVariable,
  isUploading,
  handleMediaUpload,
  removeMedia,
  DYNAMIC_VARS,
}) => {
  return (
    <GlassCard title={`ویرایش محتوای: ${currentMenu?.title || 'منو'}`}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-brand-navy/50 mb-2 block">عنوان داخلی (برای مدیریت)</label>
          <input
            type="text"
            value={currentMenu?.title || ''}
            onChange={(e) => updateMenu(currentMenuId, { title: e.target.value })}
            className="w-full bg-black/[0.03] border border-black/10 rounded-lg p-2 text-sm outline-none focus:border-brand-teal text-brand-navy"
          />
        </div>

        <div>
          <label className="text-sm text-brand-navy/50 mb-2 block">متن پیام (Caption)</label>
          <textarea
            id="message-content"
            value={currentMenu?.content || ''}
            onChange={(e) => updateMenu(currentMenuId, { content: e.target.value })}
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl p-3 min-h-[100px] focus:outline-none focus:border-brand-teal text-brand-navy resize-none font-vazir mb-2"
            placeholder="متنی که ربات در این منو نمایش می‌دهد..."
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {DYNAMIC_VARS.map(v => (
              <button
                key={v.code}
                onClick={() => insertVariable(v.code)}
                className="text-xs px-2.5 py-1 bg-brand-light/25 text-brand-navy border border-brand-teal/30 rounded-full hover:bg-brand-light/40 transition-colors font-medium"
                title={`درج ${v.label}`}
              >
                {v.label} <span className="text-brand-navy/50 ml-1">{v.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-brand-navy/50 block">پیوست فایل</label>
            {isUploading && (
              <span className="text-xs text-brand-teal flex items-center gap-1 animate-pulse">
                <Cloud size={12} /> در حال آپلود به فضای ابری...
              </span>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-black/15 rounded-xl hover:bg-black/[0.03] transition-colors text-brand-navy/50">
              <ImageIcon size={20} className="mb-1" />
              <span className="text-xs">عکس</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
            </label>
            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-black/15 rounded-xl hover:bg-black/[0.03] transition-colors text-brand-navy/50">
              <Video size={20} className="mb-1" />
              <span className="text-xs">ویدیو</span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'video')} />
            </label>
            <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-black/15 rounded-xl hover:bg-black/[0.03] transition-colors text-brand-navy/50">
              <Music size={20} className="mb-1" />
              <span className="text-xs">صدا</span>
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'audio')} />
            </label>
          </div>

          {Array.isArray(currentMenu?.media) && currentMenu.media.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentMenu.media.map(media => (
                <div key={media.id} className={`relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border ${media.fileId ? 'border-green-500/50' : 'border-red-500/50 ring-2 ring-red-500/20'} group`}>
                  {media.type === 'image' && <img src={media.previewUrl || media.url} className="w-full h-full object-cover" alt="preview" />}
                  {media.type === 'video' && <video src={media.previewUrl || media.url} className="w-full h-full object-cover" />}
                  {media.type === 'audio' && <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Music size={20} /></div>}

                  {/* Cloud Icon if uploaded to DB */}
                  {media.fileId ? (
                    <div className="absolute top-1 right-1 bg-green-500 text-white p-0.5 rounded-full z-10" title="ذخیره شده در کانال دیتابیس">
                      <Cloud size={10} />
                    </div>
                  ) : (
                    <div className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full z-10 animate-pulse" title="خطا: آپلود نشده! در تلگرام نمایش داده نمی‌شود.">
                      <AlertTriangle size={10} />
                    </div>
                  )}

                  {/* Fail Message Overlay */}
                  {!media.fileId && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[8px] bg-red-600 text-white px-1 rounded shadow">آپلود نشد</span>
                    </div>
                  )}

                  <button
                    onClick={() => removeMedia(media.id)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white z-20"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
