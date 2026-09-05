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
  Calendar,
  Zap
} from 'lucide-react';

interface GoogleSheetsImportProps {
  onImportQuestions: (questions: QuestionItem[]) => void;
}

const DEFAULT_SHEET_ID = '18tE6RON_7Z3BO-NtrF4jaqH_qP92A1-FiZ-RPACXGdU';
const DEFAULT_RANGE = 'Data!A1:G100';

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({
  onImportQuestions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');
  
  // URL / Range mode - prefilled with target sheet ID and Data sheet
  const [sheetUrlOrId, setSheetUrlOrId] = useState(DEFAULT_SHEET_ID);
  const [sheetRange, setSheetRange] = useState(DEFAULT_RANGE);
  
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
    if (!rows || rows.length === 0) return [];

    let headerIndex = -1;
    let colOrder = -1;
    let colTopic = -1;
    let colAsker = -1;
    let colMinister = -1;
    let colPostponed = -1;
    let colScheduled = -1;

    // 1. Try to detect header row
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      if (!row) continue;
      const strRow = row.map((c) => String(c || '').trim().toLowerCase());

      const oIdx = strRow.findIndex((c) => c.includes('ลำดับ'));
      const tIdx = strRow.findIndex((c) => c.includes('กระทู้') || c.includes('เรื่อง'));
      const aIdx = strRow.findIndex((c) => c.includes('ผู้ตั้ง') || c.includes('ผู้ถาม'));
      const mIdx = strRow.findIndex((c) => c.includes('รัฐมนตรี') || c.includes('รมต.'));
      const pIdx = strRow.findIndex((c) => c.includes('เลื่อนตอบ') || c.includes('เลื่อน') || c.includes('ขอเลื่อน'));
      const sIdx = strRow.findIndex((c) => c.includes('วันที่บรรจุ') || c.includes('บรรจุ'));

      if (tIdx !== -1 || aIdx !== -1) {
        headerIndex = r;
        colOrder = oIdx !== -1 ? oIdx : 0;
        colTopic = tIdx !== -1 ? tIdx : 3;
        colAsker = aIdx !== -1 ? aIdx : 4;
        colMinister = mIdx !== -1 ? mIdx : 5;
        colPostponed = pIdx !== -1 ? pIdx : 2;
        colScheduled = sIdx;
        break;
      }
    }

    const startRowIdx = headerIndex !== -1 ? headerIndex + 1 : 0;
    const parsedItems: QuestionItem[] = [];
    let nextAutoOrder = 1;

    for (let i = startRowIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row.some((cell) => cell !== undefined && String(cell).trim() !== '')) {
        continue;
      }

      let orderVal = 0;
      let topicVal = '';
      let askerVal = '';
      let ministerVal = '';
      let postponedVal = '';

      if (headerIndex !== -1) {
        // Use detected column indices
        const rawOrder = colOrder !== -1 && row[colOrder] !== undefined ? String(row[colOrder]).trim() : '';
        orderVal = parseInt(rawOrder, 10);
        topicVal = colTopic !== -1 && row[colTopic] !== undefined ? String(row[colTopic]).trim() : '';
        askerVal = colAsker !== -1 && row[colAsker] !== undefined ? String(row[colAsker]).trim() : '';
        ministerVal = colMinister !== -1 && row[colMinister] !== undefined ? String(row[colMinister]).trim() : '';
        postponedVal = colPostponed !== -1 && row[colPostponed] !== undefined ? String(row[colPostponed]).trim() : '';
      } else {
        // Fallback by column count layout
        if (row.length >= 6) {
          // Layout: [ลำดับ, วันที่บรรจุ, เลื่อนตอบวันที่, เรื่อง, ผู้ตั้งถาม, รัฐมนตรี, ...]
          orderVal = parseInt(String(row[0] || '').trim(), 10);
          postponedVal = String(row[2] || '').trim();
          topicVal = String(row[3] || '').trim();
          askerVal = String(row[4] || '').trim();
          ministerVal = String(row[5] || '').trim();
        } else if (row.length === 5) {
          // Layout: [ลำดับ, เรื่อง, ผู้ตั้งถาม, รัฐมนตรี, เลื่อนตอบวันที่]
          orderVal = parseInt(String(row[0] || '').trim(), 10);
          topicVal = String(row[1] || '').trim();
          askerVal = String(row[2] || '').trim();
          ministerVal = String(row[3] || '').trim();
          postponedVal = String(row[4] || '').trim();
        } else {
          // Layout: [ลำดับ, เรื่อง, ผู้ตั้งถาม, รัฐมนตรี]
          orderVal = parseInt(String(row[0] || '').trim(), 10);
          topicVal = String(row[1] || '').trim();
          askerVal = String(row[2] || '').trim();
          ministerVal = String(row[3] || '').trim();
        }
      }

      if (isNaN(orderVal) || orderVal <= 0) {
        orderVal = nextAutoOrder;
      }
      nextAutoOrder = Math.max(nextAutoOrder, orderVal + 1);

      if (topicVal) {
        let cleanPostponedDate: string | undefined = undefined;
        if (postponedVal && postponedVal.trim().length > 0) {
          const parsedISO = parseThaiOrISODate(postponedVal);
          cleanPostponedDate = parsedISO || postponedVal.trim();
        }

        parsedItems.push({
          id: `sheet-q-${orderVal}-${Date.now()}-${i}`,
          submittedOrder: orderVal,
          topic: topicVal,
          asker: askerVal || 'ไม่ระบุผู้ตั้งถาม',
          minister: ministerVal || 'ไม่ระบุรัฐมนตรี',
          postponedDate: cleanPostponedDate,
          postponedSheetRaw: postponedVal.trim() || undefined,
          isPostponedInSheet: !!cleanPostponedDate,
          sheetRowIndex: i + 1,
          status: cleanPostponedDate ? 'postponed' : 'pending'
        });
      }
    }

    return parsedItems;
  };

  const handleImportFromUrl = async (e?: React.FormEvent, customId?: string, customRange?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetInput = customId || sheetUrlOrId;
    const targetRange = customRange || sheetRange;
    const spreadsheetId = extractSpreadsheetId(targetInput);

    if (!spreadsheetId) {
      setErrorMsg('กรุณาระบุ URL หรือ Spreadsheet ID ของ Google Sheets');
      return;
    }

    try {
      setLoading(true);
      const rows = await fetchSheetRows(spreadsheetId, targetRange);
      
      if (!rows || rows.length === 0) {
        setErrorMsg('ไม่พบข้อมูลแถวใน Google Sheet ที่ระบุ');
        return;
      }

      const parsedItems = parseRowData(rows);

      if (parsedItems.length === 0) {
        setErrorMsg('ไม่พบข้อมูลกระทู้ที่สามารถแปลงได้จากชีต โปรดตรวจสอบว่าชีตมีคอลัมน์ชื่อ [ลำดับ, กระทู้ถามเรื่อง, ผู้ตั้งถาม, ถามรัฐมนตรี, เลื่อนตอบวันที่]');
        return;
      }

      const postponedCount = parsedItems.filter((q) => !!q.postponedDate).length;
      onImportQuestions(parsedItems);
      setSuccessMsg(`นำเข้าข้อมูลสำเร็จ ${parsedItems.length} กระทู้ถาม ${postponedCount > 0 ? `(มีกระทู้ขอเลื่อน ${postponedCount} เรื่อง)` : ''}`);
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

  const handleQuickLoadDefault = () => {
    setSheetUrlOrId(DEFAULT_SHEET_ID);
    setSheetRange(DEFAULT_RANGE);
    handleImportFromUrl(undefined, DEFAULT_SHEET_ID, DEFAULT_RANGE);
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
      const lines = pastedText.trim().split(/\r?\n/);
      const rows: string[][] = lines.map((line) => {
        if (line.includes('\t')) {
          return line.split('\t');
        }
        return line.split(',');
      });

      const parsedItems = parseRowData(rows);

      if (parsedItems.length === 0) {
        setErrorMsg('ไม่พบข้อมูลกระทู้ที่สามารถแปลงได้ โปรดตรวจสอบการคัดลอกข้อมูลตาราง');
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

  return (
    <div className="relative">
      <button
        type="button"
        id="btn-google-sheets-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors cursor-pointer"
      >
        <FileSpreadsheet className="w-4 h-4 text-sky-300" />
        <span>นำเข้า Google Sheets (ID: {DEFAULT_SHEET_ID.substring(0, 8)}...)</span>
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
                  <p className="text-xs text-slate-500">ดึงข้อมูลรายการกระทู้ถามจาก Google Spreadsheet</p>
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

            {/* Quick 1-Click Target Sheet Banner */}
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 flex items-center justify-between gap-2">
              <div className="text-xs text-sky-950 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#0369a1]" />
                  <span>Google Sheet: <strong>Data</strong></span>
                </div>
                <div className="text-[11px] text-sky-800 font-mono">
                  ID: {DEFAULT_SHEET_ID}
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleQuickLoadDefault}
                className="px-3 py-1.5 rounded-lg bg-[#0369a1] hover:bg-[#075985] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                {loading ? 'กำลังดึง...' : 'ดึงชีตนี้ทันที'}
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
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#0369a1]" />
                โครงสร้างคอลัมน์ในชีต Data:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pl-1">
                <div>• ลำดับที่ยื่น</div>
                <div>• วันที่บรรจุ</div>
                <div>• เลื่อนตอบวันที่</div>
                <div>• กระทู้ถามเรื่อง</div>
                <div>• ผู้ตั้งถาม</div>
                <div>• ถามรัฐมนตรี / สถานะ</div>
              </div>
            </div>

            {/* URL Mode */}
            {importMode === 'url' ? (
              <form onSubmit={(e) => handleImportFromUrl(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Sheet URL หรือ Spreadsheet ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={DEFAULT_SHEET_ID}
                    value={sheetUrlOrId}
                    onChange={(e) => setSheetUrlOrId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-black placeholder:text-slate-400 bg-white font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ช่วงข้อมูล (Range / Sheet Name)
                  </label>
                  <input
                    type="text"
                    value={sheetRange}
                    onChange={(e) => setSheetRange(e.target.value)}
                    placeholder="Data!A1:G100"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-black placeholder:text-slate-400 bg-white font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วางข้อความที่คัดลอกจาก Google Sheets (Ctrl+V) *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="1	2026-09-07		มาตรการในการกำกับดูแล...	นายประพนธ์ ตั้งศรีเกียรติกุล	นายกรัฐมนตรี	รอการบรรจุ..."
                    className="w-full font-mono text-[11px] text-black bg-white p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * สามารถคลุมแถวในชีต Data แล้วกด Copy (Ctrl+C) นำมา Paste ลงในช่องนี้ได้ทันที
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

