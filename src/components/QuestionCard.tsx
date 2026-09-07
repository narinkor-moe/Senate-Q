import React from 'react';
import { ScheduledQuestion, QuestionItem } from '../types';
import { User, Briefcase, Clock, RotateCcw, CornerDownRight, Calendar, Sparkles, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { formatThaiShortDate, formatThaiDateWithDayOfWeek } from '../scheduler';

interface QuestionCardProps {
  scheduledItem: ScheduledQuestion;
  onOpenPostponeModal: (question: QuestionItem) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  scheduledItem,
  onOpenPostponeModal,
}) => {
  const { question, slotNumber, isPostponedFromPrevious, isPostponedNow } = scheduledItem;
  const isAnswered = question.isAnswered === true || question.status === 'completed' || question.status === 'answered' || (question.rawStatus && question.rawStatus.includes('ตอบแล้ว'));

  return (
    <div
      id={`question-card-${question.id}`}
      className={`relative flex flex-col justify-between bg-white rounded-xl transition-all duration-200 pt-6 px-5 pb-5 ${
        isAnswered
          ? 'border-2 border-emerald-600/70 bg-emerald-50/20 shadow-xs'
          : isPostponedNow
          ? 'border-2 border-amber-400 bg-amber-50/40 shadow-sm'
          : isPostponedFromPrevious
          ? 'border-2 border-[#0369a1] shadow-md ring-1 ring-[#0369a1]/20 bg-sky-50/10'
          : 'border border-slate-200 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Top Floating Badge Pill matching theme */}
      <div className="absolute -top-3 left-4 flex items-center gap-1.5 flex-wrap">
        {isAnswered ? (
          <span className="inline-flex items-center gap-1 bg-emerald-700 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide">
            <CheckCircle2 className="w-3 h-3" />
            ลำดับที่ {slotNumber} (ตอบแล้ว)
          </span>
        ) : isPostponedFromPrevious ? (
          <span className="inline-flex items-center gap-1 bg-[#0369a1] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide">
            <CornerDownRight className="w-3 h-3" />
            ลำดับที่ {slotNumber} (กระทู้ขอเลื่อนมาตอบ)
          </span>
        ) : isPostponedNow ? (
          <span className="inline-flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide">
            <Clock className="w-3 h-3" />
            ลำดับที่ {slotNumber} (เลื่อนวันตอบ)
          </span>
        ) : scheduledItem.projectionType === 'projected_regular' ? (
          <span className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-2xs">
            <Sparkles className="w-3 h-3 text-indigo-200" />
            ลำดับที่ {slotNumber} (คาดการณ์ตามคิว)
          </span>
        ) : (
          <span className="inline-flex items-center bg-slate-700 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
            ลำดับที่ {slotNumber} (บรรจุในวาระ)
          </span>
        )}

        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
          ลำดับที่ยื่น: {question.submittedOrder}
        </span>
      </div>

      {/* Main Topic Headline */}
      <div className="mt-2 mb-3">
        <h4 className="text-base font-bold text-slate-900 leading-snug tracking-tight">
          เรื่อง: {question.topic}
        </h4>

        {isAnswered && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-bold border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>สถานะ: ตอบแล้ว</span>
              <span className="font-normal text-emerald-800">
                (บรรจุในวาระและตอบแล้วในที่ประชุม)
              </span>
            </span>
          </div>
        )}

        {isPostponedNow && !isAnswered && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md font-bold border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>สถานะ: เลื่อนวันตอบ</span>
              {question.postponedDate ? (
                <span className="font-normal text-amber-900">
                  (คงชื่อเรื่องไว้ในวาระนี้ &bull; ขอเลื่อนไปตอบ: {formatThaiDateWithDayOfWeek(question.postponedDate)})
                </span>
              ) : (
                <span className="font-normal text-amber-900">
                  (คงชื่อเรื่องไว้ในวาระนี้ &bull; เลื่อนไปตอบสัปดาห์ถัดไป)
                </span>
              )}
            </span>
          </div>
        )}

        {isPostponedFromPrevious && !isAnswered && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] bg-sky-100 text-[#0369a1] px-2.5 py-1 rounded-md font-bold border border-sky-200 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0369a1] shrink-0" />
              <span>กระทู้ขอเลื่อนมาตอบในวาระนี้</span>
              {scheduledItem.postponedFromDate && (
                <span className="font-normal text-sky-800">
                  (เลื่อนมาจากวาระ: {formatThaiShortDate(scheduledItem.postponedFromDate)})
                </span>
              )}
              <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px]">
                สิทธิ์ตอบลำดับแรก
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Meta details list in theme layout */}
      <div className="space-y-2 py-3 border-t border-slate-100 text-xs">
        <div className="flex items-start gap-2">
          <span className="w-20 text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            ผู้ตั้งถาม:
          </span>
          <span className="font-semibold text-slate-700 break-words">{question.asker}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="w-20 text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            ถาม รมต.:
          </span>
          <span className="font-semibold text-slate-700 leading-relaxed break-words">{question.minister}</span>
        </div>
      </div>

      {/* Action Footer: Postpone Request Trigger Pop Up */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {isAnswered ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            ตอบแล้วในที่ประชุม (เสร็จสิ้น)
          </span>
        ) : (
          <button
            type="button"
            id={`btn-postpone-${question.id}`}
            onClick={() => onOpenPostponeModal(question)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs ${
              question.postponedDate || isPostponedNow
                ? question.isPostponedInSheet
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300'
            }`}
            title={
              question.postponedDate
                ? question.isPostponedInSheet
                  ? `ข้อมูลวันเลื่อนตอบจาก Google Sheet: ${question.postponedSheetRaw || question.postponedDate} (คลิกเพื่อแก้ไขหรือล้าง)`
                  : `เลื่อนตอบวันที่: ${question.postponedDate} (คลิกเพื่อแก้ไข/บันทึกลง Sheet)`
                : 'ใน Google Sheet ยังไม่มีวันเลื่อนตอบ — คลิกเพื่อขอเลื่อนและบันทึกลง Google Sheet'
            }
          >
            {question.postponedDate || isPostponedNow ? (
              question.isPostponedInSheet ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              )
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}

            <span>
              {question.postponedDate
                ? `เลื่อนตอบ: ${question.postponedSheetRaw || question.postponedDate}`
                : isPostponedNow
                ? 'เลื่อนวันตอบ (แก้ไข/ล้าง)'
                : 'ขอเลื่อนวันตอบ'}
            </span>

            {question.isPostponedInSheet ? (
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1 py-0.2 rounded font-bold border border-emerald-300/80">
                Sheet
              </span>
            ) : !question.postponedDate ? (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                ว่างใน Sheet
              </span>
            ) : null}
          </button>
        )}

        <span className="text-[11px] font-mono text-slate-400">
          #{question.submittedOrder.toString().padStart(3, '0')}/2569
        </span>
      </div>
    </div>
  );
};
