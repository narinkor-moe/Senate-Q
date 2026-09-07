import React from 'react';
import { WeeklySchedule, QuestionItem } from '../types';
import { QuestionCard } from './QuestionCard';
import { Calendar, AlertTriangle, CheckCircle2, Printer, CalendarOff, Landmark, Sparkles, FileCheck } from 'lucide-react';

interface WeeklySectionProps {
  schedule: WeeklySchedule;
  weekIndex: number;
  onOpenPostponeModal: (question: QuestionItem) => void;
  onPrintWeek?: (date: string) => void;
  onCancelWeek?: (date: string) => void;
}

export const WeeklySection: React.FC<WeeklySectionProps> = ({
  schedule,
  weekIndex,
  onOpenPostponeModal,
  onPrintWeek,
  onCancelWeek,
}) => {
  const isOfficial = schedule.scheduleType === 'official';
  const isPostponedPresent = schedule.questions.some((q) => q.isPostponedNow || !!q.question.postponedDate);

  return (
    <section
      id={`weekly-section-${schedule.date}`}
      className={`rounded-xl shadow-sm border overflow-hidden transition-all ${
        isOfficial ? 'bg-white border-blue-200 ring-1 ring-blue-500/10' : 'bg-white border-slate-200'
      }`}
    >
      {/* Week Header */}
      <div
        className={`px-6 py-4 border-b flex flex-wrap justify-between items-center gap-3 ${
          isOfficial ? 'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-blue-100' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs ${
              isOfficial ? 'bg-[#0369a1] text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            W{weekIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight">
                {isOfficial ? 'ระเบียบวาระ: ' : 'คาดการณ์ระเบียบวาระ: '}
                {schedule.thaiDateFormatted}
              </h3>
              {isOfficial ? (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                  <Landmark className="w-3 h-3 text-blue-700" />
                  บรรจุในวาระแล้ว (ทางการ)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-purple-700" />
                  คาดการณ์การบรรจุล่วงหน้า
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              สถานะ: {isOfficial ? 'บรรจุตามระเบียบวาระ' : 'คาดการณ์ตามลำดับคิวและข้อบังคับ'}{' '}
              ({schedule.questions.length} / {schedule.capacity} เรื่อง)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {schedule.questions.some((q) => q.question.isAnswered || (q.question.rawStatus && q.question.rawStatus.includes('ตอบแล้ว'))) && (
            <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>มีกระทู้ตอบแล้วในวาระ</span>
            </span>
          )}

          {weekIndex === 0 && schedule.questions.some((q) => q.isPostponedNow) && (
            <span className="bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>สัปดาห์ที่ 1: คงชื่อเรื่องกระทู้ที่เลื่อนตอบไว้ในวาระ และระบบนำไปจัดในระเบียบวาระในสัปดาห์ที่ขอเลื่อนไปตอบ</span>
            </span>
          )}

          {schedule.postponedCount && schedule.postponedCount > 0 ? (
            <span className="bg-sky-100 text-[#0369a1] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-sky-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0369a1]" />
              มีกระทู้เลื่อนมาตอบ +{schedule.postponedCount} เรื่อง (รวม {schedule.questions.length} เรื่อง)
            </span>
          ) : null}

          {weekIndex > 0 && isPostponedPresent && isOfficial && (
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              มีกระทู้ขอเลื่อนตอบในรอบนี้
            </span>
          )}

          <div className="bg-white px-3.5 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            วันจันทร์ที่ {schedule.date}
          </div>

          {onCancelWeek && (
            <button
              type="button"
              onClick={() => onCancelWeek(schedule.date)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              title="งดการประชุมสัปดาห์นี้ (ข้ามไปจัดวันจันทร์ถัดไป)"
            >
              <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
              <span>งดประชุมสัปดาห์นี้</span>
            </button>
          )}

          {onPrintWeek && (
            <button
              type="button"
              onClick={() => onPrintWeek(schedule.date)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="พิมพ์เฉพาะระเบียบวาระสัปดาห์นี้"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>พิมพ์วาระนี้</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards 3-Column Grid */}
      <div className="p-6">
        {schedule.questions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-slate-600 font-semibold text-sm">ไม่มีกระทู้ถามที่บรรจุในสัปดาห์นี้</p>
            {weekIndex === 0 && (
              <p className="text-slate-400 text-xs mt-1">
                (สัปดาห์เริ่มต้นวาระ: กระทู้ถามที่ถูกจัดลำดับในสัปดาห์แรกขอเลื่อนวันตอบ และไม่มีการจัดกระทู้ถามตามลำดับที่ยื่นขึ้นมาแทน)
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {schedule.questions.map((item) => (
              <QuestionCard
                key={item.question.id}
                scheduledItem={item}
                onOpenPostponeModal={onOpenPostponeModal}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
