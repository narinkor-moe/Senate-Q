import React from 'react';
import { ScheduledQuestion, QuestionItem } from '../types';
import { User, Briefcase, Clock, RotateCcw, CornerDownRight, Calendar, Sparkles, FileSpreadsheet, CheckCircle2, Lock, GraduationCap } from 'lucide-react';
import { formatThaiShortDate, formatThaiDateWithDayOfWeek } from '../scheduler';

interface QuestionCardProps {
  scheduledItem: ScheduledQuestion;
  onOpenPostponeModal: (question: QuestionItem) => void;
  isAdmin?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  scheduledItem,
  onOpenPostponeModal,
  isAdmin = true,
}) => {
  const { question, slotNumber, isPostponedFromPrevious, isPostponedNow } = scheduledItem;
  const isAnswered = question.isAnswered === true || question.status === 'completed' || question.status === 'answered' || (question.rawStatus && question.rawStatus.includes('ตอบแล้ว'));
  const isEduMinister = question.minister?.includes('ศึกษาธิการ');

  return (
    <div
      id={`question-card-${question.id}`}
      className={`relative flex flex-col justify-between rounded-xl transition-all duration-200 pt-6 px-5 pb-5 ${
        isEduMinister ? 'border-l-[6px] border-l-indigo-600 ring-1 ring-indigo-200/80' : ''
      } ${
        isAnswered
          ? `border-2 border-emerald-600/70 ${isEduMinister ? 'bg-gradient-to-br from-indigo-50/40 via-emerald-50/20 to-white' : 'bg-emerald-50/20'} shadow-xs`
          : isPostponedNow
          ? `border-2 border-amber-400 ${isEduMinister ? 'bg-gradient-to-br from-indigo-50/30 via-amber-50/30 to-white' : 'bg-amber-50/40'} shadow-sm`
          : isPostponedFromPrevious
          ? `border-2 border-[#0369a1] shadow-md ring-1 ring-[#0369a1]/20 ${isEduMinister ? 'bg-gradient-to-br from-indigo-50/40 via-sky-50/20 to-white' : 'bg-sky-50/10'}`
          : isEduMinister
          ? 'border border-indigo-200 bg-gradient-to-br from-indigo-50/35 via-white to-indigo-50/15 shadow-sm hover:shadow-md'
          : 'border border-slate-200 bg-white shadow-xs hover:shadow-md'
      }`}
    >
      {/* Top Floating Badge Pill matching theme */}
      <div className="absolute -top-3 left-4 flex items-center gap-1.5 flex-wrap">
        {isEduMinister && (
          <span
            className="inline-flex items-center gap-1 bg-indigo-700 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide"
            title="กระทู้ถามถึงรัฐมนตรีว่าการกระทรวงศึกษาธิการ"
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>ก.ศึกษาธิการ</span>
          </span>
        )}

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
              <span>
                สถานะ: เลื่อนวันตอบ
                {scheduledItem.postponeRound && scheduledItem.postponeRound > 1 ? (
                  <span className="ml-1.5 text-amber-950 font-extrabold bg-amber-200 px-1.5 py-0.5 rounded border border-amber-400 text-[10px]">
                    ครั้งที่ {scheduledItem.postponeRound} (คอลัมน์ {scheduledItem.postponeColLetter || (scheduledItem.postponeRound === 2 ? 'D' : scheduledItem.postponeRound === 3 ? 'E' : scheduledItem.postponeRound === 4 ? 'F' : 'G')})
                  </span>
                ) : (
                  scheduledItem.postponeColLetter && (
                    <span className="ml-1.5 text-amber-950 font-semibold bg-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">
                      ครั้งที่ 1 (คอลัมน์ {scheduledItem.postponeColLetter})
                    </span>
                  )
                )}
              </span>
              {scheduledItem.nextPostponedDate ? (
                <span className="font-normal text-amber-900">
                  (คงชื่อเรื่องไว้ในวาระนี้ &bull; ขอเลื่อนไปตอบ: {formatThaiDateWithDayOfWeek(scheduledItem.nextPostponedDate)})
                </span>
              ) : question.postponedDate ? (
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
              {scheduledItem.postponeRound && scheduledItem.postponeRound > 1 ? (
                <span className="text-sky-950 font-bold bg-sky-200/80 px-1.5 py-0.5 rounded border border-sky-300 text-[10px]">
                  (เลื่อนครั้งที่ {scheduledItem.postponeRound} จากคอลัมน์ {scheduledItem.postponeColLetter})
                </span>
              ) : (
                scheduledItem.postponeColLetter && (
                  <span className="text-sky-950 font-medium bg-sky-200/60 px-1.5 py-0.5 rounded text-[10px]">
                    (คอลัมน์ {scheduledItem.postponeColLetter})
                  </span>
                )
              )}
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

        {/* Multi-round Postponement History Trail */}
        {question.postponeHistoryItems && question.postponeHistoryItems.length > 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1 flex-wrap">
            <span className="font-bold text-slate-700">ประวัติการเลื่อน (Google Sheet):</span>
            {question.postponeHistoryItems.map((hist, hIdx) => (
              <span
                key={hIdx}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                  scheduledItem.postponeRound === hist.round
                    ? 'bg-amber-200 text-amber-950 font-extrabold border border-amber-300'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>ครั้งที่ {hist.round} (Col {hist.colLetter}):</span>
                <span className="font-semibold">{hist.rawDate}</span>
              </span>
            ))}
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
          {isEduMinister ? (
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 font-bold text-xs border border-indigo-200 shadow-2xs">
                <GraduationCap className="w-4 h-4 text-indigo-700 shrink-0" />
                <span className="leading-relaxed break-words">{question.minister}</span>
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-indigo-700 text-white font-black tracking-wide uppercase">
                  รมว.ศธ.
                </span>
              </div>
            </div>
          ) : (
            <span className="font-semibold text-slate-700 leading-relaxed break-words">{question.minister}</span>
          )}
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
              !isAdmin
                ? 'bg-slate-100/90 hover:bg-amber-50/80 text-slate-600 hover:text-amber-900 border border-slate-200 hover:border-amber-300'
                : question.postponedDate || isPostponedNow
                ? question.isPostponedInSheet
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300'
            }`}
            title={
              !isAdmin
                ? 'ปุ่มเลื่อนตอบที่บันทึกข้อมูลไปยัง Google Sheet สงวนสิทธิ์สำหรับ Admin เท่านั้น (คลิกเพื่อเข้าสู่ระบบ Admin)'
                : question.postponedDate
                ? question.isPostponedInSheet
                  ? `ข้อมูลวันเลื่อนตอบจาก Google Sheet: ${question.postponedSheetRaw || question.postponedDate} (คลิกเพื่อแก้ไขหรือล้าง)`
                  : `เลื่อนตอบวันที่: ${question.postponedDate} (คลิกเพื่อแก้ไข/บันทึกลง Sheet)`
                : 'ใน Google Sheet ยังไม่มีวันเลื่อนตอบ — คลิกเพื่อขอเลื่อนและบันทึกลง Google Sheet'
            }
          >
            {!isAdmin ? (
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : question.postponedDate || isPostponedNow ? (
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

            {!isAdmin ? (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-medium flex items-center gap-0.5">
                เฉพาะ Admin
              </span>
            ) : question.isPostponedInSheet ? (
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
