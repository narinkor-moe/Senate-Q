import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CalendarCheck,
  CalendarOff,
  Calendar,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Info,
  ArrowRight
} from 'lucide-react';
import { SpecialMeetingConfig } from '../types';
import {
  formatThaiDateWithDayOfWeek,
  formatThaiShortDate,
  getDayOfWeekThai,
  isMondayDate
} from '../scheduler';

interface SpecialMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: Record<string, string>;
  specialMeetings: Record<string, SpecialMeetingConfig>;
  onSaveSpecialMeeting: (cancelledMonday: string, specialDate: string, reason?: string) => void;
  onDeleteSpecialMeeting: (cancelledMonday: string) => void;
  initialMondayDate?: string;
  startDate?: string;
  maxWeeks?: number;
}

export const SpecialMeetingModal: React.FC<SpecialMeetingModalProps> = ({
  isOpen,
  onClose,
  holidays,
  specialMeetings,
  onSaveSpecialMeeting,
  onDeleteSpecialMeeting,
  initialMondayDate,
  startDate = '2026-08-31',
  maxWeeks = 12,
}) => {
  // Candidate Mondays for selection: Mondays that have a holiday or are marked cancelled, or upcoming Mondays
  const candidateMondays = useMemo(() => {
    const list: { date: string; reason: string; hasSpecialMeeting: boolean }[] = [];
    
    // First, find all Mondays in holidays map
    Object.entries(holidays).forEach(([date, name]) => {
      if (isMondayDate(date)) {
        list.push({
          date,
          reason: String(name),
          hasSpecialMeeting: !!specialMeetings[date],
        });
      }
    });

    // Also include any Monday that already has a special meeting
    Object.keys(specialMeetings).forEach((mondayDate) => {
      if (!list.some((item) => item.date === mondayDate)) {
        list.push({
          date: mondayDate,
          reason: holidays[mondayDate] || 'วันงดประชุม',
          hasSpecialMeeting: true,
        });
      }
    });

    // Add upcoming Mondays from startDate up to maxWeeks so user can cancel & schedule special meeting for any Monday
    const start = new Date(startDate + 'T00:00:00');
    const dayOfWeek = start.getDay();
    const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
    start.setDate(start.getDate() + daysUntilMonday);

    for (let i = 0; i < maxWeeks; i++) {
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      const mondayStr = `${yyyy}-${mm}-${dd}`;

      if (!list.some((item) => item.date === mondayStr)) {
        list.push({
          date: mondayStr,
          reason: 'วันประชุมปกติ (เลือกหากต้องการงดและนัดประชุมเป็นพิเศษแทน)',
          hasSpecialMeeting: !!specialMeetings[mondayStr],
        });
      }

      start.setDate(start.getDate() + 7);
    }

    // Sort by date ascending
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, specialMeetings, startDate, maxWeeks]);

  const [selectedMonday, setSelectedMonday] = useState<string>('');
  const [specialDate, setSpecialDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Set initial Monday date when modal opens or initialMondayDate changes
  useEffect(() => {
    if (isOpen) {
      setErrorNotice(null);
      const targetMonday = initialMondayDate || (candidateMondays.length > 0 ? candidateMondays[0].date : '');
      setSelectedMonday(targetMonday);
      
      if (targetMonday && specialMeetings[targetMonday]) {
        setSpecialDate(specialMeetings[targetMonday].specialDate);
        setReason(specialMeetings[targetMonday].reason || '');
      } else if (targetMonday) {
        // Default to Tuesday (+1 day)
        const d = new Date(targetMonday + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setSpecialDate(`${yyyy}-${mm}-${dd}`);
        setReason('นัดประชุมเป็นพิเศษพิจารณาระเบียบวาระกระทู้ถาม');
      }
    }
  }, [isOpen, initialMondayDate, candidateMondays, specialMeetings]);

  // When selectedMonday changes, calculate default special date if not already set
  const handleSelectMonday = (mondayDate: string) => {
    setSelectedMonday(mondayDate);
    setErrorNotice(null);
    if (specialMeetings[mondayDate]) {
      setSpecialDate(specialMeetings[mondayDate].specialDate);
      setReason(specialMeetings[mondayDate].reason || '');
    } else {
      // Suggest Tuesday (+1 day)
      const d = new Date(mondayDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setSpecialDate(`${yyyy}-${mm}-${dd}`);
      setReason('นัดประชุมเป็นพิเศษพิจารณาระเบียบวาระกระทู้ถาม');
    }
  };

  // Helper for quick offset days (+1 = Tue, +2 = Wed, +3 = Thu, +4 = Fri)
  const handleSetOffsetDays = (offset: number) => {
    if (!selectedMonday) return;
    const d = new Date(selectedMonday + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSpecialDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSave = () => {
    if (!selectedMonday) {
      setErrorNotice('กรุณาเลือกวันจันทร์ที่มีการยกเลิกหรืองดการประชุม');
      return;
    }
    if (!specialDate) {
      setErrorNotice('กรุณาระบุวันนัดประชุมเป็นพิเศษ');
      return;
    }
    if (selectedMonday === specialDate) {
      setErrorNotice('วันประชุมเป็นพิเศษต้องไม่ตรงกับวันจันทร์เดิมที่งดประชุม');
      return;
    }

    onSaveSpecialMeeting(selectedMonday, specialDate, reason.trim());
    onClose();
  };

  if (!isOpen) return null;

  const currentSpecialMeetingsList: SpecialMeetingConfig[] = Object.values(specialMeetings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>นัดวันประชุมเป็นพิเศษ (กรณีงดประชุมวันจันทร์)</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-amber-100 border border-white/25">
                  กฎเกณฑ์ใหม่
                </span>
              </h2>
              <p className="text-amber-100 text-xs mt-0.5">
                เลื่อนกระทู้ถามที่บรรจุในวันจันทร์มาจัดในวันประชุมเป็นพิเศษของสัปดาห์นั้นแทน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rule Highlight Banner */}
        <div className="p-4 bg-amber-50/90 border-b border-amber-200/80 text-amber-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-900">
              ข้อบังคับและกฎเกณฑ์การจัดระเบียบวาระ:
            </div>
            <p className="text-amber-900/90 leading-relaxed">
              "หากในวันจันทร์ของสัปดาห์ใด มีการยกเลิกหรืองดการประชุมและได้มีการนัดวันประชุมเป็นพิเศษในสัปดาห์นั้น ให้ระบบนำกระทู้ถามที่ได้บรรจุในวันจันทร์ของสัปดาห์นั้น เลื่อนมาจัดระเบียบวาระการประชุมเป็นพิเศษของสัปดาห์นั้นแทน"
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Existing Special Meetings Section */}
          {currentSpecialMeetingsList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-amber-600" />
                  รายการนัดประชุมเป็นพิเศษที่กำหนดไว้แล้ว ({currentSpecialMeetingsList.length} ครั้ง)
                </span>
              </div>
              <div className="space-y-2">
                {currentSpecialMeetingsList.map((item) => (
                  <div
                    key={item.cancelledMonday}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                      <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span className="text-rose-700 line-through">
                            {formatThaiShortDate(item.cancelledMonday)} (งดประชุม)
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            {formatThaiDateWithDayOfWeek(item.specialDate)} (ประชุมพิเศษ)
                          </span>
                        </div>
                        {item.reason && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectMonday(item.cancelledMonday)}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSpecialMeeting(item.cancelledMonday)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                        title="ยกเลิกการนัดประชุมเป็นพิเศษนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form to Add / Edit Special Meeting */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Plus className="w-4 h-4 text-amber-600" />
              <span>กำหนด / บันทึกการนัดวันประชุมเป็นพิเศษ</span>
            </div>

            {errorNotice && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* 1. Select Cancelled Monday */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
                1. เลือกวันจันทร์ที่มีการยกเลิกหรืองดการประชุม:
              </label>
              <select
                value={selectedMonday}
                onChange={(e) => handleSelectMonday(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {candidateMondays.map((item) => (
                  <option key={item.date} value={item.date}>
                    {formatThaiDateWithDayOfWeek(item.date)} — {item.reason} {item.hasSpecialMeeting ? '(กำหนดประชุมพิเศษแล้ว)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Pick Special Meeting Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                2. วันที่นัดประชุมเป็นพิเศษในสัปดาห์นั้น:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={specialDate}
                  onChange={(e) => setSpecialDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {/* Shortcut Buttons */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSetOffsetDays(1)}
                    className="px-2 py-1.5 rounded bg-white hover:bg-amber-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    title="นัดเป็นวันอังคารของสัปดาห์นั้น"
                  >
                    +1 วัน (วันอังคาร)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOffsetDays(2)}
                    className="px-2 py-1.5 rounded bg-white hover:bg-amber-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    title="นัดเป็นวันพุธของสัปดาห์นั้น"
                  >
                    +2 วัน (วันพุธ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOffsetDays(3)}
                    className="px-2 py-1.5 rounded bg-white hover:bg-amber-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    title="นัดเป็นวันพฤหัสบดีของสัปดาห์นั้น"
                  >
                    +3 วัน (วันพฤหัสบดี)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOffsetDays(4)}
                    className="px-2 py-1.5 rounded bg-white hover:bg-amber-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    title="นัดเป็นวันศุกร์ของสัปดาห์นั้น"
                  >
                    +4 วัน (วันศุกร์)
                  </button>
                </div>
              </div>

              {specialDate && (
                <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-200 text-xs text-amber-950 font-bold flex items-center justify-between">
                  <span>วันประชุมเป็นพิเศษ: {formatThaiDateWithDayOfWeek(specialDate)}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold">
                    {getDayOfWeekThai(specialDate)}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Reason / Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                3. เหตุผล / หมายเหตุการนัดประชุม:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น นัดประชุมเป็นพิเศษพิจารณากระทู้ถามตามมติที่ประชุม..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  'นัดประชุมเป็นพิเศษพิจารณากระทู้ถาม',
                  'นัดประชุมเป็นพิเศษตามมติที่ประชุม',
                  'ประชุมเป็นพิเศษแทนวันจันทร์ที่งดประชุม',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกและเลื่อนวาระมาจัดในวันพิเศษ</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
