import React from 'react';
import { WeeklySchedule, QuestionItem } from '../types';
import { QuestionCard } from './QuestionCard';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WeeklySectionProps {
  schedule: WeeklySchedule;
  weekIndex: number;
  onOpenPostponeModal: (question: QuestionItem) => void;
}

export const WeeklySection: React.FC<WeeklySectionProps> = ({
  schedule,
  weekIndex,
  onOpenPostponeModal,
}) => {
  const isPostponedPresent = schedule.questions.some((q) => q.isPostponedNow || !!q.question.postponedDate);

  return (
    <section
      id={`weekly-section-${schedule.date}`}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all"
    >
      {/* Week Header matching Professional Polish theme */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0369a1] text-white flex items-center justify-center font-bold text-xs">
            W{weekIndex + 1}
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">
              ระเบียบวาระ: {schedule.thaiDateFormatted}
            </h3>
            <p className="text-slate-500 text-xs">
              สถานะ: บรรจุกระทู้แล้ว ({schedule.questions.length} / {schedule.capacity} เรื่อง)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {weekIndex === 0 && schedule.questions.some((q) => q.isPostponedNow) && (
            <span className="bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>สัปดาห์เริ่มต้นวาระ: คงชื่อเรื่องกระทู้ที่เลื่อนไว้ (ไม่จัดกระทู้ขึ้นมาแทน)</span>
            </span>
          )}

          {schedule.postponedCount && schedule.postponedCount > 0 ? (
            <span className="bg-sky-100 text-[#0369a1] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-sky-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0369a1]" />
              มีกระทู้เลื่อนมาตอบ +{schedule.postponedCount} เรื่อง (รวม {schedule.questions.length} เรื่อง)
            </span>
          ) : null}

          {weekIndex > 0 && isPostponedPresent && (
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              มีกระทู้ขอเลื่อนตอบในรอบนี้
            </span>
          )}

          <div className="bg-white px-3.5 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            วันจันทร์ที่ {schedule.date}
          </div>
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
