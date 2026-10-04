import React from 'react';
import { WeeklySchedule, QuestionItem } from '../types';
import { QuestionCard } from './QuestionCard';
import { formatThaiDateWithDayOfWeek } from '../scheduler';
import { Calendar, AlertTriangle, CheckCircle2, Printer, CalendarOff, Landmark, Sparkles, FileCheck, FileDown, GraduationCap, CalendarCheck, XCircle, ArrowRight } from 'lucide-react';

interface WeeklySectionProps {
  schedule: WeeklySchedule;
  weekIndex: number;
  onOpenPostponeModal: (question: QuestionItem) => void;
  onPrintWeek?: (date: string) => void;
  onDownloadWeekPdf?: (date: string) => void;
  onCancelWeek?: (date: string) => void;
  isAdmin?: boolean;
  sessionClosingDate?: string;
}

export const WeeklySection: React.FC<WeeklySectionProps> = ({
  schedule,
  weekIndex,
  onOpenPostponeModal,
  onPrintWeek,
  onDownloadWeekPdf,
  onCancelWeek,
  isAdmin = true,
  sessionClosingDate,
}) => {
  const isOfficial = schedule.scheduleType === 'official';
  const isCancelled = schedule.isCancelledMeeting === true;
  const isPostponedPresent = schedule.questions.some((q) => q.isPostponedNow || !!q.question.postponedDate);
  const hasEduMinister = schedule.questions.some((q) => q.question.minister?.includes('ศึกษาธิการ'));
  const effectiveWeekNumber = schedule.weekNumber ?? (weekIndex + 1);
  const effectiveWeekIndex = effectiveWeekNumber - 1;
  const isAfterSessionClosing = sessionClosingDate ? schedule.date > sessionClosingDate : false;

  return (
    <section
      id={`weekly-section-${schedule.date}`}
      className={`rounded-xl shadow-sm border overflow-hidden transition-all ${
        isCancelled
          ? 'bg-white border-rose-300 ring-1 ring-rose-500/20'
          : isOfficial
          ? 'bg-white border-blue-200 ring-1 ring-blue-500/10'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Top Notice Banner when meeting is cancelled */}
      {isCancelled && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-bold shadow-xs flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 shrink-0 text-white" />
            <span>
              สถานะ: งดประชุมประจำสัปดาห์นี้ ({schedule.cancelledReason || schedule.holidayName || 'งดการประชุมวุฒิสภา'}) — {schedule.rescheduledToSpecialDate
                ? `เลื่อนระเบียบวาระกระทู้ถามไปจัดในวันประชุมเป็นพิเศษ (${formatThaiDateWithDayOfWeek(schedule.rescheduledToSpecialDate)}) ในสัปดาห์นี้`
                : 'เลื่อนระเบียบวาระกระทู้ถามไปจัดในวันจันทร์ของสัปดาห์ถัดไป'}
            </span>
          </div>
          <span className="bg-rose-800/90 text-rose-100 px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-400/40 shrink-0">
            {schedule.rescheduledToSpecialDate ? 'มีวันนัดประชุมเป็นพิเศษในสัปดาห์นี้' : 'ไม่มีวันนัดประชุมเป็นพิเศษในสัปดาห์นี้'}
          </span>
        </div>
      )}
      {/* Week Header */}
      <div
        className={`px-6 py-4 border-b flex flex-wrap justify-between items-center gap-3 ${
          isCancelled
            ? 'bg-rose-50/80 border-rose-200'
            : isOfficial
            ? 'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-blue-100'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${
              isCancelled
                ? 'bg-rose-600 text-white'
                : isOfficial
                ? 'bg-[#0369a1] text-white'
                : 'bg-indigo-600 text-white'
            }`}
            title={`สัปดาห์ที่ ${effectiveWeekNumber} (W${effectiveWeekNumber})`}
          >
            W{effectiveWeekNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight">
                {isCancelled ? 'คาดการณ์ระเบียบวาระ: ' : isOfficial ? 'ระเบียบวาระ: ' : 'คาดการณ์ระเบียบวาระ: '}
                {schedule.thaiDateFormatted}
                {isCancelled && (
                  <span className="ml-2 text-rose-700 font-bold text-base">
                    (งดประชุม)
                  </span>
                )}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                สัปดาห์ที่ {effectiveWeekNumber}
              </span>

              {/* Status on top of the card */}
              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white border border-rose-700 px-3 py-1 rounded-full text-xs font-bold shadow-xs tracking-wide">
                  <CalendarOff className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>งดประชุม</span>
                </span>
              ) : isOfficial ? (
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

              {schedule.isSpecialMeeting && (
                <span
                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold"
                  title={
                    schedule.replacedHolidayName
                      ? `จัดประชุมเป็นพิเศษแทนวันจันทร์ที่ ${schedule.replacedHolidayDate} (${schedule.replacedHolidayName})`
                      : schedule.specialMeetingReason || 'วันนัดประชุมเป็นพิเศษ'
                  }
                >
                  <CalendarCheck className="w-3 h-3 text-amber-700" />
                  {schedule.replacedHolidayName ? (
                    <span>วันนัดประชุมเป็นพิเศษ (แทนวันหยุด: {schedule.replacedHolidayName})</span>
                  ) : (
                    <span>วันนัดประชุมเป็นพิเศษ {schedule.specialMeetingReason ? `(${schedule.specialMeetingReason})` : ''}</span>
                  )}
                </span>
              )}
              {isAfterSessionClosing && (
                <span
                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold"
                  title={`ระเบียบวาระนี้จัดขึ้นหลังวันปิดสมัยประชุม (${sessionClosingDate})`}
                >
                  <CalendarOff className="w-3 h-3 text-amber-700" />
                  หลังวันปิดสมัยประชุม
                </span>
              )}
            </div>

            {isCancelled ? (
              <p className="text-rose-700 font-semibold text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300 font-bold text-[11px]">
                  สถานะ: งดประชุม
                </span>
                <span>
                  ({schedule.cancelledReason || schedule.holidayName || 'งดการประชุมวุฒิสภา'} &bull; {schedule.rescheduledToSpecialDate
                    ? `เลื่อนระเบียบวาระกระทู้ถามไปจัดในวันประชุมเป็นพิเศษ: ${formatThaiDateWithDayOfWeek(schedule.rescheduledToSpecialDate)} ในสัปดาห์นี้`
                    : 'เลื่อนระเบียบวาระกระทู้ถามไปจัดในวันจันทร์ของสัปดาห์ถัดไป'})
                </span>
              </p>
            ) : (
              <p className="text-slate-500 text-xs mt-0.5">
                สถานะ: {isOfficial ? 'บรรจุตามระเบียบวาระ' : 'คาดการณ์ตามลำดับคิวและข้อบังคับ'}{' '}
                ({schedule.questions.length} / {schedule.capacity} เรื่อง)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasEduMinister && (
            <span
              className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              title="ในสัปดาห์นี้มีกระทู้ถาม รัฐมนตรีว่าการกระทรวงศึกษาธิการ"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
              <span>มีกระทู้ถาม รมว.ศึกษาธิการ</span>
            </span>
          )}

          {schedule.questions.some((q) => q.question.isAnswered || (q.question.rawStatus && q.question.rawStatus.includes('ตอบแล้ว'))) && (
            <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>มีกระทู้ตอบแล้วในวาระ</span>
            </span>
          )}

          {effectiveWeekIndex === 0 && schedule.questions.some((q) => q.isPostponedNow) && (
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

          {effectiveWeekIndex > 0 && isPostponedPresent && isOfficial && (
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
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                isCancelled
                  ? 'bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800'
                  : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
              }`}
              title={
                isCancelled
                  ? 'ยกเลิกการงดประชุม (กลับมาจัดประชุมตามปกติ)'
                  : 'งดการประชุมสัปดาห์นี้ (เลื่อนระเบียบวาระไปจัดวันจันทร์ถัดไป)'
              }
            >
              <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
              <span>{isCancelled ? 'ยกเลิกการงดประชุม' : 'งดประชุมสัปดาห์นี้'}</span>
            </button>
          )}

          {!isCancelled && onDownloadWeekPdf && (
            <button
              type="button"
              onClick={() => onDownloadWeekPdf(schedule.date)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="ดาวน์โหลดเฉพาะระเบียบวาระสัปดาห์นี้เป็นไฟล์ PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
              <span>PDF วาระนี้</span>
            </button>
          )}

          {!isCancelled && onPrintWeek && (
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
        {isCancelled ? (
          <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/70 p-8 text-center shadow-xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 border border-rose-200 shadow-2xs">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold mb-2 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>สัปดาห์นี้งดการประชุมวุฒิสภา</span>
            </div>
            <h4 className="text-base font-bold text-rose-950 mt-1">
              {schedule.cancelledReason || schedule.holidayName || 'งดการประชุมตามระเบียบวาระ'}
            </h4>
            <p className="text-xs text-rose-800 mt-1.5 max-w-lg mx-auto leading-relaxed">
              {schedule.rescheduledToSpecialDate
                ? `สัปดาห์นี้มีวันนัดประชุมเป็นพิเศษใน ${formatThaiDateWithDayOfWeek(schedule.rescheduledToSpecialDate)}`
                : 'สัปดาห์นี้ไม่มีการจัดประชุม และไม่ได้มีวันนัดประชุมเป็นพิเศษในสัปดาห์นี้'}
            </p>
            <div className="mt-4 pt-3 border-t border-rose-200/80 inline-flex items-center gap-2 text-xs font-bold text-rose-900 bg-white/95 px-4 py-2 rounded-lg border border-rose-300 shadow-2xs">
              <ArrowRight className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {schedule.rescheduledToSpecialDate
                  ? `เลื่อนระเบียบวาระกระทู้ถามไปจัดในวันนัดประชุมเป็นพิเศษ (${formatThaiDateWithDayOfWeek(schedule.rescheduledToSpecialDate)}) ในสัปดาห์นี้`
                  : 'เลื่อนระเบียบวาระกระทู้ถามของสัปดาห์นี้ ไปจัดระเบียบวาระกระทู้ถามในวันจันทร์ของสัปดาห์ถัดไป'}
              </span>
            </div>
          </div>
        ) : schedule.questions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-slate-600 font-semibold text-sm">ไม่มีกระทู้ถามที่บรรจุในสัปดาห์นี้</p>
            {effectiveWeekIndex === 0 && (
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
                isAdmin={isAdmin}
                meetingDate={schedule.date}
                meetingThaiDate={schedule.thaiDateFormatted}
                isSpecialMeeting={schedule.isSpecialMeeting}
                specialMeetingReason={schedule.specialMeetingReason}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
