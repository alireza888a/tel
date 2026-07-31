import React from 'react';
import { ListChecks, X, UserCog, Trash2, Plus, Check } from 'lucide-react';
import { FormConfig, FormQuestion } from '../../types';

interface FormDesignerModalProps {
  editingFormId: string | null;
  forms: Record<string, FormConfig>;
  setEditingFormId: (id: string | null) => void;
  updateForm: (formId: string, updates: Partial<FormConfig>) => void;
  updateQuestion: (formId: string, qId: string, updates: Partial<FormQuestion>) => void;
  addQuestion: (formId: string) => void;
  removeQuestion: (formId: string, qId: string) => void;
}

export const FormDesignerModal: React.FC<FormDesignerModalProps> = ({
  editingFormId,
  forms,
  setEditingFormId,
  updateForm,
  updateQuestion,
  addQuestion,
  removeQuestion,
}) => {
  if (!editingFormId || !forms[editingFormId]) return null;

  const currentForm = forms[editingFormId];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="dark:bg-[#1e293b] bg-white border dark:border-white/10 border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b dark:border-white/5 border-slate-100 flex justify-between items-center dark:bg-white/5 bg-slate-100 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold dark:text-white text-slate-800 flex items-center gap-2">
              <ListChecks size={24} className="dark:text-green-400 text-green-600" /> طراحی سوالات فرم
            </h3>
            <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">
              شناسه فرم: <span className="font-mono dark:text-white/50 text-slate-500">{editingFormId}</span>
            </p>
          </div>
          <button
            onClick={() => setEditingFormId(null)}
            className="p-2 dark:hover:bg-white/10 hover:bg-slate-200 rounded-full transition-colors dark:text-white/60 text-slate-500 dark:hover:text-white hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="dark:bg-slate-800/40 bg-slate-50 border dark:border-white/10 border-slate-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-sm dark:text-slate-300 text-slate-600 font-bold mb-1.5 block">
                عنوان فرم
              </label>
              <input
                type="text"
                value={currentForm.title || ''}
                onChange={(e) => updateForm(editingFormId, { title: e.target.value })}
                placeholder="مثلاً: فرم ثبت نام / نظرسنجی"
                className="w-full dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-lg p-2.5 dark:text-white text-slate-800 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 border-t dark:border-white/5 border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!currentForm.visibleInMiniApp}
                  onChange={(e) => updateForm(editingFormId, { visibleInMiniApp: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 bg-white dark:border-white/20 border-slate-300"
                />
                <span className="text-sm font-medium dark:text-white text-slate-800">نمایش در Mini App</span>
              </label>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1.5 leading-relaxed dark:bg-white/5 bg-slate-100 p-2.5 rounded-lg border dark:border-white/5 border-slate-100">
                فقط فرمهایی که همهی سوالاتشون از نوع متن، عدد، تاریخ، انتخاب از لیست یا چکباکس باشه، داخل Mini App قابلنمایشن؛ فرمهایی که سوال عکس/ویدیو/فایل/موقعیت مکانی دارن، حتی با این سوییچ فعال، فقط داخل خود چت جواب داده میشن.
              </p>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <label className="text-sm dark:text-blue-300 text-blue-600 font-bold mb-2 block flex items-center gap-2">
              <UserCog size={16} /> مقصد ارسال پاسخ‌ها (آیدی ادمین)
            </label>
            <input
              type="text"
              value={currentForm.adminId}
              onChange={(e) => updateForm(editingFormId, { adminId: e.target.value })}
              placeholder="مثلا: 123456789 یا @admin_username"
              className="w-full dark:bg-black/20 bg-slate-100 border border-blue-500/30 rounded-lg p-3 dark:text-white text-slate-800 text-left dir-ltr dark:placeholder-white/30 placeholder-slate-400 focus:outline-none focus:border-blue-400"
              dir="ltr"
            />
            <p className="text-[10px] text-blue-300/60 mt-2">* پاسخ‌های کاربران به صورت خودکار به این آیدی در تلگرام فوروارد می‌شود. (قابلیت پاسخگویی)</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm dark:text-slate-400 text-slate-500 font-bold">لیست سوالات</label>
              <span className="text-xs text-slate-500">{currentForm.questions?.length || 0} سوال</span>
            </div>

            {(currentForm.questions || []).map((q, idx) => (
              <div key={q.id} className="group flex flex-col md:flex-row items-start gap-3 dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-100 rounded-xl p-3 dark:hover:border-white/20 hover:border-slate-300 transition-all">
                <div className="w-6 h-6 rounded-full dark:bg-white/10 bg-slate-200 flex items-center justify-center text-xs font-bold dark:text-slate-400 text-slate-500 mt-2 shrink-0">
                  {idx + 1}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(editingFormId, q.id, { text: e.target.value })}
                    className="w-full bg-transparent border-b dark:border-white/10 border-slate-200 outline-none dark:text-white text-slate-800 text-sm resize-none h-10 py-1"
                    placeholder="متن سوال را اینجا بنویسید..."
                  />

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500">نوع پاسخ:</span>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        updateQuestion(editingFormId, q.id, {
                          type: newType,
                          options: (newType === 'select' || newType === 'checkbox') ? (q.options || []) : undefined
                        });
                      }}
                      className="dark:bg-black/20 bg-slate-100 text-xs dark:text-white text-slate-800 border dark:border-white/10 border-slate-200 rounded p-1 outline-none"
                    >
                      <option value="text">✏️ متن</option>
                      <option value="number">🔢 عدد</option>
                      <option value="photo">🖼 عکس</option>
                      <option value="document">📎 فایل</option>
                      <option value="video">📹 ویدیو</option>
                      <option value="audio">🎙️ صدا</option>
                      <option value="location">📍 موقعیت مکانی</option>
                      <option value="date">📅 تاریخ</option>
                      <option value="select">☑️ انتخاب از لیست (تک‌گزینه‌ای)</option>
                      <option value="checkbox">✅ انتخاب چندگزینه‌ای (چک‌باکس)</option>
                    </select>
                  </div>

                  {(q.type === 'select' || q.type === 'checkbox') && (
                    <div className="mt-3 p-3 dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl space-y-2">
                      <label className="text-xs dark:text-slate-300 text-slate-600 font-medium block">
                        گزینه‌های قابل انتخاب ({q.type === 'select' ? 'تک‌گزینه‌ای' : 'چندگزینه‌ای'}):
                      </label>
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 dark:bg-white/5 bg-slate-100 px-2.5 py-1.5 rounded-lg border dark:border-white/5 border-slate-100 text-xs dark:text-white text-slate-800">
                            <span className="flex-1 text-right">{opt}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                                updateQuestion(editingFormId, q.id, { options: newOpts });
                              }}
                              className="dark:text-red-400 text-red-600 hover:text-red-300 p-0.5 rounded dark:hover:bg-white/10 hover:bg-slate-200 transition-colors"
                              title="حذف گزینه"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {(q.options || []).length === 0 && (
                          <p className="text-[11px] text-slate-500 italic">هنوز گزینه‌ای تعریف نشده است.</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          id={`new-opt-${q.id}`}
                          placeholder="عنوان گزینه جدید..."
                          className="flex-1 dark:bg-black/30 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs dark:text-white text-slate-800 outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const val = input.value.trim();
                              if (val) {
                                const cur = q.options || [];
                                updateQuestion(editingFormId, q.id, { options: [...cur, val] });
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`new-opt-${q.id}`) as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const cur = q.options || [];
                              updateQuestion(editingFormId, q.id, { options: [...cur, input.value.trim()] });
                              input.value = '';
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-500 dark:text-white text-slate-800 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
                        >
                          افزودن
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeQuestion(editingFormId, q.id)}
                  className="p-2 dark:text-red-400 text-red-600 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all self-start md:self-center"
                  title="حذف سوال"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={() => addQuestion(editingFormId)}
              className="w-full py-3 border-2 border-dashed dark:border-white/10 border-slate-200 hover:border-white/30 rounded-xl dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Plus size={16} />
              افزودن سوال جدید
            </button>
          </div>
        </div>

        <div className="p-4 border-t dark:border-white/5 border-slate-100 dark:bg-white/5 bg-slate-100 rounded-b-2xl flex justify-end">
          <button
            onClick={() => setEditingFormId(null)}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 dark:text-white text-slate-800 rounded-xl shadow-lg shadow-green-600/20 transition-all font-bold flex items-center gap-2"
          >
            <Check size={18} />
            ذخیره و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
