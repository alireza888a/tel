import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { FormDesignerModal } from '../keyboard-builder/FormDesignerModal';
import { FormConfig, FormQuestion } from '../../types';
import { ListChecks, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { syncNow } from '../../services/cloudSync';

export const FormsManagerCard: React.FC = () => {
  const [forms, setForms] = useState<Record<string, FormConfig>>(() => {
    try {
      return JSON.parse(localStorage.getItem('kb_forms') || '{}');
    } catch {
      return {};
    }
  });
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormName, setNewFormName] = useState('');

  useEffect(() => {
    localStorage.setItem('kb_forms', JSON.stringify(forms));
    syncNow();
  }, [forms]);

  const updateForm = (formId: string, updates: Partial<FormConfig>) => {
    setForms((prev) => ({ ...prev, [formId]: { ...prev[formId], ...updates } }));
  };

  const addQuestion = (formId: string) => {
    const form = forms[formId];
    if (!form) return;
    const newQuestion: FormQuestion = { id: `q${Date.now()}`, text: 'سوال جدید...', type: 'text' };
    updateForm(formId, { questions: [...form.questions, newQuestion] });
  };

  const removeQuestion = (formId: string, qId: string) => {
    const form = forms[formId];
    if (!form) return;
    updateForm(formId, { questions: form.questions.filter((q) => q.id !== qId) });
  };

  const updateQuestion = (formId: string, qId: string, updates: Partial<FormQuestion>) => {
    const form = forms[formId];
    if (!form) return;
    const newQuestions = form.questions.map((q) => (q.id === qId ? { ...q, ...updates } : q));
    updateForm(formId, { questions: newQuestions });
  };

  const handleCreate = () => {
    const name = newFormName.trim();
    if (!name) return;
    const id = `form_${Date.now()}`;
    setForms((prev) => ({
      ...prev,
      [id]: { id, title: name, adminId: '', questions: [] },
    }));
    setNewFormName('');
    setIsCreating(false);
    setEditingFormId(id);
  };

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setForms((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setConfirmingDeleteId(null);
  };

  const formList: FormConfig[] = Object.values(forms);

  return (
    <GlassCard title="مدیریت فرم‌ها" action={<ListChecks size={20} className="text-emerald-500" />}>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        فرم‌هایی که اینجا می‌سازی رو می‌تونی از «فرم بعد از تایید» توی هر محصول، یا از تنظیمات سراسری، یا حتی روی یک دکمه در دکمه‌ساز استفاده کنی.
      </p>

      <div className="space-y-2 mb-4">
        {formList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">هنوز هیچ فرمی نساختی.</p>
        ) : (
          formList.map((form) => (
            <div key={form.id} className="p-3 bg-black/[0.03] border border-black/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-brand-navy">{form.title || form.id}</div>
                  <div className="text-[11px] text-brand-navy/40 font-mono">{form.id} — {form.questions.length} سوال</div>
                </div>
                {confirmingDeleteId !== form.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFormId(form.id)}
                      className="p-2 rounded-lg bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal transition-colors"
                      title="ویرایش سوالات"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(form.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                      title="حذف فرم"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {confirmingDeleteId === form.id && (
                <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-500 mb-2 leading-relaxed">
                    فرم «{form.title || form.id}» حذف بشه؟ اگه این فرم توی «فرم بعد از تایید» یک محصول یا تنظیمات سراسری انتخاب شده، اونجا هم باید جداگانه عوضش کنی.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold"
                    >
                      بله، حذف کن
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="px-3 py-1.5 rounded-lg bg-black/5 text-brand-navy/60 text-xs font-bold"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isCreating ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
            placeholder="مثلاً: فرم آدرس و شماره تماس"
            className="flex-1 bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors"
          />
          <button onClick={handleCreate} className="p-2.5 rounded-xl bg-brand-teal text-brand-navy"><Check size={18} /></button>
          <button onClick={() => { setIsCreating(false); setNewFormName(''); }} className="p-2.5 rounded-xl bg-black/5 text-brand-navy/60"><X size={18} /></button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-2.5 rounded-xl bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          <span>فرم جدید</span>
        </button>
      )}

      <FormDesignerModal
        editingFormId={editingFormId}
        forms={forms}
        setEditingFormId={setEditingFormId}
        updateForm={updateForm}
        updateQuestion={updateQuestion}
        addQuestion={addQuestion}
        removeQuestion={removeQuestion}
      />
    </GlassCard>
  );
};
