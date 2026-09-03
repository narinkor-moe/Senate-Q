import React, { useState, useEffect } from 'react';
import { QuestionItem } from '../types';
import { getWorkingMondays, formatThaiDate, parseThaiOrISODate } from '../scheduler';
import {
  Calendar,
  Clock,
  Check,
  RotateCcw,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Info,
  CalendarCheck
} from 'lucide-react';

interface PostponeModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePostpone: (questionId: string, targetDateISO: string | undefined) => void;
  startDate: string;
  holidays?: Record<string, string>;
}

export const PostponeModal: React.FC<PostponeModalProps> = ({
  question,
  isOpen,
  onClose,
  onSavePostpone,
  startDate,
  holidays,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate upcoming working Mondays for quick selection (excluding holidays)
  const upcomingMondays = React.useMemo(() => {
    const { workingMondays } = getWorkingMondays(startDate || '2026-09-07', 8, holidays);
    return workingMondays;
  }, [startDate, holidays]);

  useEffect(() => {
    if (question) {
      if (question.postponedDate) {
        const parsed = parseThaiOrISODate(question.postponedDate);
        setSelectedDate(parsed || question.postponedDate);
      } else {
        // Default to next week's Monday if available
        setSelectedDate(upcomingMondays[1] || upcomingMondays[0] || '2026-09-14');
      }
      setErrorMsg(null);
    }
  }, [question, upcomingMondays]);

  if (!isOpen || !question) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || selectedDate.trim() === '') {
      setErrorMsg('กรุณาระบุวันที่ต้องการขอเลื่อนไปตอบ');
      return;
    }

    const parsedISO = parseThaiOrISODate(selectedDate);
    if (!parsedISO) {
      setErrorMsg('รูปแบบวันที่ไม่ถูกต้อง กรุณาเลือกวันที่จากปฏิทินหรือปุ่มลัด');
      return;
    }

    onSavePostpone(question.id, parsedISO);
    onClose();
  };

  const handleResetPostpone = () => {
    onSavePostpone(question.id, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ขอเลื่อนวันตอบกระทู้ถาม
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดวันที่ใหม่ที่ขอเลื่อนวันไปตอบในระเบียบวาระ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Details summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px]">
              ลำดับที่ยื่น: {question.submittedOrder}
            </span>
            {question.postponedDate && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[10px] border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                เลื่อนตอบเดิม: {question.postponedDate}
              </span>
            )}
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm leading-snug">
              เรื่อง: {question.topic}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400">ผู้ตั้งถาม: </span>
              <strong className="text-slate-700">{question.asker}</strong>
            </div>
            <div>
              <span className="text-slate-400">ถาม รมต.: </span>
              <strong className="text-slate-700">{question.minister}</strong>
            </div>
          </div>
        </div>

        {/* Date Selection Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0369a1]" />
                ใส่วันที่ใหม่ที่ขอเลื่อนวันไปตอบ *
              </span>
              {selectedDate && (
                <span className="text-[11px] font-medium text-[#0369a1]">
                  {formatThaiDate(selectedDate)}
                </span>
              )}
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/20 bg-white"
            />
          </div>

          {/* Quick Select Buttons from Working Mondays */}
          <div>
            <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
              หรือเลือกวันจันทร์ที่มีการประชุมระเบียบวาระ:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {upcomingMondays.map((monday, idx) => {
                const isSelected = selectedDate === monday;
                return (
                  <button
                    key={monday}
                    type="button"
                    onClick={() => {
                      setSelectedDate(monday);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs font-medium transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#0369a1]'}`} />
                      <span>{formatThaiDate(monday).replace('วันจันทร์ที่ ', '')}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      W{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regulatory Rules Info Box */}
          <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 text-[11px] text-sky-900 space-y-1">
            <div className="font-bold flex items-center gap-1 text-sky-950">
              <Sparkles className="w-3.5 h-3.5 text-[#0369a1]" />
              สิทธิ์และเกณฑ์การจัดลำดับเมื่อขอเลื่อนวันตอบ:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-sky-800 leading-relaxed">
              <li>ได้สิทธิ์เป็น <strong>ลำดับแรก (Prioritized Slot)</strong> ในวันที่ขอเลื่อนไปตอบ</li>
              <li>สามารถจัด <strong>เกิน 3 กระทู้ได้</strong> ในวันดังกล่าว</li>
              <li><strong>ชื่อผู้ตั้งถามห้ามซ้ำกัน</strong> กับกระทู้ที่จัดในวันนั้น (หากซ้ำจะเลื่อนไปจัดในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ)</li>
              <li>หากมีกระทู้ขอเลื่อนในวันเดียวกันหลายเรื่อง จะเรียงตาม <strong>ลำดับที่ยื่น</strong></li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {question.postponedDate ? (
              <button
                type="button"
                onClick={handleResetPostpone}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ยกเลิกการขอเลื่อน (ตอบตามปกติ)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                ปิด
              </button>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0369a1] hover:bg-[#075985] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการขอเลื่อนวันตอบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
