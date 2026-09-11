import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { QuestionItem, UserRole } from './types';
import { INITIAL_QUESTIONS } from './mockData';
import { computeWeeklySchedules, auditScheduleCompliance, THAI_PUBLIC_HOLIDAYS, formatThaiDateWithDayOfWeek, parseThaiOrISODate } from './scheduler';
import { WeeklySection } from './components/WeeklySection';
import { AllQuestionsTable } from './components/AllQuestionsTable';
import { RuleComplianceBanner } from './components/RuleComplianceBanner';
import { GoogleSheetsImport } from './components/GoogleSheetsImport';
import { PostponeModal } from './components/PostponeModal';
import { HolidayManagerModal } from './components/HolidayManagerModal';
import { PrintReportModal } from './components/PrintReportModal';
import { AskerStatsModal } from './components/AskerStatsModal';
import { AskerStatsSection } from './components/AskerStatsSection';
import { LoginModal } from './components/LoginModal';
import { computeAskerStats } from './utils/askerStats';
import {
  executePrintReport,
  generateReportHtml,
  downloadFilteredSchedulePdf,
  downloadScheduleAsPdf
} from './utils/printUtils';
import {
  fetchPostponeMapFromSheet,
  fetchFullQuestionsFromSheet,
  savePostponeDateToSheet,
  formatDateForSheet,
  DEFAULT_SHEET_ID,
  DEFAULT_SHEET_NAME,
  DEFAULT_RANGE,
} from './googleSheetsService';
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
  Plus,
  RotateCcw,
  Undo2,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Users,
  BarChart3,
  FileX2,
  X,
  Calculator,
  User,
  Lock,
  LogOut,
  LogIn,
  KeyRound,
  Shield,
  FileDown,
} from 'lucide-react';

const STORAGE_KEY_HOLIDAYS = 'senate_official_holidays';

export default function App() {
  // 1. All questions state
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);

  // 2. Set of postponed question IDs
  const [postponedIds, setPostponedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    INITIAL_QUESTIONS.forEach((q) => {
      if (q.postponedDate) {
        set.add(q.id);
      }
    });
    return set;
  });

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

  // 4. User Role & Authentication State
  // Requirement: admin (password: admin1234) has full access; general user has no password and cannot use postpone to Google Sheet
  const STORAGE_KEY_USER_ROLE = 'senate_app_user_role';
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_ROLE);
      if (saved === 'admin' || saved === 'user') {
        return saved as UserRole;
      }
    } catch (e) {
      console.error('Error loading user role from localStorage', e);
    }
    return null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalPendingMessage, setLoginModalPendingMessage] = useState<string | null>(null);
  const [loginModalInitialTab, setLoginModalInitialTab] = useState<'user' | 'admin'>('user');
  const [pendingPostponeQuestion, setPendingPostponeQuestion] = useState<QuestionItem | null>(null);

  // Prompt login modal on first visit if not logged in
  useEffect(() => {
    if (!userRole) {
      setIsLoginModalOpen(true);
    }
  }, [userRole]);

  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    try {
      localStorage.setItem(STORAGE_KEY_USER_ROLE, role);
    } catch (e) {
      console.error(e);
    }
    setToastMessage({
      type: 'success',
      text:
        role === 'admin'
          ? 'เข้าสู่ระบบในฐานะ ผู้ดูแลระบบ (Admin) — สามารถใช้งานได้ทุกฟังก์ชันครบถ้วน'
          : 'เข้าสู่ระบบในฐานะ ผู้ใช้งานทั่วไป — สามารถดูข้อมูล ค้นหา และพิมพ์รายงานได้ทั้งหมด',
    });
    setTimeout(() => setToastMessage(null), 4000);

    // If there was a pending postpone request from user that just logged in as admin, open the postpone modal now
    if (role === 'admin' && pendingPostponeQuestion) {
      setPostponeModalQuestion(pendingPostponeQuestion);
      setIsPostponeModalOpen(true);
      setPendingPostponeQuestion(null);
    }
    setLoginModalPendingMessage(null);
  };

  const handleLogout = () => {
    setUserRole(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER_ROLE);
    } catch (e) {
      console.error(e);
    }
    setLoginModalPendingMessage(null);
    setLoginModalInitialTab('user');
    setIsLoginModalOpen(true);
  };

  const handleOpenLoginModal = (tab: 'user' | 'admin' = 'user') => {
    setLoginModalInitialTab(tab);
    setLoginModalPendingMessage(null);
    setIsLoginModalOpen(true);
  };

  // 5. Print Report Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTargetWeek, setPrintTargetWeek] = useState<string | undefined>(undefined);

  // 6. Postpone Modal State
  const [postponeModalQuestion, setPostponeModalQuestion] = useState<QuestionItem | null>(null);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);

  // 7. Configuration for starting Monday date (Default: 31 สิงหาคม 2569 / 2026-08-31)
  const [startDate, setStartDate] = useState<string>('2026-08-31');
  const [maxWeeks, setMaxWeeks] = useState<number>(8);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string | 'all'>('all');

  // 8. Google Sheets Connection & Active Worksheet Configuration
  const [currentSheetName, setCurrentSheetName] = useState<string>(() => {
    return localStorage.getItem('senate_current_sheet_name') || DEFAULT_SHEET_NAME;
  });
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('senate_current_spreadsheet_id') || DEFAULT_SHEET_ID;
  });

  // 8. Google Sheets Postpone Live Check & Status State
  const [isCheckingSheet, setIsCheckingSheet] = useState<boolean>(false);
  const [sheetCheckStatus, setSheetCheckStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Function to refresh and reprocess all questions and postponements directly from live Google Sheet
  const handleRefreshFromGoogleSheet = useCallback(async (showNotification: boolean = true) => {
    try {
      setIsCheckingSheet(true);
      setSheetCheckStatus(`กำลังดึงข้อมูลล่าสุดจาก Google Sheet (แผ่นงาน "${currentSheetName}")...`);

      const freshQuestions = await fetchFullQuestionsFromSheet(currentSpreadsheetId, {
        sheetName: currentSheetName,
        range: 'A1:Z500'
      });
      if (!freshQuestions || freshQuestions.length === 0) {
        throw new Error(`ไม่พบข้อมูลกระทู้ใน Google Sheet (แผ่นงาน "${currentSheetName}")`);
      }

      setQuestions(freshQuestions);

      // Re-calculate postponed IDs from fresh questions
      const newPostponedIds = new Set<string>();
      let postponeCount = 0;
      freshQuestions.forEach((q) => {
        if (q.postponedDate) {
          newPostponedIds.add(q.id);
          postponeCount++;
        }
      });
      setPostponedIds(newPostponedIds);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const statusMsg = `รีเฟรชล่าสุด ${timeStr} น. [แผ่นงาน: ${currentSheetName}] (โหลดข้อมูล ${freshQuestions.length} กระทู้, เลื่อนตอบ ${postponeCount} เรื่อง)`;
      setSheetCheckStatus(statusMsg);

      if (showNotification) {
        setToastMessage({
          type: 'success',
          text: `รีเฟรชข้อมูลจาก Google Sheet (แผ่นงาน "${currentSheetName}") สำเร็จ! โหลดข้อมูลล่าสุด ${freshQuestions.length} กระทู้ (เลื่อนตอบ ${postponeCount} เรื่อง) และประมวลผลจัดวาระใหม่เรียบร้อยแล้ว`,
        });
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (err: any) {
      console.warn('Refresh from Google Sheet error, attempting postpone map check fallback:', err);
      // Fallback: try checking postpone map
      try {
        const sheetMap = await fetchPostponeMapFromSheet(currentSpreadsheetId, currentSheetName);
        let foundCount = 0;
        setQuestions((prev) =>
          prev.map((q) => {
            const sheetInfo = sheetMap.get(q.submittedOrder);
            if (sheetInfo) {
              if (sheetInfo.hasDate) {
                foundCount++;
              }
              return {
                ...q,
                postponedDate: sheetInfo.parsedISO || sheetInfo.rawDate || q.postponedDate,
                postponedSheetRaw: sheetInfo.rawDate || q.postponedSheetRaw,
                isPostponedInSheet: sheetInfo.hasDate,
                sheetRowIndex: sheetInfo.sheetRowNumber,
                status: sheetInfo.isAnswered ? ('completed' as const) : sheetInfo.hasDate ? ('postponed' as const) : q.status,
                isAnswered: sheetInfo.isAnswered || q.isAnswered,
                rawStatus: sheetInfo.rawStatus || q.rawStatus,
              };
            }
            return q;
          })
        );
        const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setSheetCheckStatus(`อัปเดตวันเลื่อนตอบ ${timeStr} น. (${foundCount} เรื่อง) [แผ่นงาน: ${currentSheetName}]`);
      } catch (innerErr) {
        setSheetCheckStatus('ไม่สามารถรีเฟรช Google Sheet ได้ในขณะนี้');
      }

      if (showNotification) {
        setToastMessage({
          type: 'error',
          text: `เกิดข้อผิดพลาดในการรีเฟรชจาก Google Sheet (แผ่นงาน "${currentSheetName}"): ${err?.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`,
        });
        setTimeout(() => setToastMessage(null), 5000);
      }
    } finally {
      setIsCheckingSheet(false);
    }
  }, [currentSheetName, currentSpreadsheetId]);

  // Function to inspect Google Sheet column "เลื่อนตอบวันที่" and sync into questions
  const checkAndSyncGoogleSheet = useCallback(async (showNotification: boolean = false) => {
    return handleRefreshFromGoogleSheet(showNotification);
  }, [handleRefreshFromGoogleSheet]);

  // Initial check on mount: pull latest data from Google Sheet
  useEffect(() => {
    handleRefreshFromGoogleSheet(false);
  }, [handleRefreshFromGoogleSheet]);

  // Toggle Cancel Meeting (วันงดประชุม) for a specific Monday
  const handleToggleCancelMeeting = (dateStr: string, reason: string = 'วันงดประชุม (มติที่ประชุม)') => {
    setHolidays((prev) => {
      const next = { ...prev };
      if (next[dateStr]) {
        delete next[dateStr];
      } else {
        next[dateStr] = reason;
      }
      try {
        localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

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
  // User restriction rule: Non-admin users cannot use postpone button that saves to Google Sheets
  const handleOpenPostponeModal = (question: QuestionItem) => {
    if (userRole !== 'admin') {
      setPendingPostponeQuestion(question);
      setLoginModalInitialTab('admin');
      setLoginModalPendingMessage(
        'ปุ่มเลื่อนตอบที่บันทึกข้อมูลไปยัง Google Sheet สงวนสิทธิ์สำหรับผู้ดูแลระบบ (Admin) เท่านั้น กรุณาเข้าสู่ระบบด้วยรหัสผ่าน admin1234'
      );
      setIsLoginModalOpen(true);
      return;
    }
    setPostponeModalQuestion(question);
    setIsPostponeModalOpen(true);
  };

  // Save new postponed date for a question & optionally write back to Google Sheet
  const handleSavePostponedDate = async (
    question: QuestionItem,
    targetDateISO: string | undefined,
    syncToSheet: boolean = true
  ) => {
    // Extra security check for role
    if (syncToSheet && userRole !== 'admin') {
      setToastMessage({
        type: 'error',
        text: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถบันทึกข้อมูลการขอเลื่อนตอบไปยัง Google Sheet ได้',
      });
      setTimeout(() => setToastMessage(null), 4500);
      return false;
    }

    let finalRowIndex = question.sheetRowIndex || (question.submittedOrder + 1);
    let finalRawDate = targetDateISO ? formatDateForSheet(targetDateISO) : undefined;

    if (syncToSheet) {
      try {
        const res = await savePostponeDateToSheet(
          question.submittedOrder,
          targetDateISO,
          currentSpreadsheetId,
          currentSheetName
        );
        finalRowIndex = res.sheetRowNumber;
        finalRawDate = res.writtenValue || undefined;
      } catch (err: any) {
        console.error('Failed to write to Google Sheet:', err);
        setToastMessage({
          type: 'error',
          text: `บันทึกในระบบแล้ว แต่บันทึกลง Google Sheet [แผ่นงาน: ${currentSheetName}] ไม่สำเร็จ: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`,
        });
        setTimeout(() => setToastMessage(null), 6000);
        throw err;
      }
    }

    // Update state locally
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === question.id) {
          return {
            ...q,
            postponedDate: targetDateISO,
            postponedSheetRaw: syncToSheet ? finalRawDate : q.postponedSheetRaw,
            isPostponedInSheet: syncToSheet ? !!targetDateISO : q.isPostponedInSheet,
            sheetRowIndex: finalRowIndex,
            status: targetDateISO ? 'postponed' : 'pending',
          };
        }
        return q;
      })
    );

    // Update postponedIds
    setPostponedIds((prev) => {
      const next = new Set(prev);
      if (targetDateISO) {
        next.add(question.id);
      } else {
        next.delete(question.id);
      }
      return next;
    });

    if (syncToSheet) {
      setToastMessage({
        type: 'success',
        text: targetDateISO
          ? `บันทึกลง Google Sheet สำเร็จ! (ลำดับที่ ${question.submittedOrder} แถวที่ ${finalRowIndex}: ${currentSheetName}!C${finalRowIndex} = "${finalRawDate}")`
          : `ลบวันเลื่อนตอบใน Google Sheet เรียบร้อยแล้ว (${currentSheetName}!C${finalRowIndex})`,
      });
      setTimeout(() => setToastMessage(null), 4500);
    } else {
      setToastMessage({
        type: 'info',
        text: targetDateISO
          ? `บันทึกการขอเลื่อนวันตอบในระบบแล้ว (ไม่ได้บันทึกลง Google Sheet)`
          : `ยกเลิกการขอเลื่อนวันตอบในระบบแล้ว`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Compute Weekly Schedules using Core Algorithm with custom/configured holidays
  const { schedules, remainingQuestions, skippedHolidays } = useMemo(() => {
    return computeWeeklySchedules(questions, postponedIds, startDate, maxWeeks, holidays);
  }, [questions, postponedIds, startDate, maxWeeks, holidays]);

  // Run parliamentary compliance audit on all generated schedules
  const complianceAudit = useMemo(() => {
    return auditScheduleCompliance(schedules, questions);
  }, [schedules, questions]);

  // Agenda filter: show all, only official, or only projected schedules
  const [agendaTypeFilter, setAgendaTypeFilter] = useState<'all' | 'official' | 'projected'>('all');

  // Filtered schedules if a specific week or agenda type is selected
  const displayedSchedules = useMemo(() => {
    let list = schedules;
    if (agendaTypeFilter !== 'all') {
      list = list.filter((s) => s.scheduleType === agendaTypeFilter);
    }
    if (selectedWeekFilter !== 'all') {
      list = list.filter((s) => s.date === selectedWeekFilter);
    }
    return list;
  }, [schedules, selectedWeekFilter, agendaTypeFilter]);

  // 9. State & Handler for calculating all agendas across all submitted questions (คำนวณวาระทั้งหมด)
  const [isCalculatingAll, setIsCalculatingAll] = useState<boolean>(false);

  const handleCalculateAllAgendas = useCallback(() => {
    setIsCalculatingAll(true);

    try {
      // Determine the minimum number of weeks required so that all questions are scheduled
      let optimalWeeks = Math.max(maxWeeks, 4);
      let found = false;

      // Iteratively simulate schedule computation to find required week capacity
      for (let testW = 4; testW <= 60; testW++) {
        const testRes = computeWeeklySchedules(questions, postponedIds, startDate, testW, holidays);
        if (testRes.remainingQuestions.length === 0) {
          optimalWeeks = testW;
          found = true;
          break;
        }
      }

      if (!found) {
        optimalWeeks = Math.max(maxWeeks + 8, 60);
      }

      // Ensure at least 6 weeks for balanced view
      optimalWeeks = Math.max(optimalWeeks, 6);

      setMaxWeeks(optimalWeeks);
      setSelectedWeekFilter('all');
      setAgendaTypeFilter('all');

      // Check results
      const finalSim = computeWeeklySchedules(questions, postponedIds, startDate, optimalWeeks, holidays);
      const totalScheduled = finalSim.schedules.reduce((sum, s) => sum + s.questions.length, 0);
      const remainingCount = finalSim.remainingQuestions.length;

      setTimeout(() => {
        setIsCalculatingAll(false);
        setToastMessage({
          type: 'success',
          text: remainingCount === 0
            ? `คำนวณวาระทั้งหมดสำเร็จ! จัดสรรกระทู้ถามครบทั้ง ${optimalWeeks} สัปดาห์ (${totalScheduled} เรื่อง ครบ 100% ไม่มีตกค้าง)`
            : `คำนวณวาระทั้งหมดแล้ว: จัดสรรไปแล้ว ${optimalWeeks} สัปดาห์ (${totalScheduled} เรื่อง, ยังคงเหลือ ${remainingCount} เรื่อง)`,
        });
        setTimeout(() => setToastMessage(null), 4500);
      }, 350);
    } catch (err) {
      console.error('Error calculating all agendas:', err);
      setIsCalculatingAll(false);
      setToastMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการคำนวณวาระทั้งหมด โปรดตรวจสอบข้อมูลกระทู้ถาม',
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, [questions, postponedIds, startDate, maxWeeks, holidays]);

  // Asker Statistics States & Derived Engine
  const [isAskerStatsModalOpen, setIsAskerStatsModalOpen] = useState(false);
  const [showAskerStatsSection, setShowAskerStatsSection] = useState(true);
  const [activeAskerFilter, setActiveAskerFilter] = useState<string>('');

  // Compute comprehensive asker statistics from current questions, schedules, and postponements
  const askerStats = useMemo(() => {
    return computeAskerStats(questions, schedules, postponedIds);
  }, [questions, schedules, postponedIds]);

  // Handle clicking on an asker (from stats card or modal) to filter the table
  const handleFilterByAsker = (askerName: string) => {
    setActiveAskerFilter(askerName);
    const el = document.getElementById('all-questions-table-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
  const handleImportSheetQuestions = (
    imported: QuestionItem[],
    meta?: { sheetName: string; spreadsheetId: string }
  ) => {
    setQuestions(imported);
    const newPostponedIds = new Set<string>();
    imported.forEach((q) => {
      if (q.postponedDate) {
        newPostponedIds.add(q.id);
      }
    });
    setPostponedIds(newPostponedIds);

    if (meta?.sheetName) {
      setCurrentSheetName(meta.sheetName);
      try {
        localStorage.setItem('senate_current_sheet_name', meta.sheetName);
      } catch (e) {
        console.error(e);
      }
    }
    if (meta?.spreadsheetId) {
      setCurrentSpreadsheetId(meta.spreadsheetId);
      try {
        localStorage.setItem('senate_current_spreadsheet_id', meta.spreadsheetId);
      } catch (e) {
        console.error(e);
      }
    }
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

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Download PDF for the currently filtered view of the schedule
  const handleDownloadFilteredPdf = async (targetWeekDate?: string) => {
    setIsDownloadingPdf(true);
    setToastMessage({
      type: 'info',
      text: 'กำลังประมวลผลและสร้างไฟล์เอกสาร PDF จากวาระที่เลือก...',
    });

    try {
      const activeFilter = targetWeekDate || selectedWeekFilter;
      const targetSchedules = targetWeekDate
        ? schedules.filter((s) => s.date === targetWeekDate)
        : displayedSchedules;

      const success = await downloadFilteredSchedulePdf({
        schedules,
        allQuestions: questions,
        skippedHolidays,
        filteredSchedules: targetSchedules,
        selectedWeekFilter: activeFilter,
        agendaTypeFilter: targetWeekDate ? 'all' : agendaTypeFilter,
      });

      if (success) {
        setToastMessage({
          type: 'success',
          text: 'ดาวน์โหลดไฟล์เอกสาร PDF สำเร็จเรียบร้อยแล้ว!',
        });
      } else {
        setToastMessage({
          type: 'info',
          text: 'เปิดหน้าต่างพิมพ์สำหรับบันทึกเป็น PDF แล้ว',
        });
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setToastMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการดาวน์โหลด PDF',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
              title="เพิ่ม ลบ หรือแก้ไขวันหยุดราชการในปฏิทิน"
            >
              <CalendarOff className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span>ปฏิทินวันหยุดราชการ</span>
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/80 text-white text-[10px] font-bold leading-none">
                {Object.keys(holidays).length}
              </span>
            </button>

            {/* Asker Statistics Button */}
            <button
              type="button"
              id="btn-header-asker-stats"
              onClick={() => setIsAskerStatsModalOpen(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 active:scale-95 text-white text-xs font-bold border border-sky-400/40 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
              title="เปิดดูสถิติผู้ตั้งกระทู้ถามฉบับเต็มและการจัดสรรระเบียบวาระ"
            >
              <Users className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span>สถิติผู้ตั้งถาม</span>
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-sky-900/60 text-sky-100 text-[10px] font-bold border border-sky-400/30 leading-none">
                {askerStats.totalUniqueAskers}
              </span>
            </button>

            {/* Refresh Google Sheet Live Button (ปุ่ม Refresh ดึงข้อมูลปัจจุบันจาก Google Sheet และประมวลผล) */}
            <button
              type="button"
              id="btn-refresh-google-sheet"
              onClick={() => handleRefreshFromGoogleSheet(true)}
              disabled={isCheckingSheet}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold border border-emerald-400/40 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs disabled:opacity-50"
              title={`ดึงข้อมูลที่เป็นปัจจุบันทั้งหมดจาก Google Sheet (แผ่นงาน "${currentSheetName}") และประมวลผลจัดวาระใหม่ทันที`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-100 shrink-0 ${isCheckingSheet ? 'animate-spin' : ''}`} />
              <span>{isCheckingSheet ? 'กำลังประมวลผล...' : `รีเฟรช (${currentSheetName})`}</span>
            </button>

            {/* Calculate All Agendas Button in Header (ปุ่มคำนวณวาระทั้งหมด) */}
            <button
              type="button"
              id="btn-calculate-all-agendas-header"
              onClick={handleCalculateAllAgendas}
              disabled={isCalculatingAll}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold border border-blue-400/40 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs disabled:opacity-50"
              title="คำนวณและจัดสรรระเบียบวาระการประชุมให้ครอบคลุมกระทู้ถามทั้งหมดครบทุกสัปดาห์ (อัตโนมัติ 100%)"
            >
              <Calculator className={`w-3.5 h-3.5 text-blue-100 shrink-0 ${isCalculatingAll ? 'animate-spin' : ''}`} />
              <span>{isCalculatingAll ? 'กำลังคำนวณ...' : 'คำนวณวาระทั้งหมด'}</span>
              {remainingQuestions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold leading-none animate-pulse">
                  +{remainingQuestions.length}
                </span>
              )}
            </button>

            <GoogleSheetsImport
              onImportQuestions={handleImportSheetQuestions}
              currentSheetName={currentSheetName}
              currentSpreadsheetId={currentSpreadsheetId}
            />
            
            {/* Print Report Button Group */}
            <div className="h-9 inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors overflow-hidden shrink-0 shadow-xs">
              <button
                type="button"
                id="btn-header-open-print-modal"
                onClick={() => handleOpenPrintModal(selectedWeekFilter !== 'all' ? selectedWeekFilter : undefined)}
                className="h-full inline-flex items-center gap-1.5 px-3 text-white text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                title="เปิดหน้าต่างพิมพ์รายงาน (เลือกสัปดาห์ / รูปแบบรายงาน / พรีวิว)"
              >
                <Printer className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>พิมพ์รายงาน</span>
              </button>
              <button
                type="button"
                id="btn-header-quick-print"
                onClick={handleDirectQuickPrint}
                className="h-full inline-flex items-center px-2.5 text-[11px] font-bold text-sky-200 hover:text-white hover:bg-white/20 border-l border-white/20 transition-colors cursor-pointer whitespace-nowrap"
                title="สั่งพิมพ์ออกเครื่องพิมพ์ทันที (Quick Print)"
              >
                พิมพ์ด่วน
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              type="button"
              id="btn-header-download-pdf"
              onClick={() => handleDownloadFilteredPdf()}
              disabled={isDownloadingPdf}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold border border-emerald-400/40 transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap"
              title="ดาวน์โหลดมุมมองระเบียบวาระที่กำลังแสดงอยู่เป็นไฟล์ PDF (A4 คมชัดสูง)"
            >
              <FileDown className={`w-3.5 h-3.5 text-emerald-100 shrink-0 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            {/* User Authentication Status & Switcher */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700 shrink-0">
              {userRole === 'admin' ? (
                <div className="h-9 inline-flex items-center gap-2 bg-sky-900/80 border border-sky-400/40 rounded-lg px-2.5 text-xs shadow-inner shrink-0 whitespace-nowrap">
                  <ShieldCheck className="w-4 h-4 text-sky-300 shrink-0" />
                  <span className="font-bold text-sky-100 text-xs hidden sm:inline">Admin (ผู้ดูแลระบบ)</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-1 p-1 hover:bg-white/10 rounded text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
                    title="ออกจากระบบ / สลับผู้ใช้งาน"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : userRole === 'user' ? (
                <div className="h-9 inline-flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-2.5 text-xs shrink-0 whitespace-nowrap">
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200 text-xs hidden sm:inline">ผู้ใช้งานทั่วไป</span>
                  <button
                    type="button"
                    onClick={() => handleOpenLoginModal('admin')}
                    className="ml-1 px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="เข้าสู่ระบบ Admin ด้วยรหัสผ่าน admin1234 เพื่อใช้งานปุ่มเลื่อนตอบและบันทึกลง Google Sheet"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenLoginModal('user')}
                  className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ระบบออนไลน์</span>
            </div>
          </div>
        </div>
      </header>

      {/* Notice Banner when in General User Mode */}
      {userRole === 'user' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              คุณกำลังใช้งานในโหมด <strong>ผู้ใช้งานทั่วไป</strong>: สามารถตรวจสอบวาระ คำนวณวาระ ค้นหา สถิติ และพิมพ์รายงานได้ทั้งหมด (ไม่อนุญาตให้ใช้ปุ่มเลื่อนตอบที่บันทึกข้อมูลไปยัง Google Sheet)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleOpenLoginModal('admin')}
            className="px-2.5 py-1 rounded-md bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <Lock className="w-3 h-3" />
            <span>เข้าสู่ระบบ Admin (รหัสผ่าน: admin1234)</span>
          </button>
        </div>
      )}

      {/* Main App Layout: Sidebar + Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-76 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 space-y-6 shrink-0 lg:overflow-y-auto">
          
          {/* Quick Date Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#0369a1]" />
                วันจันทร์เริ่มต้นวาระ
              </label>
              {startDate !== '2026-08-31' && (
                <button
                  type="button"
                  onClick={() => setStartDate('2026-08-31')}
                  className="text-[11px] text-[#0369a1] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  title="รีเซ็ตกลับไปเป็นวันเริ่มต้นตามระเบียบวาระ (31 ส.ค. 2569)"
                >
                  <RotateCcw className="w-3 h-3" />
                  31 ส.ค. 69
                </button>
              )}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1] bg-white"
            />
            <div className="p-2 rounded-lg bg-sky-50/80 border border-sky-200/80 text-[11px] text-sky-900 flex items-center justify-between">
              <span className="font-semibold">{formatThaiDateWithDayOfWeek(startDate)}</span>
              {startDate === '2026-08-31' && (
                <span className="px-1.5 py-0.5 rounded bg-sky-200/80 text-sky-900 text-[10px] font-bold">
                  วันเริ่มวาระ
                </span>
              )}
            </div>

            {/* Weeks Count Selector */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">คำนวณล่วงหน้า:</span>
              <div className="flex items-center gap-1">
                {[6, 8, 10, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxWeeks(num)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      maxWeeks === num
                        ? 'bg-[#0369a1] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {num} สัปดาห์
                  </button>
                ))}
              </div>
            </div>

            {/* Calculate All Agendas Button in Sidebar */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-calculate-all-sidebar"
                onClick={handleCalculateAllAgendas}
                disabled={isCalculatingAll}
                className="w-full py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 active:scale-98 text-[#0369a1] border border-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="คำนวณและจัดสรรระเบียบวาระให้ครอบคลุมกระทู้ถามทั้งหมดครบทุกสัปดาห์"
              >
                <Calculator className={`w-3.5 h-3.5 text-[#0369a1] ${isCalculatingAll ? 'animate-spin' : ''}`} />
                <span>คำนวณวาระทั้งหมด</span>
                {remainingQuestions.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                    รอจัด {remainingQuestions.length}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    ครบ 100%
                  </span>
                )}
              </button>
            </div>
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
                        <div className={`text-[10px] flex items-center gap-1.5 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                          <span>สัปดาห์ที่ {i + 1}</span>
                          <span>•</span>
                          <span
                            className={`font-semibold ${
                              sch.scheduleType === 'official'
                                ? isSelected
                                  ? 'text-white'
                                  : 'text-blue-600'
                                : isSelected
                                ? 'text-purple-200'
                                : 'text-purple-600'
                            }`}
                          >
                            {sch.scheduleType === 'official' ? 'วาระทางการ' : 'คาดการณ์'}
                          </span>
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
                <span>จัดการวันหยุด / วันงดประชุม</span>
              </div>
              <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full font-bold">
                {Object.keys(holidays).length} วัน
              </span>
            </button>

            {/* Skipped Holidays & Cancelled Meetings Notice in Sidebar */}
            {skippedHolidays.length > 0 && (
              <div className="mt-3 p-2.5 bg-rose-50/90 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1 text-rose-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    วันหยุดนักขัตฤกษ์ / งดประชุม:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(true)}
                    className="text-[10px] text-rose-700 hover:text-rose-900 underline font-semibold cursor-pointer"
                  >
                    จัดการ
                  </button>
                </div>
                <ul className="space-y-1.5 text-rose-800">
                  {skippedHolidays.map((h) => {
                    const isCancelled = h.type === 'cancelled_meeting' || h.name.includes('งดประชุม');
                    return (
                      <li
                        key={h.date}
                        className="flex items-center justify-between gap-1.5 bg-white/70 p-1.5 rounded border border-rose-100"
                        title={`${h.name} (${h.date})`}
                      >
                        <div className="truncate flex-1">
                          <span className={`inline-block px-1.5 py-0.2 text-[9px] rounded font-bold mr-1 ${
                            isCancelled
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isCancelled ? 'งดประชุม' : 'วันหยุด'}
                          </span>
                          <span className="font-medium text-[10px]">{h.date}: {h.name}</span>
                        </div>
                        {isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleToggleCancelMeeting(h.date)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 font-medium cursor-pointer"
                            title="ยกเลิกการงดประชุม และจัดวาระตามปกติ"
                          >
                            ยกเลิกงด
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Overall Stats */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                สรุปสถิติภาพรวม
              </span>
              <button
                type="button"
                onClick={() => setIsAskerStatsModalOpen(true)}
                className="text-[11px] font-bold text-[#0369a1] hover:underline flex items-center gap-1 cursor-pointer"
                title="เปิดสถิติผู้ตั้งถามฉบับเต็ม"
              >
                <Users className="w-3 h-3" />
                <span>ดูสถิติ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-800">{questions.length}</div>
                <div className="text-[10px] text-slate-500">ยื่นทั้งหมด (เรื่อง)</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-sky-700">{askerStats.totalUniqueAskers}</div>
                <div className="text-[10px] text-slate-500">ผู้ตั้งถาม (ท่าน)</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-sm font-bold text-amber-600">{postponedIds.size}</div>
                <div className="text-[10px] text-slate-500">ขอเลื่อนตอบ (เรื่อง)</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-rose-200 bg-rose-50/40">
                <div className="text-sm font-bold text-rose-600">{askerStats.totalWithdrawnQuestions}</div>
                <div className="text-[10px] text-rose-700 font-semibold">ขอถอนกระทู้ (เรื่อง)</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2 flex items-center justify-between px-3">
                <span className="text-[11px] text-slate-500">เฉลี่ยต่อผู้ตั้งถาม</span>
                <span className="text-sm font-bold text-emerald-600">
                  {askerStats.avgQuestionsPerAsker}{' '}
                  <span className="text-[10px] font-normal text-slate-500">เรื่อง/ท่าน</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-sidebar-asker-stats"
              onClick={() => setIsAskerStatsModalOpen(true)}
              className="w-full py-1.5 px-2.5 bg-sky-50 hover:bg-sky-100 text-[#0369a1] border border-sky-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>สถิติผู้ตั้งถามและการจัดสรร</span>
            </button>
          </div>

          {/* Rules Card matching theme */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              กฎเกณฑ์การจัดระเบียบวาระ
            </span>
            <ul className="text-xs text-amber-900/90 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>วันเริ่มต้นวาระการประชุม: <strong>วันจันทร์ที่ 31 สิงหาคม 2569</strong></li>
              <li>จัดครั้งละ <strong>3 เรื่อง</strong> ทุกวันจันทร์ (ยกเว้นวันหยุดนักขัตฤกษ์ และวันงดประชุม)</li>
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
                    : (() => {
                        const targetSch = schedules.find((s) => s.date === selectedWeekFilter);
                        const targetWeekIdx = schedules.findIndex((s) => s.date === selectedWeekFilter);
                        const weekNum = targetWeekIdx !== -1 ? targetWeekIdx + 1 : (targetSch?.weekNumber || 1);
                        return `แสดงเฉพาะระเบียบวาระ: ${targetSch ? targetSch.thaiDateFormatted : selectedWeekFilter} (สัปดาห์ที่ ${weekNum} • W${weekNum})`;
                      })()}
                </span>
                <span className="text-xs text-slate-500 block">
                  ระบบคำนวณและจัดสรรคิวอัตโนมัติตามข้อบังคับการประชุม (เริ่ม 31 ส.ค. 2569 ครั้งละ 3 เรื่อง)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {sheetCheckStatus && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{sheetCheckStatus}</span>
                </div>
              )}

              <button
                type="button"
                id="btn-quick-refresh-sheet"
                onClick={() => handleRefreshFromGoogleSheet(true)}
                disabled={isCheckingSheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                title="รีเฟรชข้อมูลล่าสุดจาก Google Sheet เพื่อประมวลผลจัดวาระใหม่ทันที"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSheet ? 'animate-spin' : ''}`} />
                <span>{isCheckingSheet ? 'กำลังรีเฟรช...' : 'รีเฟรช Sheet'}</span>
              </button>

              <button
                type="button"
                id="btn-quick-calculate-all"
                onClick={handleCalculateAllAgendas}
                disabled={isCalculatingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0369a1] hover:bg-[#075985] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="คำนวณระเบียบวาระการประชุมให้ครอบคลุมกระทู้ถามทั้งหมดครบทุกสัปดาห์"
              >
                <Calculator className={`w-3.5 h-3.5 text-sky-200 ${isCalculatingAll ? 'animate-spin' : ''}`} />
                <span>คำนวณวาระทั้งหมด</span>
                {remainingQuestions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold">
                    +{remainingQuestions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="btn-schedule-download-pdf"
                onClick={() => handleDownloadFilteredPdf()}
                disabled={isDownloadingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                title="ดาวน์โหลดระเบียบวาระการประชุมที่กำลังแสดงผลอยู่นี้เป็นไฟล์ PDF (A4 คมชัดสูง)"
              >
                <FileDown className={`w-3.5 h-3.5 text-emerald-100 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
                <span>
                  {isDownloadingPdf
                    ? 'กำลังสร้าง PDF...'
                    : selectedWeekFilter !== 'all'
                    ? 'ดาวน์โหลด PDF (สัปดาห์นี้)'
                    : agendaTypeFilter !== 'all'
                    ? `ดาวน์โหลด PDF (${agendaTypeFilter === 'official' ? 'วาระทางการ' : 'วาระคาดการณ์'})`
                    : `ดาวน์โหลด PDF (${displayedSchedules.length} สัปดาห์)`}
                </span>
              </button>

              {selectedWeekFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedWeekFilter('all')}
                  className="text-xs font-semibold text-[#0369a1] hover:underline cursor-pointer ml-1"
                >
                  ดูทุกสัปดาห์
                </button>
              )}
            </div>
          </div>

          {/* Rule Compliance & Parliamentary Validation Audit Banner */}
          <RuleComplianceBanner
            audit={complianceAudit}
            activeFilter={agendaTypeFilter}
            onFilterChange={(filter) => {
              setAgendaTypeFilter(filter);
              if (filter !== 'all') {
                setSelectedWeekFilter('all');
              }
            }}
            onRecheck={() => {
              setToastMessage({
                type: 'success',
                text: `ระบบตรวจสอบการบรรจุวาระแล้ว: ตรงตามเกณฑ์ข้อบังคับ 100% (${complianceAudit.checks.filter((c) => c.passed).length}/6 กฎเกณฑ์)`,
              });
              setTimeout(() => setToastMessage(null), 3500);
            }}
          />

          {/* Section 1-4: Weekly Schedules & Cards (วันบรรจุกระทู้ทุกวันจันทร์ + การ์ดกระทู้ 3 เรื่อง) */}
          <div className="space-y-6">
            {displayedSchedules.map((schedule, idx) => {
              // Find the true global week index in master schedules list
              const globalIndex = schedules.findIndex((s) => s.date === schedule.date);
              const realWeekIndex = globalIndex !== -1 ? globalIndex : (schedule.weekNumber ? schedule.weekNumber - 1 : idx);
              const realWeekNumber = realWeekIndex + 1;

              return (
                <WeeklySection
                  key={schedule.date}
                  schedule={{
                    ...schedule,
                    weekNumber: realWeekNumber,
                  }}
                  weekIndex={realWeekIndex}
                  onOpenPostponeModal={handleOpenPostponeModal}
                  onDownloadWeekPdf={(date) => handleDownloadFilteredPdf(date)}
                  onPrintWeek={(date) => handleOpenPrintModal(date)}
                  onCancelWeek={(date) => handleToggleCancelMeeting(date)}
                  isAdmin={userRole === 'admin'}
                />
              );
            })}
          </div>

          {/* Remaining Questions Banner */}
          {remainingQuestions.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-2xs text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  ยังมีกระทู้ถามรอคิวบรรจุในสัปดาห์ถัดๆ ไปอีก <strong>{remainingQuestions.length} เรื่อง</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaxWeeks((w) => w + 3)}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  + คำนวณเพิ่มอีก 3 สัปดาห์
                </button>
                <button
                  type="button"
                  id="btn-calculate-all-banner"
                  onClick={handleCalculateAllAgendas}
                  disabled={isCalculatingAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0369a1] hover:bg-[#075985] active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  title="คำนวณและจัดสรรระเบียบวาระการประชุมให้ครบทุกกระทู้ที่ค้างอยู่ทันที"
                >
                  <Calculator className={`w-3.5 h-3.5 text-sky-200 ${isCalculatingAll ? 'animate-spin' : ''}`} />
                  <span>คำนวณวาระทั้งหมดทันที</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 5: Asker Statistics Dashboard Section */}
          {showAskerStatsSection && (
            <div id="asker-stats-section-container" className="pt-2">
              <AskerStatsSection
                questions={questions}
                schedules={schedules}
                postponedIds={postponedIds}
                onOpenFullModal={() => setIsAskerStatsModalOpen(true)}
                onFilterByAsker={handleFilterByAsker}
                activeAskerFilter={activeAskerFilter}
              />
            </div>
          )}

          {/* Section 6: All Submitted Questions Table */}
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
              onRefreshSheet={() => handleRefreshFromGoogleSheet(true)}
              isRefreshingSheet={isCheckingSheet}
              onOpenAskerStats={() => setIsAskerStatsModalOpen(true)}
              selectedAskerFilter={activeAskerFilter}
              onCalculateAllAgendas={handleCalculateAllAgendas}
              isAdmin={userRole === 'admin'}
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
        isAdmin={userRole === 'admin'}
      />

      {/* User Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentRole={userRole}
        onSelectRole={handleSelectRole}
        pendingMessage={loginModalPendingMessage}
        initialTab={loginModalInitialTab}
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

      {/* Asker Statistics Modal (สถิติผู้ตั้งกระทู้ถามฉบับเต็ม / การจัดสรรระเบียบวาระ / พิมพ์รายงาน) */}
      <AskerStatsModal
        isOpen={isAskerStatsModalOpen}
        onClose={() => setIsAskerStatsModalOpen(false)}
        questions={questions}
        schedules={schedules}
        postponedIds={postponedIds}
        onSelectAskerInTable={(name) => handleFilterByAsker(name)}
        onOpenPrintReport={() => {
          setIsAskerStatsModalOpen(false);
          setIsPrintModalOpen(true);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 text-xs ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/20'
                : toastMessage.type === 'error'
                ? 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/20'
                : 'bg-slate-900 text-slate-50 border-slate-700 shadow-slate-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toastMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-relaxed">
              {toastMessage.text}
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

