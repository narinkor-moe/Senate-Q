import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  SlidersHorizontal,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Users,
  AlertTriangle,
  RotateCcw,
  Eye,
  Check,
  FileDown
} from 'lucide-react';
import { WeeklySchedule, QuestionItem, HolidayItem } from '../types';
import {
  PrintReportOptions,
  generateReportHtml,
  executePrintReport,
  downloadScheduleAsPdf,
  getCurrentThaiDateTimeString
} from '../utils/printUtils';
import { formatThaiDateWithDayOfWeek } from '../scheduler';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: WeeklySchedule[];
  allQuestions: QuestionItem[];
  selectedWeekDate?: string;
  skippedHolidays: HolidayItem[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  schedules,
  allQuestions,
  selectedWeekDate,
  skippedHolidays,
}) => {
  // Configuration options
  const [reportType, setReportType] = useState<PrintReportOptions['reportType']>('all_weeks');
  const [targetWeekDate, setTargetWeekDate] = useState<string>(
    selectedWeekDate || (schedules.length > 0 ? schedules[0].date : '')
  );
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [includeHolidayNotice, setIncludeHolidayNotice] = useState<boolean>(true);
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [tableFontSize, setTableFontSize] = useState<number>(16);
  const [customTitle, setCustomTitle] = useState<string>(
    'รายงานการจัดระเบียบวาระกระทู้ถามในการประชุมวุฒิสภา'
  );
  const [customDepartment, setCustomDepartment] = useState<string>(
    'กลุ่มการเมือง สำนักงานรัฐมนตรี กระทรวงศึกษาธิการ'
  );

  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);

  // Generate HTML for current options
  const reportHtml = useMemo(() => {
    const options: PrintReportOptions = {
      reportType,
      selectedWeekDate: targetWeekDate,
      includeSignature,
      includeHolidayNotice,
      includeSummary,
      orientation,
      tableFontSize,
      customTitle,
      customDepartment,
    };
    return generateReportHtml(schedules, allQuestions, skippedHolidays, options);
  }, [
    reportType,
    targetWeekDate,
    includeSignature,
    includeHolidayNotice,
    includeSummary,
    orientation,
    tableFontSize,
    customTitle,
    customDepartment,
    schedules,
    allQuestions,
    skippedHolidays,
  ]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccessNotice('กำลังส่งคำสั่งพิมพ์ไปยังเครื่องพิมพ์...');
    try {
      await executePrintReport(reportHtml);
      setPrintSuccessNotice('ส่งคำสั่งพิมพ์ไปยังเครื่องพิมพ์เรียบร้อยแล้ว');
      setTimeout(() => setPrintSuccessNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setPrintSuccessNotice('เกิดข้อผิดพลาดในการเรียกเครื่องพิมพ์');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPrintSuccessNotice('กำลังสร้างและดาวน์โหลดไฟล์ PDF...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      let filename = `รายงานระเบียบวาระ_วุฒิสภา_${today}.pdf`;
      if (reportType === 'selected_week' && targetWeekDate) {
        filename = `รายงานระเบียบวาระ_วุฒิสภา_วาระ_${targetWeekDate}_${today}.pdf`;
      } else if (reportType === 'all_questions_table') {
        filename = `ทะเบียนกระทู้ถามวุฒิสภา_${today}.pdf`;
      } else if (reportType === 'asker_statistics') {
        filename = `สถิติผู้ตั้งกระทู้ถามวุฒิสภา_${today}.pdf`;
      } else if (reportType === 'postponed_only') {
        filename = `รายงานกระทู้ขอเลื่อนตอบ_วุฒิสภา_${today}.pdf`;
      }
      const ok = await downloadScheduleAsPdf(reportHtml, filename, orientation);
      if (ok) {
        setPrintSuccessNotice('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว');
      } else {
        setPrintSuccessNotice('เปิดหน้าต่างพิมพ์สำหรับบันทึกเป็น PDF แล้ว');
      }
      setTimeout(() => setPrintSuccessNotice(null), 4500);
    } catch (err) {
      console.error(err);
      setPrintSuccessNotice('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl xl:max-w-7xl w-full flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0369a1] text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  พิมพ์รายงานการจัดระเบียบวาระกระทู้ถาม
                </h3>
                <span className="bg-sky-100 text-[#0369a1] border border-sky-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                  รองรับเครื่องพิมพ์ทุกรุ่น & บันทึก PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดรูปแบบเอกสารราชการมาตรฐานตามแบบแผนวุฒิสภา พร้อมสั่งพิมพ์ออกเครื่องพิมพ์ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-modal-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || isPrinting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              title="ดาวน์โหลดเป็นไฟล์เอกสาร PDF (A4 คมชัดสูง)"
            >
              <FileDown className={`w-4 h-4 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              type="button"
              id="btn-modal-print"
              onClick={handlePrint}
              disabled={isPrinting || isDownloadingPdf}
              className="px-4 py-2 rounded-lg bg-[#0369a1] hover:bg-[#075985] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              title="สั่งพิมพ์ออกเครื่องพิมพ์โดยตรง (Print)"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'กำลังสั่งพิมพ์...' : 'สั่งพิมพ์ (Print)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Settings on Left, Live Preview on Right */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Controls / Options Panel */}
          <div className="w-full lg:w-80 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 p-5 space-y-5 overflow-y-auto shrink-0">
            
            {/* Notification alert */}
            {printSuccessNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{printSuccessNotice}</span>
              </div>
            )}

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0369a1]" />
                เนื้อหารายงานที่ต้องการพิมพ์
              </label>

              <div className="space-y-1.5">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  reportType === 'all_weeks'
                    ? 'bg-sky-50 border-[#0369a1] text-sky-950 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'all_weeks'}
                    onChange={() => setReportType('all_weeks')}
                    className="mt-0.5 text-[#0369a1]"
                  />
                  <div>
                    <div className="font-bold">ระเบียบวาระทุกสัปดาห์ ({schedules.length} สัปดาห์)</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      พิมพ์ตารางจัดวาระกระทู้ถามครบทุกวันจันทร์
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  reportType === 'selected_week'
                    ? 'bg-sky-50 border-[#0369a1] text-sky-950 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'selected_week'}
                    onChange={() => setReportType('selected_week')}
                    className="mt-0.5 text-[#0369a1]"
                  />
                  <div>
                    <div className="font-bold">เฉพาะสัปดาห์ที่เลือก</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      พิมพ์ระเบียบวาระวันจันทร์สัปดาห์ใดสัปดาห์หนึ่ง
                    </div>
                  </div>
                </label>

                {reportType === 'selected_week' && (
                  <div className="pl-6 pt-1">
                    <select
                      value={targetWeekDate}
                      onChange={(e) => setTargetWeekDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-[#0369a1]"
                    >
                      {schedules.map((s, idx) => (
                        <option key={s.date} value={s.date}>
                          สัปดาห์ที่ {idx + 1}: {s.thaiDateFormatted} ({s.questions.length} เรื่อง)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  reportType === 'postponed_only'
                    ? 'bg-sky-50 border-[#0369a1] text-sky-950 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'postponed_only'}
                    onChange={() => setReportType('postponed_only')}
                    className="mt-0.5 text-[#0369a1]"
                  />
                  <div>
                    <div className="font-bold">เฉพาะกระทู้ที่มีการขอเลื่อนตอบ</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      พิมพ์กระทู้ที่เลื่อนตอบเพื่อติดตามความพร้อมของรัฐมนตรี
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  reportType === 'asker_statistics'
                    ? 'bg-sky-50 border-[#0369a1] text-sky-950 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'asker_statistics'}
                    onChange={() => setReportType('asker_statistics')}
                    className="mt-0.5 text-[#0369a1]"
                  />
                  <div>
                    <div className="font-bold">รายงานสถิติผู้ตั้งกระทู้ถาม (วุฒิสภา)</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      สรุปจำนวนกระทู้และสถานะจำแนกตามรายชื่อสมาชิกวุฒิสภา
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  reportType === 'all_questions_table'
                    ? 'bg-sky-50 border-[#0369a1] text-sky-950 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                }`}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'all_questions_table'}
                    onChange={() => setReportType('all_questions_table')}
                    className="mt-0.5 text-[#0369a1]"
                  />
                  <div>
                    <div className="font-bold">บัญชีทะเบียนกระทู้ถามทั้งหมด ({allQuestions.length} เรื่อง)</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      ตารางสรุปกระทู้ถามทั้งหมดตามลำดับที่ยื่น
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Elements / Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0369a1]" />
                องค์ประกอบเสริมในรายงาน
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded text-[#0369a1] focus:ring-[#0369a1]"
                  />
                  <span>แสดงกล่องสถิติและสรุปยอดกระทู้</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeHolidayNotice}
                    onChange={(e) => setIncludeHolidayNotice(e.target.checked)}
                    className="rounded text-[#0369a1] focus:ring-[#0369a1]"
                  />
                  <span>แสดงหมายเหตุวันหยุดราชการ (งดประชุม)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="rounded text-[#0369a1] focus:ring-[#0369a1]"
                  />
                  <span>แสดงช่องลงนามผู้จัดทำ / ผู้ตรวจทาน (3 ตำแหน่ง)</span>
                </label>
              </div>
            </div>

            {/* Page Orientation Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  ทิศทางหน้ากระดาษ (Orientation)
                </label>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  {orientation === 'landscape' ? 'A4 แนวนอน' : 'A4 แนวตั้ง'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    orientation === 'landscape'
                      ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-block w-4 h-3 border-2 border-current rounded-2xs"></span>
                  <span>A4 แนวนอน ★</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    orientation === 'portrait'
                      ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-block w-3 h-4 border-2 border-current rounded-2xs"></span>
                  <span>A4 แนวตั้ง</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                รายงานตารางที่มีรายละเอียดหลายคอลัมน์ แนะนำให้พิมพ์ในรูปแบบ <strong>"A4 แนวนอน"</strong>
              </p>
            </div>

            {/* Table Font Size Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  ขนาดตัวอักษรในตารางข้อมูล
                </label>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {tableFontSize} pt {tableFontSize === 16 ? '(มาตรฐานงานสารบรรณ)' : ''}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[13, 14, 15, 16, 18].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTableFontSize(size)}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      tableFontSize === size
                        ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {size} pt {size === 16 ? '★' : ''}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                ตามระเบียบงานสารบรรณราชการ กำหนดขนาดตัวอักษร 16 pt (TH Sarabun) เป็นค่ามาตรฐาน โดยตารางแสดง 5 คอลัมน์หลักตามลำดับวาระประชุม
              </p>
            </div>

            {/* Custom Header Text */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                ชื่อหัวรายงาน
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-[#0369a1]"
              />

              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block pt-1">
                ชื่อหน่วยงาน
              </label>
              <input
                type="text"
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-[#0369a1]"
              />
            </div>

            {/* Quick Tips */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                คำแนะนำการสั่งพิมพ์:
              </span>
              <p>
                ในหน้าต่างพิมพ์ของเบราว์เซอร์ สามารถเลือกเครื่องพิมพ์จริง หรือเลือก <strong>"บันทึกเป็น PDF (Save as PDF)"</strong> เพื่อนำไฟล์ไปส่งต่อหรือแนบเสนอผู้บริหารได้
              </p>
            </div>

          </div>

          {/* Live Preview Panel (A4 Style Paper View) */}
          <div className="flex-1 bg-slate-200/70 p-4 md:p-6 overflow-y-auto flex flex-col items-center">
            <div className="mb-2 text-xs font-semibold text-slate-600 flex items-center justify-between w-full max-w-[1040px]">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>ตัวอย่างหน้ากระดาษก่อนพิมพ์จริง ({orientation === 'landscape' ? 'A4 แนวนอน' : 'A4 แนวตั้ง'}):</span>
              </div>
              <span className="text-[11px] font-bold text-sky-700 bg-white border border-slate-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                {orientation === 'landscape' ? '297 × 210 มม. (Landscape)' : '210 × 297 มม. (Portrait)'}
              </span>
            </div>

            {/* Simulated A4 Paper */}
            <div className={`bg-white rounded-lg shadow-xl border border-slate-300 w-full p-4 md:p-6 transition-all overflow-hidden text-slate-900 font-['Sarabun',sans-serif] ${
              orientation === 'landscape' ? 'max-w-[1040px] min-h-[640px]' : 'max-w-[800px] min-h-[850px]'
            }`}>
              <iframe
                title="Print Preview"
                srcDoc={reportHtml}
                className={`w-full border-0 ${
                  orientation === 'landscape' ? 'h-[620px]' : 'h-[750px]'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>สถานะ: พร้อมส่งพิมพ์ไปยังเครื่องพิมพ์</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2 rounded-lg bg-[#0369a1] hover:bg-[#075985] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'กำลังส่งพิมพ์...' : 'สั่งพิมพ์ออกเครื่องพิมพ์ (Print Now)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
