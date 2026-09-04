import React, { useState, useMemo } from 'react';
import { QuestionItem } from './types';
import { INITIAL_QUESTIONS } from './mockData';
import { computeWeeklySchedules, THAI_PUBLIC_HOLIDAYS } from './scheduler';
import { WeeklySection } from './components/WeeklySection';
import { AllQuestionsTable } from './components/AllQuestionsTable';
import { GoogleSheetsImport } from './components/GoogleSheetsImport';
import { PostponeModal } from './components/PostponeModal';
import { HolidayManagerModal } from './components/HolidayManagerModal';
import { PrintReportModal } from './components/PrintReportModal';
import { executePrintReport, generateReportHtml } from './utils/printUtils';
import {
  Calendar,
  Layers,
  Info,
  CheckCircle2,
  CalendarCheck,
  CalendarOff,
  CalendarDays,
  Clock,
  Sliders,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Plus
} from 'lucide-react';

const STORAGE_KEY_HOLIDAYS = 'senate_official_holidays';

export default function App() {
  // 1. All questions state
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);

  // 2. Set of postponed question IDs
  const [postponedIds, setPostponedIds] = useState<Set<string>>(new Set());

  // 3. Official Public Holidays state (persisted to localStorage)
  const [holidays, setHolidays] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading holidays from localStorage', e);
    }
    return THAI_PUBLIC_HOLIDAYS;
  });

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // 4. Print Report Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTargetWeek, setPrintTargetWeek] = useState<string | undefined>(undefined);

  // 5. Postpone Modal State
  const [postponeModalQuestion, setPostponeModalQuestion] = useState<QuestionItem | null>(null);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);

  // 6. Configuration for starting Monday date
  const [startDate, setStartDate] = useState<string>('2026-09-07');
  const [maxWeeks, setMaxWeeks] = useState<number>(6);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string | 'all'>('all');

  // Save / Add / Edit a Holiday
  const handleSaveHoliday = (date: string, name: string, oldDate?: string) => {
    setHolidays((prev) => {
      const next = { ...prev };
      if (oldDate && oldDate !== date) {
        delete next[oldDate];
      }
      next[date] = name;
      try {
        localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Delete a Holiday
  const handleDeleteHoliday = (date: string) => {
    setHolidays((prev) => {
      const next = { ...prev };
      delete next[date];
      try {
        localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Reset Holidays to official Thai defaults
  const handleResetHolidays = () => {
    setHolidays(THAI_PUBLIC_HOLIDAYS);
    try {
      localStorage.removeItem(STORAGE_KEY_HOLIDAYS);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Postpone Modal for a question
  const handleOpenPostponeModal = (question: QuestionItem) => {
    setPostponeModalQuestion(question);
    setIsPostponeModalOpen(true);
  };

  // Save new postponed date for a question
  const handleSavePostponedDate = (questionId: string, targetDateISO: string | undefined) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            postponedDate: targetDateISO,
            status: targetDateISO ? 'postponed' : 'pending',
          };
        }
        return q;
      })
    );

    // If target date is cleared or set, also keep postponedIds in sync
    setPostponedIds((prev) => {
      const next = new Set(prev);
      if (!targetDateISO) {
        next.delete(questionId);
      }
      return next;
    });
  };

  // Compute Weekly Schedules using Core Algorithm with custom/configured holidays
  const { schedules, remainingQuestions, skippedHolidays } = useMemo(() => {
    return computeWeeklySchedules(questions, postponedIds, startDate, maxWeeks, holidays);
  }, [questions, postponedIds, startDate, maxWeeks, holidays]);

  // Filtered schedules if a specific week is clicked in sidebar
  const displayedSchedules = useMemo(() => {
    if (selectedWeekFilter === 'all') return schedules;
    return schedules.filter((s) => s.date === selectedWeekFilter);
  }, [schedules, selectedWeekFilter]);

  // Add new question handler
  const handleAddQuestion = (newQ: Omit<QuestionItem, 'id'>) => {
    const created: QuestionItem = {
      ...newQ,
      id: `q-${Date.now()}`,
    };
    setQuestions((prev) => [...prev, created]);
  };

  // Delete question handler
  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setPostponedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Reorder questions manually (Drag and drop or button ordering)
  const handleReorderQuestions = (reordered: QuestionItem[]) => {
    // Re-assign submittedOrder based on new ordering
    const renumbered = reordered.map((q, idx) => ({
      ...q,
      submittedOrder: idx + 1,
    }));
    setQuestions(renumbered);
  };

  // Reset to default mock data
  const handleResetToDefault = () => {
    setQuestions(INITIAL_QUESTIONS);
    setPostponedIds(new Set());
  };

  // Import from Google Sheets
  const handleImportSheetQuestions = (imported: QuestionItem[]) => {
    setQuestions(imported);
    setPostponedIds(new Set());
  };

  // Open print report modal with optional preselected week
  const handleOpenPrintModal = (targetWeekDate?: string) => {
    setPrintTargetWeek(targetWeekDate);
    setIsPrintModalOpen(true);
  };

  // Quick Direct Print: sends clean official HTML report to printer directly (A4 Landscape, 16pt font)
  const handleDirectQuickPrint = async () => {
    const html = generateReportHtml(schedules, questions, skippedHolidays, {
      reportType: selectedWeekFilter === 'all' ? 'all_weeks' : 'selected_week',
      selectedWeekDate: selectedWeekFilter === 'all' ? undefined : selectedWeekFilter,
      includeSignature: true,
      includeHolidayNotice: true,
      includeSummary: true,
      orientation: 'landscape',
      tableFontSize: 16,
    });
    await executePrintReport(html);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-['Sarabun',sans-serif] flex flex-col">
      {/* Top Header matching Professional Polish theme */}
      <header className="bg-[#1e293b] text-white border-b-4 border-[#0369a1] shadow-md z-30 shrink-0">
        <div className="px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#0369a1] text-white flex items-center justify-center font-bold text-sm tracking-tighter border border-white/20 shadow-inner">
              กท.
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight text-white tracking-tight">
                ระบบบริหารจัดการวาระกระทู้ถามวุฒิสภา
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                กลุ่มการเมือง สำนักงานรัฐมนตรี กระทรวงศึกษาธิการ
              </p>
            </div>
          </div>

          {/* User badge & Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors cursor-pointer"
              title="เพิ่ม ลบ หรือแก้ไขวันหยุดราชการในปฏิทิน"
            >
              <CalendarOff className="w-3.5 h-3.5 text-rose-300" />
              <span>ปฏิทินวันหยุดราชการ</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/80 text-white text-[10px] font-bold">
                {Object.keys(holidays).length}
              </span>
            </button>

            <GoogleSheetsImport onImportQuestions={handleImportSheetQuestions} />
            
            {/* Print Report Button Group */}
            <div className="inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors overflow-hidden">
              <button
                type="button"
                onClick={() => handleOpenPrintModal(selectedWeekFilter !== 'all' ? selectedWeekFilter : undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                title="เปิดหน้าต่างพิมพ์รายงาน (เลือกสัปดาห์ / รูปแบบรายงาน / พรีวิว)"
              >
                <Printer className="w-3.5 h-3.5 text-sky-300" />
                <span>พิมพ์รายงาน</span>
              </button>
              <button
                type="button"
                onClick={handleDirectQuickPrint}
                className="px-2 py-1.5 text-[11px] font-bold text-sky-200 hover:text-white hover:bg-white/20 border-l border-white/20 transition-colors cursor-pointer"
                title="สั่งพิมพ์ออกเครื่องพิมพ์ทันที (Quick Print)"
              >
                พิมพ์ด่วน
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ระบบออนไลน์</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Layout: Sidebar + Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-76 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 space-y-6 shrink-0 lg:overflow-y-auto">
          
          {/* Quick Date Control */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#0369a1]" />
              วันจันทร์เริ่มต้นวาระ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
            />
          </div>

          {/* Calendar Week Nav */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ปฏิทินวาระการประชุม
              </span>
              <button
                type="button"
                onClick={() => setSelectedWeekFilter('all')}
                className={`text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedWeekFilter === 'all' ? 'text-[#0369a1]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ดูทั้งหมด
              </button>
            </div>

            <div className="space-y-1.5">
              {schedules.map((sch, i) => {
                const isSelected = selectedWeekFilter === sch.date;
                const hasPostponed = sch.questions.some((q) => q.isPostponedNow);
                return (
                  <button
                    key={sch.date}
                    type="button"
                    onClick={() => setSelectedWeekFilter(sch.date)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#0369a1] text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="font-semibold">{sch.thaiDateFormatted}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                          สัปดาห์ที่ {i + 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {hasPostponed && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`}></span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sch.questions.length} เรื่อง
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Manage Holidays Button under Week list */}
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50/80 hover:bg-rose-100/80 text-rose-800 border border-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-1.5">
                <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
                <span>จัดการวันหยุดราชการ</span>
              </div>
              <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full font-bold">
                {Object.keys(holidays).length} วัน
              </span>
            </button>

            {/* Skipped Holidays Notice in Sidebar */}
            {skippedHolidays.length > 0 && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1 text-rose-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    วันหยุดนักขัตฤกษ์ (งดประชุม):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(true)}
                    className="text-[10px] text-rose-700 hover:text-rose-900 underline font-semibold cursor-pointer"
                  >
                    แก้ไข
                  </button>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                  {skippedHolidays.map((h) => (
                    <li key={h.date} className="truncate" title={`${h.name} (${h.date})`}>
                      {h.date}: {h.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Overall Stats */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              สรุปสถิติกระทู้ถาม
            </span>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-800">{questions.length}</div>
                <div className="text-[10px] text-slate-500">ยื่นทั้งหมด</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-amber-600">{postponedIds.size}</div>
                <div className="text-[10px] text-slate-500">ขอเลื่อนตอบ</div>
              </div>
            </div>
          </div>

          {/* Rules Card matching theme */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              กฎเกณฑ์การจัดระเบียบวาระ
            </span>
            <ul className="text-xs text-amber-900/90 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>จัดครั้งละ <strong>3 เรื่อง</strong> ทุกวันจันทร์ (ยกเว้นวันหยุดนักขัตฤกษ์)</li>
              <li>กระทู้ที่ขอเลื่อน ได้สิทธิ์เป็น <strong>ลำดับแรก</strong> ในวันที่ขอเลื่อนไปตอบ (เรียงตามลำดับที่ยื่น)</li>
              <li><strong>กระทู้ถามในสัปดาห์แรกของวันเริ่มต้นวาระ:</strong> หากเลื่อนวันตอบ ไม่ต้องจัดลำดับกระทู้ถามตามลำดับที่ยื่นขึ้นมาแทนของกระทู้ถามสัปดาห์แรก แต่ให้คงชื่อเรื่องแสดงไว้ และแสดงสถานะเป็นเลื่อนวันตอบ</li>
              <li>สำหรับสัปดาห์อื่นๆ สามารถจัด <strong>เกิน 3 กระทู้ได้</strong> หากมีการเลื่อนกระทู้ถามมาตอบในวันดังกล่าว</li>
              <li>กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ <strong>ชื่อผู้ตั้งถามห้ามซ้ำกัน</strong> และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ</li>
              <li>จัดตามลำดับปกติในวันเดียวกัน <strong>ห้ามผู้ตั้งถามซ้ำกัน</strong></li>
              <li>เรียงตาม <strong>ลำดับที่ยื่น</strong> อย่างเคร่งครัด</li>
            </ul>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Top Info Notice / Highlight Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#0369a1]"></div>
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {selectedWeekFilter === 'all'
                    ? `แสดงตารางระเบียบวาระครบทั้ง ${schedules.length} สัปดาห์`
                    : `แสดงเฉพาะระเบียบวาระ: วันที่ ${selectedWeekFilter}`}
                </span>
                <span className="text-xs text-slate-500 block">
                  ระบบคำนวณและจัดสรรคิวอัตโนมัติตามข้อบังคับการประชุม
                </span>
              </div>
            </div>

            {selectedWeekFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedWeekFilter('all')}
                className="text-xs font-semibold text-[#0369a1] hover:underline cursor-pointer"
              >
                ดูทุกสัปดาห์
              </button>
            )}
          </div>

          {/* Section 1-4: Weekly Schedules & Cards (วันบรรจุกระทู้ทุกวันจันทร์ + การ์ดกระทู้ 3 เรื่อง) */}
          <div className="space-y-6">
            {displayedSchedules.map((schedule, idx) => (
              <WeeklySection
                key={schedule.date}
                schedule={schedule}
                weekIndex={idx}
                onOpenPostponeModal={handleOpenPostponeModal}
                onPrintWeek={(date) => handleOpenPrintModal(date)}
              />
            ))}
          </div>

          {/* Remaining Questions Banner */}
          {remainingQuestions.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs text-xs text-slate-600 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0369a1]" />
                <span>ยังมีกระทู้ถามรอคิวบรรจุในสัปดาห์ถัดๆ ไปอีก {remainingQuestions.length} เรื่อง</span>
              </div>
              <button
                type="button"
                onClick={() => setMaxWeeks((w) => w + 3)}
                className="text-xs font-bold text-[#0369a1] hover:text-[#075985] underline cursor-pointer"
              >
                + คำนวณเพิ่มอีก 3 สัปดาห์
              </button>
            </div>
          )}

          {/* Section 5: All Submitted Questions Table */}
          <div id="all-questions-table-container" className="pt-2">
            <AllQuestionsTable
              questions={questions}
              postponedIds={postponedIds}
              schedules={schedules}
              onAddQuestion={handleAddQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onReorderQuestions={handleReorderQuestions}
              onResetToDefault={handleResetToDefault}
              onOpenPostponeModal={handleOpenPostponeModal}
            />
          </div>

        </main>
      </div>

      {/* Postpone Date Modal */}
      <PostponeModal
        question={postponeModalQuestion}
        isOpen={isPostponeModalOpen}
        onClose={() => {
          setIsPostponeModalOpen(false);
          setPostponeModalQuestion(null);
        }}
        onSavePostpone={handleSavePostponedDate}
        startDate={startDate}
        holidays={holidays}
      />

      {/* Holiday Manager Modal (เพิ่ม ลบ แก้ไข วันหยุดราชการในปฏิทิน) */}
      <HolidayManagerModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        holidays={holidays}
        onSaveHoliday={handleSaveHoliday}
        onDeleteHoliday={handleDeleteHoliday}
        onResetHolidays={handleResetHolidays}
      />

      {/* Print Report Modal (พิมพ์รายงานราชการมาตรฐาน / พรีวิว & สั่งพิมพ์ออกเครื่องพิมพ์) */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        schedules={schedules}
        allQuestions={questions}
        selectedWeekDate={printTargetWeek}
        skippedHolidays={skippedHolidays}
      />
    </div>
  );
}

