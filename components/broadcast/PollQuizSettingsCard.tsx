import React from 'react';
import { GlassCard } from '../GlassCard';
import { Plus, Trash2 } from 'lucide-react';

interface PollQuizSettingsCardProps {
  pollQuestion: string;
  setPollQuestion: (val: string) => void;
  pollType: 'regular' | 'quiz';
  setPollType: (val: 'regular' | 'quiz') => void;
  isAnonymous: boolean;
  setIsAnonymous: (val: boolean) => void;
  allowMultipleAnswers: boolean;
  setAllowMultipleAnswers: (val: boolean) => void;
  pollOptions: string[];
  handleAddPollOption: () => void;
  handleUpdatePollOption: (index: number, value: string) => void;
  handleRemovePollOption: (index: number) => void;
  quizCorrectOptionIndex: number;
  setQuizCorrectOptionIndex: (val: number) => void;
  quizExplanation: string;
  setQuizExplanation: (val: string) => void;
  setPreviewVotedOption: (val: number | null) => void;
}

export const PollQuizSettingsCard: React.FC<PollQuizSettingsCardProps> = ({
  pollQuestion,
  setPollQuestion,
  pollType,
  setPollType,
  isAnonymous,
  setIsAnonymous,
  allowMultipleAnswers,
  setAllowMultipleAnswers,
  pollOptions,
  handleAddPollOption,
  handleUpdatePollOption,
  handleRemovePollOption,
  quizCorrectOptionIndex,
  setQuizCorrectOptionIndex,
  quizExplanation,
  setQuizExplanation,
  setPreviewVotedOption,
}) => {
  return (
    <GlassCard title="تنظیمات نظرسنجی و آزمون‌ساز" className="border-t-4 border-t-emerald-500">
      <div className="space-y-6">
        <div>
          <label className="text-sm dark:text-slate-400 text-slate-500 mb-2 block">پرسش یا سوال شما</label>
          <input
            value={pollQuestion}
            onChange={e => setPollQuestion(e.target.value)}
            placeholder="سوال خود را مطرح کنید (مثال: برنده بازی امشب کیست؟)"
            className="w-full dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl p-3 dark:text-white text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm dark:text-slate-400 text-slate-500 mb-2 block">نوع نظرسنجی</label>
            <select
              value={pollType}
              onChange={e => {
                setPollType(e.target.value as any);
                setPreviewVotedOption(null);
              }}
              className="w-full dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl p-3 dark:text-white text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="regular">نظرسنجی معمولی</option>
              <option value="quiz">آزمون تستی (مسابقه)</option>
            </select>
          </div>
          <div>
            <label className="text-sm dark:text-slate-400 text-slate-500 mb-2 block">حالت رای‌دهی</label>
            <select
              value={isAnonymous ? 'anon' : 'public'}
              onChange={e => setIsAnonymous(e.target.value === 'anon')}
              className="w-full dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl p-3 dark:text-white text-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="anon">رای‌گیری ناشناس</option>
              <option value="public">رای‌گیری شفاف (مشخص)</option>
            </select>
          </div>
        </div>

        {pollType === 'regular' && (
          <label className="flex items-center gap-3 dark:bg-white/5 bg-slate-100 p-3 rounded-xl border dark:border-white/5 border-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={allowMultipleAnswers}
              onChange={e => setAllowMultipleAnswers(e.target.checked)}
              className="rounded dark:bg-black/20 bg-slate-100 dark:border-white/10 border-slate-200 text-emerald-600 focus:ring-0"
            />
            <span className="text-xs dark:text-slate-300 text-slate-600">امکان انتخاب چند گزینه همزمان</span>
          </label>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm dark:text-slate-400 text-slate-500 font-bold">گزینه‌های پاسخ (حداقل ۲ و حداکثر ۱۰ گزینه)</label>
            {pollOptions.length < 10 && (
              <button
                onClick={handleAddPollOption}
                className="text-xs dark:text-emerald-400 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 transition-colors"
              >
                <Plus size={12}/> افزودن گزینه
              </button>
            )}
          </div>

          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-slate-500 w-4">{idx + 1}.</span>
                <input
                  value={opt}
                  onChange={e => handleUpdatePollOption(idx, e.target.value)}
                  placeholder={`پاسخ ${idx + 1}`}
                  className="flex-1 dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-lg p-2.5 text-xs dark:text-white text-slate-800 outline-none focus:border-emerald-500"
                />
                {pollType === 'quiz' && (
                  <button
                    onClick={() => setQuizCorrectOptionIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                      quizCorrectOptionIndex === idx
                        ? 'bg-green-600 border-green-500 dark:text-white text-slate-800'
                        : 'dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900'
                    }`}
                  >
                    {quizCorrectOptionIndex === idx ? 'پاسخ صحیح' : 'علامت صحیح'}
                  </button>
                )}
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => handleRemovePollOption(idx)}
                    className="p-2 dark:text-red-400 text-red-600 hover:bg-red-500/10 rounded-lg shrink-0"
                  >
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {pollType === 'quiz' && (
          <div className="space-y-2 pt-2 border-t dark:border-white/5 border-slate-100">
            <label className="text-xs dark:text-slate-400 text-slate-500">توضیح یا راهنمایی پاسخ (اختیاری)</label>
            <textarea
              value={quizExplanation}
              onChange={e => setQuizExplanation(e.target.value)}
              placeholder="توضیح دهید چرا این گزینه صحیح است. پس از کلیک روی گزینه اشتباه توسط کاربر، نمایش داده می‌شود."
              className="w-full h-20 dark:bg-black/20 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl p-3 text-xs dark:text-white text-slate-800 resize-none outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
};
