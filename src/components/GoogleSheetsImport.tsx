import React, { useState } from 'react';
import { fetchSheetRows } from '../googleSheetsService';
import { QuestionItem } from '../types';
import { parseThaiOrISODate } from '../scheduler';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  ClipboardPaste,
  Info,
  Calendar
} from 'lucide-react';

interface GoogleSheetsImportProps {
  onImportQuestions: (questions: QuestionItem[]) => void;
}

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({
  onImportQuestions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');
  
  // URL / Range mode
  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [sheetRange, setSheetRange] = useState('Sheet1!A2:E100');
  
  // Direct Paste mode
  const [pastedText, setPastedText] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const parseRowData = (rows: (string | number | undefined)[][]): QuestionItem[] => {
    const parsedItems: QuestionItem[] = [];
    let nextAutoOrder = 1;

    rows.forEach((row, idx) => {
      if (!row || row.length === 0) return;

      const col0 = row[0] !== undefined ? String(row[0]).trim() : '';
      const col1 = row[1] !== undefined ? String(row[1]).trim() : '';
      const col2 = row[2] !== undefined ? String(row[2]).trim() : '';
      const col3 = row[3] !== undefined ? String(row[3]).trim() : '';
      const col4 = row[4] !== undefined ? String(row[4]).trim() : '';

      // Skip header row if detected
      if (col0.includes('ลำดับ') || col1.includes('กระทู้') || col1.includes('เรื่อง') || col2.includes('ผู้ตั้ง')) {
        return;
      }

      let order = parseInt(col0, 10);
      if (isNaN(order)) {
        order = nextAutoOrder;
      } else {
        nextAutoOrder = order + 1;
      }

      const topic = col1;
      const asker = col2;
      const minister = col3;
      const postponedDateRaw = col4;

      if (topic) {
        // Parse postponed date if present
        let cleanPostponedDate: string | undefined = undefined;
        if (postponedDateRaw) {
          const parsedISO = parseThaiOrISODate(postponedDateRaw);
          cleanPostponedDate = parsedISO || postponedDateRaw;
        }

        parsedItems.push({
          id: `sheet-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          submittedOrder: order,
          topic: topic,
          asker: asker || 'ไม่ระบุผู้ตั้งถาม',
          minister: minister || 'ไม่ระบุรัฐมนตรี',
          postponedDate: cleanPostponedDate,
          status: cleanPostponedDate ? 'postponed' : 'pending'
        });
      }
    });

    return parsedItems;
  };

  const handleImportFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!spreadsheetId) {
      setErrorMsg('กรุณาระบุ URL หรือ Spreadsheet ID ของ Google Sheets');
      return;
    }

    try {
      setLoading(true);
      const rows = await fetchSheetRows(spreadsheetId, sheetRange);
      
      if (!rows || rows.length === 0) {
        setErrorMsg('ไม่พบข้อมูลแถวใน Google Sheet ที่ระบุ');
        return;
      }

      const parsedItems = parseRowData(rows);

      if (parsedItems.length === 0) {
        setErrorMsg('ไม่พบข้อมูลกระทู้ที่สามารถแปลงได้จากชีต โปรดตรวจสอบว่าคอลัมน์ตรงตามรูปแบบ [ลำดับ, เรื่อง, ผู้ตั้งถาม, ถามรัฐมนตรี, เลื่อนตอบวันที่]');
        return;
      }

      const postponedCount = parsedItems.filter((q) => !!q.postponedDate).length;
      onImportQuestions(parsedItems);
      setSuccessMsg(`นำเข้าสำเร็จ ${parsedItems.length} รายการ ${postponedCount > 0 ? `(มีกระทู้ขอเลื่อน ${postponedCount} เรื่อง)` : ''}`);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromPaste = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!pastedText.trim()) {
      setErrorMsg('กรุณาวางข้อมูลข้อความที่คัดลอกจาก Google Sheets');
      return;
    }

    try {
      // Split lines and tab/comma separated cells
      const lines = pastedText.trim().split(/\r?\n/);
      const rows: string[][] = lines.map((line) => {
        if (line.includes('\t')) {
          return line.split('\t');
        }
        return line.split(',');
      });

      const parsedItems = parseRowData(rows);

      if (parsedItems.length === 0) {
        setErrorMsg('ไม่พบข้อมูลกระทู้ที่สามารถแปลงได้ โปรดตรวจสอบว่าวางข้อมูลอย่างน้อย 4-5 คอลัมน์ [ลำดับ, เรื่อง, ผู้ตั้งถาม, ถามรัฐมนตรี, เลื่อนตอบวันที่]');
        return;
      }

      const postponedCount = parsedItems.filter((q) => !!q.postponedDate).length;
      onImportQuestions(parsedItems);
      setSuccessMsg(`นำเข้าสำเร็จ ${parsedItems.length} รายการ ${postponedCount > 0 ? `(มีกระทู้ขอเลื่อน ${postponedCount} เรื่อง)` : ''}`);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
        setPastedText('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg('รูปแบบข้อมูลไม่ถูกต้อง กรุณาคัดลอกข้อมูลตารางจาก Google Sheets อีกครั้ง');
    }
  };

  const insertSampleData = () => {
    const sample = `1\tมาตรการแก้ไขปัญหาภัยแล้งและบริหารจัดการลุ่มน้ำยมอย่างยั่งยืน\tนายสมชาย วงศ์สวัสดิ์\tรัฐมนตรีว่าการกระทรวงเกษตรและสหกรณ์\t
2\tแนวทางการยกระดับราคาพืชผลทางการเกษตร (ข้าวเปลือกและยางพารา)\tนายสมชาย วงศ์สวัสดิ์\tรัฐมนตรีว่าการกระทรวงพาณิชย์\t2026-09-14
3\tความคืบหน้ารถไฟความเร็วสูงเชื่อม 3 สนามบิน และผลกระทบต่อประชาชน\tนางสาวกานต์รวี ประเสริฐสุข\tรัฐมนตรีว่าการกระทรวงคมนาคม\t
4\tการจัดสรรงบประมาณพัฒนาคุณภาพการศึกษาในโรงเรียนขนาดเล็ก\tนายวีระพล สุขสมบูรณ์\tรัฐมนตรีว่าการกระทรวงศึกษาธิการ\t
5\tการแก้ไขปัญหาหนี้สินครัวเรือนและหนี้นอกระบบของเกษตรกรรายย่อย\tนางสาวกานต์รวี ประเสริฐสุข\tรัฐมนตรีว่าการกระทรวงการคลัง\t
6\tนโยบายควบคุมฝุ่นละออง PM 2.5 ในเขตพื้นที่ภาคเหนือ\tดร.ธนกฤต ชัยเรืองโรจน์\tรัฐมนตรีว่าการกระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม\t`;
    setPastedText(sample);
  };

  return (
    <div className="relative">
      <button
        type="button"
        id="btn-google-sheets-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors cursor-pointer"
      >
        <FileSpreadsheet className="w-4 h-4 text-sky-300" />
        <span>นำเข้าจาก Google Sheets</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#0369a1]/10 text-[#0369a1]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">นำเข้าข้อมูลจาก Google Sheets</h4>
                  <p className="text-xs text-slate-500">ดึงข้อมูลรายการกระทู้ถาม พร้อมคอลัมน์เลื่อนตอบวันที่</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-slate-100 p-1 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImportMode('url')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  importMode === 'url' ? 'bg-white text-[#0369a1] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ผ่าน Google Sheets API / URL</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  importMode === 'paste' ? 'bg-white text-[#0369a1] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>คัดลอกวางตาราง (Copy & Paste)</span>
              </button>
            </div>

            {/* Column Guide */}
            <div className="bg-sky-50/60 rounded-lg p-3.5 border border-sky-200/80 text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#0369a1]" />
                โครงสร้าง 5 คอลัมน์ที่รองรับใน Google Spreadsheet:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pl-1">
                <div>• <strong>คอลัมน์ A:</strong> ลำดับที่ยื่น (เช่น 1, 2)</div>
                <div>• <strong>คอลัมน์ B:</strong> กระทู้ถามเรื่อง</div>
                <div>• <strong>คอลัมน์ C:</strong> ผู้ตั้งถาม</div>
                <div>• <strong>คอลัมน์ D:</strong> ถามรัฐมนตรี</div>
                <div className="col-span-full font-medium text-sky-900 bg-white/70 p-1.5 rounded border border-sky-200/50 mt-0.5">
                  • <strong>คอลัมน์ E (ใหม่):</strong> <span className="font-bold text-[#0369a1]">เลื่อนตอบวันที่</span> (เช่น <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-800">2026-09-14</code> หรือ <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-800">14 ก.ย. 2569</code> หรือเว้นว่าง)
                </div>
              </div>
            </div>

            {/* URL Mode */}
            {importMode === 'url' ? (
              <form onSubmit={handleImportFromUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Sheet URL หรือ Spreadsheet ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrlOrId}
                    onChange={(e) => setSheetUrlOrId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ช่วงเซลล์ (Range ครอบคลุม 5 คอลัมน์ A ถึง E)
                  </label>
                  <input
                    type="text"
                    value={sheetRange}
                    onChange={(e) => setSheetRange(e.target.value)}
                    placeholder="Sheet1!A2:E100"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-[#0369a1] hover:bg-[#075985] text-white rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังนำเข้า...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>ดึงข้อมูลจาก Sheets</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Paste Mode */
              <form onSubmit={handleImportFromPaste} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      วางข้อความที่คัดลอกจาก Google Sheets (Ctrl+V) *
                    </label>
                    <button
                      type="button"
                      onClick={insertSampleData}
                      className="text-[11px] text-[#0369a1] hover:underline font-semibold cursor-pointer"
                    >
                      + เติมตัวอย่างข้อมูล 5 คอลัมน์
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="1	กระทู้เรื่องแรก	นาย ก	รมว. คมนาคม	&#10;2	กระทู้เรื่องสอง	นาย ก	รมว. พาณิชย์	2026-09-14&#10;3	กระทู้เรื่องสาม	นาง ข	รมว. เกษตรฯ	"
                    className="w-full font-mono text-[11px] p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * สามารถคลุมดำแถวใน Google Sheets แล้วกด Copy (Ctrl+C) นำมา Paste ลงในช่องนี้ได้ทันที
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-[#0369a1] hover:bg-[#075985] text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>นำเข้าข้อมูลที่วาง</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
