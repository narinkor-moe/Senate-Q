import React from 'react';
import { ScheduledQuestion, QuestionItem, PostponeHistoryItem } from '../types';
import { User, Briefcase, Clock, RotateCcw, Calendar, Sparkles, FileSpreadsheet, CheckCircle2, Lock, GraduationCap, Landmark } from 'lucide-react';
import { formatThaiShortDate, formatThaiDateWithDayOfWeek, formatThaiNumericDate } from '../scheduler';
import { getQuestionPostponeHistoryItems } from '../utils/postponeStats';

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

  // ดึงประวัติการขอเลื่อนตอบทั้งหมดของกระทู้
  const baseHistoryItems = getQuestionPostponeHistoryItems(question);
  const postponeHistoryItems: PostponeHistoryItem[] = [...baseHistoryItems];
  if (
    postponeHistoryItems.length === 0 &&
    (scheduledItem.nextPostponedDate || scheduledItem.postponedFromDate)
  ) {
    const target = scheduledItem.nextPostponedDate || scheduledItem.postponedFromDate || '';
    postponeHistoryItems.push({
      round: scheduledItem.postponeRound || 1,
      colLetter: scheduledItem.postponeColLetter || 'D',
      rawDate: target,
      isoDate: target,
      thaiFormatted: formatThaiShortDate(target),
    });
  }

  const hasPostponeHistory =
    postponeHistoryItems.length > 0 ||
    isPostponedFromPrevious ||
    isPostponedNow ||
    !!question.isPostponedInSheet ||
    !!question.postponedDate;

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
          ? `border-2 border-amber-400 shadow-sm ${isEduMinister ? 'bg-gradient-to-br from-indigo-50/30 via-amber-50/30 to-white' : 'bg-amber-50/40'}`
          : isEduMinister
          ? 'border-2 border-indigo-600 ring-1 ring-indigo-300/70 bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/15 shadow-sm hover:shadow-md'
          : scheduledItem.projectionType === 'projected_regular'
          ? 'border-2 border-indigo-500/80 ring-1 ring-indigo-300/40 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50/30 shadow-sm hover:shadow-md'
          : 'border-2 border-[#0369a1] ring-1 ring-[#0369a1]/30 bg-gradient-to-br from-sky-50/25 via-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-blue-700'
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
          <span className="inline-flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide">
            <Clock className="w-3 h-3" />
            ลำดับที่ {slotNumber} (เลื่อนวันตอบ)
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
          <span className="inline-flex items-center gap-1 bg-[#0369a1] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm tracking-wide">
            <Landmark className="w-3 h-3 text-sky-200 shrink-0" />
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

        {/* Postponement History Trail (แสดงทั้งกระทู้ที่ขอเลื่อน และกระทู้ที่มีการขอเลื่อนและได้ตอบแล้ว - อยู่ข้างบนสถานะการตอบ) */}
        {hasPostponeHistory && (
          <div
            className={`mt-2.5 mb-2 rounded-lg p-2.5 border text-xs ${
              isAnswered
                ? 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-2xs'
                : isPostponedNow
                ? 'bg-amber-50/50 border-amber-200 text-amber-950 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <span className="font-bold flex items-center gap-1.5 text-[11px] text-amber-950">
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  ประวัติการขอเลื่อนวันตอบ ({postponeHistoryItems.length} ครั้ง):
                </span>
              </span>

              {isAnswered ? (
                <span className="text-[10px] text-emerald-900 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>ตอบแล้วในที่ประชุม</span>
                </span>
              ) : isPostponedNow ? (
                <span className="text-[10px] text-amber-950 font-bold bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
                  ขอเลื่อนตอบในวาระนี้
                </span>
              ) : (
                <span className="text-[10px] text-amber-950 font-bold bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
                  เลื่อนวันตอบ
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* วาระเดิมที่เคยบรรจุ (ถ้ามี) */}
              {(scheduledItem.postponedFromDate || question.scheduledDate) && (
                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-white text-slate-700 border border-slate-200 shadow-2xs"
                  title="วันที่บรรจุในระเบียบวาระเดิมครั้งแรก"
                >
                  <span className="text-slate-400 font-normal">วาระเดิม:</span>
                  <span className="font-semibold text-slate-800">
                    {formatThaiShortDate(scheduledItem.postponedFromDate || question.scheduledDate || '')}
                  </span>
                </div>
              )}

              {/* รายการประวัติการเลื่อนแต่ละครั้ง */}
              {postponeHistoryItems.map((hist, idx) => {
                const isCurrentRound = scheduledItem.postponeRound === hist.round;
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-white shadow-2xs ${
                      isAnswered
                        ? 'border border-amber-300 text-amber-950'
                        : isCurrentRound
                        ? 'border-2 border-amber-500 bg-amber-50 text-amber-950 font-bold'
                        : 'border border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                      ครั้งที่ {hist.round} (คอลัมน์ {hist.colLetter})
                    </span>
                    <span className="text-slate-400 text-[10px]">&rarr;</span>
                    <span className="font-bold text-slate-900">
                      {hist.thaiFormatted || hist.rawDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    ครั้งที่ {scheduledItem.postponeRound} (คอลัมน์ {scheduledItem.postponeColLetter || (scheduledItem.postponeRound === 2 ? 'E' : scheduledItem.postponeRound === 3 ? 'F' : scheduledItem.postponeRound === 4 ? 'G' : scheduledItem.postponeRound === 5 ? 'H' : 'D')})
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
            <span className="text-[11px] bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md font-bold border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>เลื่อนวันตอบ</span>
              {scheduledItem.postponeRound && scheduledItem.postponeRound > 1 ? (
                <span className="text-amber-950 font-extrabold bg-amber-200 px-1.5 py-0.5 rounded border border-amber-400 text-[10px]">
                  (เลื่อนครั้งที่ {scheduledItem.postponeRound} จากคอลัมน์ {scheduledItem.postponeColLetter})
                </span>
              ) : (
                scheduledItem.postponeColLetter && (
                  <span className="text-amber-950 font-medium bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 text-[10px]">
                    (คอลัมน์ {scheduledItem.postponeColLetter})
                  </span>
                )
              )}
              {scheduledItem.postponedFromDate && (
                <span className="font-normal text-amber-900">
                  (เลื่อนมาจากวาระ: {formatThaiShortDate(scheduledItem.postponedFromDate)})
                </span>
              )}
              <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                สิทธิ์ตอบลำดับแรก
              </span>
            </span>
          </div>
        )}

        {!isAnswered && !isPostponedNow && !isPostponedFromPrevious && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] bg-sky-50 text-[#0369a1] px-2.5 py-1 rounded-md font-bold border border-sky-300 flex items-center gap-1.5 shadow-2xs">
              <Landmark className="w-3.5 h-3.5 text-[#0369a1] shrink-0" />
              <span>
                {scheduledItem.projectionType === 'projected_regular'
                  ? 'สถานะ: คาดการณ์การบรรจุล่วงหน้า'
                  : 'สถานะ: บรรจุในวาระแล้ว'}
              </span>
              <span className="font-normal text-sky-900">
                {scheduledItem.projectionType === 'projected_regular'
                  ? '(ตามลำดับคิวและข้อบังคับ)'
                  : '(บรรจุตามระเบียบวาระการประชุม)'}
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              ตอบแล้วในที่ประชุม (เสร็จสิ้น)
            </span>
            {hasPostponeHistory && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>เลื่อน {postponeHistoryItems.length} ครั้ง</span>
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            id={`btn-postpone-${question.id}`}
            onClick={() => onOpenPostponeModal(question)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs ${
              !isAdmin
                ? 'bg-slate-100/90 hover:bg-amber-50/80 text-slate-600 hover:text-amber-900 border border-slate-200 hover:border-amber-300'
                : question.postponedDate || isPostponedNow
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300'
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
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700 shrink-0" />
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
              <span className="text-[10px] bg-amber-200/90 text-amber-950 px-1.5 py-0.2 rounded font-bold border border-amber-400/80">
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
