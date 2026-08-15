import React, { useState } from'react';
import { ChevronRight, ChevronLeft } from'lucide-react';
import { gregorianToJalali, jalaliToGregorian, jalaaliMonthLength, MONTH_NAMES, WEEK_DAYS } from'../../utils/jalaliCalendar';
import { getDayInfo } from'../../utils/persianHolidays';

interface PersianDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  /** Hide the hour/minute row. Scheduling a broadcast needs a time; looking
   *  up "what did I sell on this day" does not — showing a time picker
   *  there just invites the question of what it even means. */
  dateOnly?: boolean;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialDate,
  dateOnly = false,
}) => {
  const validDate = (initialDate && !isNaN(initialDate.getTime())) ? initialDate : new Date();

  const jDate = gregorianToJalali(validDate.getFullYear(), validDate.getMonth() + 1, validDate.getDate());
  const [viewYear, setViewYear] = useState(jDate.jy);
  const [viewMonth, setViewMonth] = useState(jDate.jm);
  const [selectedDay, setSelectedDay] = useState(jDate.jd);
  const [selectedHour, setSelectedHour] = useState(validDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(validDate.getMinutes());

  if (!isOpen) return null;

  const generateDays = () => {
    const gFirstDay = jalaliToGregorian(viewYear, viewMonth, 1);
    const dateObj = new Date(gFirstDay.gy, gFirstDay.gm - 1, gFirstDay.gd);
    let startDayOfWeek = dateObj.getDay() + 1;
    if (startDayOfWeek === 7) startDayOfWeek = 0;

    const daysInMonth = jalaaliMonthLength(viewYear, viewMonth);

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const selectedInfo = getDayInfo(viewYear, viewMonth, selectedDay);

  const handleConfirm = () => {
    const gDate = jalaliToGregorian(viewYear, viewMonth, selectedDay);
    const finalDate = dateOnly
      ? new Date(gDate.gy, gDate.gm - 1, gDate.gd)
      : new Date(gDate.gy, gDate.gm - 1, gDate.gd, selectedHour, selectedMinute);
    onSelect(finalDate);
    onClose();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else { setViewMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else { setViewMonth(m => m + 1); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-[350px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-4 text-slate-800 flex justify-between items-center shadow-lg relative z-10">
          <button onClick={handlePrevMonth} className="hover:bg-slate-200 p-1.5 rounded-lg transition-colors"><ChevronRight size={20}/></button>
          <span className="font-bold text-lg">{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
          <button onClick={handleNextMonth} className="hover:bg-slate-200 p-1.5 rounded-lg transition-colors"><ChevronLeft size={20}/></button>
        </div>

        {/* Days Grid */}
        <div className="bg-white grid grid-cols-7 text-center py-2 text-slate-500 text-xs border-b border-slate-100">
          {WEEK_DAYS.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 p-2 gap-1 content-start bg-white min-h-[240px]">
          {generateDays().map((d, idx) => {
            // Fridays come from the weekday position, not the dataset — the
            // grid always starts on Saturday, so index 6 of each row is Friday.
            const isFriday = idx % 7 === 6;
            const info = d ? getDayInfo(viewYear, viewMonth, d) : null;
            const isOffDay = isFriday || !!info?.isHoliday;
            return (
              <div key={idx} className="aspect-square flex items-center justify-center">
                {d ? (
                  <button
                    onClick={() => setSelectedDay(d)}
                    title={info?.title || undefined}
                    className={`w-8 h-8 rounded-full text-sm transition-all flex items-center justify-center relative
                      ${selectedDay === d
                        ?'bg-blue-500 text-white shadow-lg scale-110 font-bold'
                        : isOffDay
                          ?'text-red-600 hover:bg-red-50 font-medium'
                          :'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }
                      ${(d === jDate.jd && viewMonth === jDate.jm && viewYear === jDate.jy) ?'border border-blue-500/50':''}
                    `}
                  >
                    {d}
                    {info && selectedDay !== d && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${info.isHoliday ?'bg-red-500':'bg-amber-500'}`}/>
                    )}
                  </button>
                ) : <span/>}
              </div>
            );
          })}
        </div>

        {/* Occasion label for the selected day. Only rendered when there is
            something to say, so an ordinary day doesn't leave an empty strip. */}
        {selectedInfo && (
          <div className={`mx-3 mb-2 px-3 py-2 rounded-lg text-xs leading-relaxed ${
            selectedInfo.isHoliday
              ?'bg-red-50 text-red-700 border border-red-200'
              :'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {selectedInfo.isHoliday && <span className="font-bold">تعطیل رسمی — </span>}
            {selectedInfo.title}
          </div>
        )}

        {/* Time Picker */}
        {!dateOnly && (
        <div className="border-t border-slate-200 p-4 bg-white flex items-center justify-center gap-4"dir="ltr">
          <div className="flex flex-col items-center">
            <label className="text-[10px] text-slate-500 mb-1">ساعت</label>
            <input
              type="number"min="0"max="23"
              value={selectedHour}
              onChange={e => setSelectedHour(Math.max(0, Math.min(23, Number(e.target.value))))}
              className="w-16 bg-slate-100 border border-slate-200 rounded-lg p-2 text-center text-slate-800 text-xl font-mono focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <span className="text-slate-800 text-2xl pt-4 font-bold animate-pulse text-slate-500">:</span>
          <div className="flex flex-col items-center">
            <label className="text-[10px] text-slate-500 mb-1">دقیقه</label>
            <input
              type="number"min="0"max="59"
              value={selectedMinute}
              onChange={e => setSelectedMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
              className="w-16 bg-slate-100 border border-slate-200 rounded-lg p-2 text-center text-slate-800 text-xl font-mono focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="p-3 flex gap-3 border-t border-slate-100 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 text-slate-500 hover:text-slate-900 text-sm hover:bg-slate-100 rounded-xl transition-colors font-medium">انصراف</button>
          <button onClick={handleConfirm} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all">{dateOnly ?'تایید تاریخ':'تایید زمان'}</button>
        </div>
      </div>
    </div>
  );
};
