import React from'react';
import { GlassCard } from'../GlassCard';
import { Sparkles, Paperclip, Cloud, Trash2 } from'lucide-react';
import { MediaAttachment } from'../../types';

interface MessageContentCardProps {
  messageA: string;
  setMessageA: (val: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  insertVariable: (variable: string) => void;
  handleMediaFiles: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
  mediaGroup: MediaAttachment[];
  removeMedia: (index: number) => void;
}

export const MessageContentCard: React.FC<MessageContentCardProps> = ({
  messageA,
  setMessageA,
  textAreaRef,
  insertVariable,
  handleMediaFiles,
  isUploading,
  mediaGroup,
  removeMedia,
}) => {
  return (
    <GlassCard title="محتوای پیام"className="relative">
      <div className="flex flex-wrap gap-2 mb-3 bg-slate-100 p-2 rounded-lg border border-slate-100">
        <span className="text-xs text-slate-500 flex items-center gap-1 ml-2"><Sparkles size={12}/> متغیرها:</span>
        {['{first_name}','{username}','{id}'].map(v => (
          <button key={v} onClick={() => insertVariable(v)} className="px-2 py-1 bg-slate-100 hover:bg-purple-500/10 hover:text-purple-700 border border-slate-200 rounded text-[10px] text-slate-600 transition-colors">{v}</button>
        ))}
      </div>

      <textarea
        ref={textAreaRef}
        value={messageA}
        onChange={e => setMessageA(e.target.value)}
        placeholder="متن پیام خود را بنویسید..."
        className="w-full h-40 bg-slate-100 border border-purple-500/30 rounded-xl p-4 text-slate-800 resize-none outline-none focus:border-purple-500 transition-colors font-vazir text-sm leading-relaxed"
      />

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors">
            <Paperclip size={18} className="text-slate-500"/>
            <span className="text-sm">افزودن مدیا (عکس/ویدیو)</span>
            <input type="file"className="hidden"multiple onChange={handleMediaFiles} accept="image/*,video/*,audio/*"/>
          </label>
          {isUploading && <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse"><Cloud size={12}/> در حال آپلود...</span>}
        </div>
        {mediaGroup.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mt-2 custom-scrollbar">
            {mediaGroup.map((media, idx) => (
              <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 group">
                <img src={media.previewUrl || media.url} className="w-full h-full object-cover"alt="Media preview"/>
                <button onClick={() => removeMedia(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-20"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
