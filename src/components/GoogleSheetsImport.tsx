import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchSheetRows,
  fetchSpreadsheetWorksheets,
  extractSpreadsheetInfo,
  formatSheetRange,
  SheetWorksheetInfo,
  DEFAULT_SHEET_ID,
  DEFAULT_SHEET_NAME,
} from '../googleSheetsService';
import { QuestionItem } from '../types';
import { parseThaiOrISODate } from '../scheduler';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  ClipboardPaste,
  Info,
  Zap,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface GoogleSheetsImportProps {
  onImportQuestions: (
    questions: QuestionItem[],
    meta?: { sheetName: string; spreadsheetId: string }
  ) => void;
  currentSheetName?: string;
  currentSpreadsheetId?: string;
}

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({
  onImportQuestions,
  currentSheetName = DEFAULT_SHEET_NAME,
  currentSpreadsheetId = DEFAULT_SHEET_ID,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');

  // URL / Spreadsheet ID state
  const [sheetUrlOrId, setSheetUrlOrId] = useState(currentSpreadsheetId);
  const [selectedSheetName, setSelectedSheetName] = useState<string>(currentSheetName);
  const [selectedGid, setSelectedGid] = useState<string | undefined>(undefined);
  const [worksheets, setWorksheets] = useState<SheetWorksheetInfo[]>([]);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(false);

  // Custom range mode
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customRangeText, setCustomRangeText] = useState('');

  // Direct Paste mode
  const [pastedText, setPastedText] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Computed range string
  const activeRange = isCustomRange && customRangeText.trim()
    ? customRangeText.trim()
    : formatSheetRange(selectedSheetName, 'A1:G100');

  // Load worksheets for the current spreadsheet
  const loadWorksheets = useCallback(async (targetIdOrUrl: string) => {
    const info = extractSpreadsheetInfo(targetIdOrUrl);
    if (!info.spreadsheetId) return;

    setIsLoadingWorksheets(true);
    try {
      const sheets = await fetchSpreadsheetWorksheets(info.spreadsheetId);
      if (sheets && sheets.length > 0) {
        setWorksheets(sheets);

        // If the URL has a specific gid (e.g. copied from browser tab with #gid=1703245146)
        if (info.gid) {
          const matchedByGid = sheets.find((s) => s.gid === info.gid);
          if (matchedByGid) {
            setSelectedSheetName(matchedByGid.title);
            setSelectedGid(matchedByGid.gid);
            return;
          }
        }

        // If current selectedSheetName is already in the list, keep it; otherwise default to first
        const exists = sheets.some((s) => s.title === selectedSheetName);
        if (!exists) {
          setSelectedSheetName(sheets[0].title);
          setSelectedGid(sheets[0].gid);
        } else {
          const found = sheets.find((s) => s.title === selectedSheetName);
          if (found) setSelectedGid(found.gid);
        }
      }
    } catch (err) {
      console.warn('Failed to load worksheets:', err);
    } finally {
      setIsLoadingWorksheets(false);
    }
  }, [selectedSheetName]);

  // Load worksheets when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWorksheets(sheetUrlOrId);
    }
  }, [isOpen, sheetUrlOrId, loadWorksheets]);

  // Keep state synced if props change
  useEffect(() => {
    if (currentSheetName) {
      setSelectedSheetName(currentSheetName);
    }
  }, [currentSheetName]);

  const handleUrlInputChange = (val: string) => {
    setSheetUrlOrId(val);
    const info = extractSpreadsheetInfo(val);
    if (info.gid) {
      setSelectedGid(info.gid);
    }
    // Debounced or direct load if looks like valid ID
    if (info.spreadsheetId && info.spreadsheetId.length >= 20) {
      loadWorksheets(info.spreadsheetId);
    }
  };

  const handleSelectWorksheet = (ws: SheetWorksheetInfo) => {
    setSelectedSheetName(ws.title);
    setSelectedGid(ws.gid);
    setIsCustomRange(false);
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
    let colStatus = -1;

    // 1. Detect header row
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
      const stIdx = strRow.findIndex((c) => c.includes('สถานะ') || c.includes('status'));

      if (tIdx !== -1 || aIdx !== -1) {
        headerIndex = r;
        colOrder = oIdx !== -1 ? oIdx : 0;
        colScheduled = sIdx !== -1 ? sIdx : 1;
        colPostponed = pIdx !== -1 ? pIdx : 2;
        colTopic = tIdx !== -1 ? tIdx : 3;
        colAsker = aIdx !== -1 ? aIdx : 4;
        colMinister = mIdx !== -1 ? mIdx : 5;
        colStatus = stIdx !== -1 ? stIdx : 6;
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

      let rawOrder = '';
      let scheduledVal = '';
      let postponedVal = '';
      let topicVal = '';
      let askerVal = '';
      let ministerVal = '';
      let statusVal = '';

      if (headerIndex !== -1) {
        rawOrder = colOrder !== -1 && row[colOrder] !== undefined ? String(row[colOrder]).trim() : '';
        scheduledVal = colScheduled !== -1 && row[colScheduled] !== undefined ? String(row[colScheduled]).trim() : '';
        postponedVal = colPostponed !== -1 && row[colPostponed] !== undefined ? String(row[colPostponed]).trim() : '';
        topicVal = colTopic !== -1 && row[colTopic] !== undefined ? String(row[colTopic]).trim() : '';
        askerVal = colAsker !== -1 && row[colAsker] !== undefined ? String(row[colAsker]).trim() : '';
        ministerVal = colMinister !== -1 && row[colMinister] !== undefined ? String(row[colMinister]).trim() : '';
        statusVal = colStatus !== -1 && row[colStatus] !== undefined ? String(row[colStatus]).trim() : '';
      } else {
        if (row.length >= 7) {
          rawOrder = String(row[0] || '').trim();
          scheduledVal = String(row[1] || '').trim();
          postponedVal = String(row[2] || '').trim();
          topicVal = String(row[3] || '').trim();
          askerVal = String(row[4] || '').trim();
          ministerVal = String(row[5] || '').trim();
          statusVal = String(row[6] || '').trim();
        } else if (row.length >= 6) {
          rawOrder = String(row[0] || '').trim();
          postponedVal = String(row[2] || '').trim();
          topicVal = String(row[3] || '').trim();
          askerVal = String(row[4] || '').trim();
          ministerVal = String(row[5] || '').trim();
        } else if (row.length === 5) {
          rawOrder = String(row[0] || '').trim();
          topicVal = String(row[1] || '').trim();
          askerVal = String(row[2] || '').trim();
          ministerVal = String(row[3] || '').trim();
          postponedVal = String(row[4] || '').trim();
        } else {
          rawOrder = String(row[0] || '').trim();
          topicVal = String(row[1] || '').trim();
          askerVal = String(row[2] || '').trim();
          ministerVal = String(row[3] || '').trim();
        }
      }

      // Skip rows that are clearly not parliamentary questions
      const isNumericOrder = /^\d+$/.test(rawOrder);
      const looksLikeChatOrNote =
        topicVal.includes('**') ||
        topicVal.includes('ออฟฟิศซินโดรม') ||
        topicVal.includes('20-20-20') ||
        topicVal.includes('Ergonomics') ||
        rawOrder.includes('/') ||
        rawOrder.includes(':') ||
        /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(rawOrder) ||
        /\d{1,2}:\d{2}:\d{2}/.test(rawOrder);

      if (looksLikeChatOrNote) {
        continue;
      }

      if (!isNumericOrder) {
        if (!topicVal || topicVal.length < 5 || (!askerVal && !ministerVal)) {
          continue;
        }
        if (topicVal.includes('\n\n') || topicVal.startsWith('*') || topicVal.startsWith('#')) {
          continue;
        }
      }

      let orderVal = parseInt(rawOrder, 10);
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

        const isAnswered = statusVal.includes('ตอบแล้ว') || statusVal.toLowerCase() === 'answered';
        const isWithdrawn = statusVal.includes('ถอน') || statusVal.toLowerCase().includes('withdrawn');
        let qStatus: QuestionItem['status'] = 'pending';
        if (isWithdrawn) {
          qStatus = 'withdrawn';
        } else if (isAnswered) {
          qStatus = 'completed';
        } else if (cleanPostponedDate) {
          qStatus = 'postponed';
        }

        parsedItems.push({
          id: `sheet-q-${orderVal}-${Date.now()}-${i}`,
          submittedOrder: orderVal,
          topic: topicVal,
          asker: askerVal || 'ไม่ระบุผู้ตั้งถาม',
          minister: ministerVal || 'ไม่ระบุรัฐมนตรี',
          scheduledDate: scheduledVal || undefined,
          postponedDate: cleanPostponedDate,
          postponedSheetRaw: postponedVal.trim() || undefined,
          isPostponedInSheet: !!cleanPostponedDate,
          sheetRowIndex: i + 1,
          status: qStatus,
          rawStatus: statusVal.trim() || undefined,
          isAnswered: isAnswered,
          isWithdrawn: isWithdrawn,
        });
      }
    }

    return parsedItems;
  };

  const handleImportFromUrl = async (
    e?: React.FormEvent,
    override?: { id?: string; sheetName?: string; gid?: string; range?: string }
  ) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetUrlOrId = override?.id || sheetUrlOrId;
    const info = extractSpreadsheetInfo(targetUrlOrId);
    const spreadsheetId = info.spreadsheetId;

    if (!spreadsheetId) {
      setErrorMsg('กรุณาระบุ URL หรือ Spreadsheet ID ของ Google Sheets');
      return;
    }

    const sheetName = override?.sheetName || selectedSheetName || DEFAULT_SHEET_NAME;
    const gid = override?.gid !== undefined ? override.gid : selectedGid;
    const range = override?.range || activeRange;

    try {
      setLoading(true);
      const rows = await fetchSheetRows(spreadsheetId, {
        sheetName,
        gid,
        range,
      });

      if (!rows || rows.length === 0) {
        setErrorMsg(`ไม่พบข้อมูลแถวใน Google Sheet แผ่นงาน "${sheetName}" ที่ระบุ`);
        return;
      }

      const parsedItems = parseRowData(rows);

      if (parsedItems.length === 0) {
        setErrorMsg(
          `ไม่พบข้อมูลกระทู้ที่สามารถแปลงได้จากแผ่นงาน "${sheetName}" โปรดตรวจสอบว่ามีคอลัมน์ชื่อ [ลำดับ, กระทู้ถามเรื่อง, ผู้ตั้งถาม, ถามรัฐมนตรี, เลื่อนตอบวันที่]`
        );
        return;
      }

      const postponedCount = parsedItems.filter((q) => !!q.postponedDate).length;
      onImportQuestions(parsedItems, { sheetName, spreadsheetId });
      setSuccessMsg(
        `นำเข้าข้อมูลจากแผ่นงาน "${sheetName}" สำเร็จ ${parsedItems.length} กระทู้ถาม ${
          postponedCount > 0 ? `(มีกระทู้ขอเลื่อน ${postponedCount} เรื่อง)` : ''
        }`
      );
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

  const handleQuickImportSheet = (ws: SheetWorksheetInfo) => {
    setSelectedSheetName(ws.title);
    setSelectedGid(ws.gid);
    handleImportFromUrl(undefined, {
      id: sheetUrlOrId,
      sheetName: ws.title,
      gid: ws.gid,
    });
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
      onImportQuestions(parsedItems, {
        sheetName: `${selectedSheetName} (คัดลอกวาง)`,
        spreadsheetId: extractSpreadsheetInfo(sheetUrlOrId).spreadsheetId,
      });
      setSuccessMsg(
        `นำเข้าสำเร็จ ${parsedItems.length} รายการ ${postponedCount > 0 ? `(มีกระทู้ขอเลื่อน ${postponedCount} เรื่อง)` : ''}`
      );
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
        title={`เปิดเครื่องมือนำเข้าจาก Google Sheets (ปัจจุบัน: แผ่นงาน "${selectedSheetName}")`}
      >
        <FileSpreadsheet className="w-4 h-4 text-sky-300" />
        <span>นำเข้า Google Sheets</span>
        <span className="px-1.5 py-0.5 rounded-md bg-sky-950/60 text-sky-200 text-[10px] font-bold border border-sky-400/30">
          แผ่นงาน: {selectedSheetName}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#0369a1]/10 text-[#0369a1]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>นำเข้าข้อมูลจาก Google Sheets</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    เลือกนำเข้าจากแผ่นงาน (Worksheet / Tab) ต่างๆ ภายในไฟล์เดียวกันได้ทันที
                  </p>
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

            {/* Quick 1-Click Multi-Worksheet Selector Banner */}
            <div className="bg-sky-50 rounded-xl p-3.5 border border-sky-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#0369a1]" />
                  <span>ดึงด่วนตามแผ่นงาน (1-Click Worksheet Import)</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadWorksheets(sheetUrlOrId)}
                  disabled={isLoadingWorksheets}
                  className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="รีเฟรชรายชื่อแผ่นงานจาก Google Sheets"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingWorksheets ? 'animate-spin' : ''}`} />
                  <span>รีเฟรชแผ่นงาน</span>
                </button>
              </div>

              <div className="text-[11px] text-sky-800">
                คลิกปุ่มแผ่นงานด้านล่าง เพื่อนำเข้าข้อมูลจากแผ่นงานนั้นทันที:
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {worksheets.length > 0 ? (
                  worksheets.map((ws) => {
                    const isCurrent = selectedSheetName === ws.title;
                    return (
                      <button
                        key={`quick-ws-${ws.gid}-${ws.title}`}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickImportSheet(ws)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 ${
                          isCurrent
                            ? 'bg-[#0369a1] hover:bg-[#075985] text-white ring-2 ring-sky-300'
                            : 'bg-white hover:bg-sky-100 text-sky-900 border border-sky-300'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 opacity-80" />
                        <span>ดึงแผ่นงาน: <strong>{ws.title}</strong></span>
                        {isCurrent && <Check className="w-3 h-3 text-sky-200" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickImportSheet({ title: 'Data', gid: '0' })}
                      className="px-3 py-1.5 rounded-lg bg-[#0369a1] hover:bg-[#075985] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      ดึงแผ่นงาน: Data
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        handleQuickImportSheet({
                          title: '25 ส.ค. 69 - 22 ธ.ค. 69',
                          gid: '1703245146',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ดึงแผ่นงาน: 25 ส.ค. 69 - 22 ธ.ค. 69
                    </button>
                  </div>
                )}
              </div>
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

            {/* URL Mode */}
            {importMode === 'url' ? (
              <form onSubmit={(e) => handleImportFromUrl(e)} className="space-y-4">
                {/* Spreadsheet ID / URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Google Sheet URL หรือ Spreadsheet ID *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      รองรับ URL เต็มพร้อม #gid=... ได้
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={DEFAULT_SHEET_ID}
                    value={sheetUrlOrId}
                    onChange={(e) => handleUrlInputChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-black placeholder:text-slate-400 bg-white font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                </div>

                {/* Worksheet Selection Section (หัวใจหลักของการเลือกแผ่นงาน) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#0369a1]" />
                      <label className="text-xs font-bold text-slate-800">
                        เลือกแผ่นงานที่ต้องการนำเข้า (Worksheet / Tab):
                      </label>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0369a1] bg-sky-100/80 px-2 py-0.5 rounded-full">
                      กำลังเลือก: {selectedSheetName}
                    </span>
                  </div>

                  {isLoadingWorksheets ? (
                    <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0369a1]" />
                      <span>กำลังตรวจหารายชื่อแผ่นงานใน Google Spreadsheet...</span>
                    </div>
                  ) : worksheets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {worksheets.map((ws) => {
                        const isSelected = selectedSheetName === ws.title;
                        return (
                          <button
                            key={`tab-select-${ws.gid}-${ws.title}`}
                            type="button"
                            onClick={() => handleSelectWorksheet(ws)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50/90 border-[#0369a1] text-[#0369a1] ring-1 ring-[#0369a1]'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <FileSpreadsheet
                                className={`w-4 h-4 shrink-0 ${
                                  isSelected ? 'text-[#0369a1]' : 'text-slate-400'
                                }`}
                              />
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">{ws.title}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  gid: {ws.gid}
                                </div>
                              </div>
                            </div>
                            {isSelected ? (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-[#0369a1] shrink-0 bg-sky-100 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3" />
                                <span>เลือกแล้ว</span>
                              </div>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      ระบุชื่อแผ่นงานในช่องช่วงข้อมูลด้านล่างได้โดยตรง
                    </div>
                  )}

                  {/* Range preview or toggle custom range */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="text-slate-600">
                      ช่วงข้อมูลที่จะดึง:{' '}
                      <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {activeRange}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRange(!isCustomRange);
                        if (!isCustomRange) {
                          setCustomRangeText(activeRange);
                        }
                      }}
                      className="text-[11px] text-[#0369a1] hover:underline font-semibold cursor-pointer"
                    >
                      {isCustomRange ? 'ใช้ค่าเริ่มต้นตามแผ่นงาน' : 'กำหนดช่วงเซลล์เอง'}
                    </button>
                  </div>

                  {isCustomRange && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customRangeText}
                        onChange={(e) => setCustomRangeText(e.target.value)}
                        placeholder={`'${selectedSheetName}'!A1:G100`}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-black placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0369a1]"
                      />
                    </div>
                  )}
                </div>

                {/* Column Guide */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#0369a1]" />
                    <span>โครงสร้างคอลัมน์ในแผ่นงานที่รองรับ:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pl-1">
                    <div>• ลำดับที่ยื่น (หรือ ลำดับ)</div>
                    <div>• วันที่บรรจุ</div>
                    <div>• เลื่อนตอบวันที่ (สำหรับจัดวาระใหม่)</div>
                    <div>• กระทู้ถามเรื่อง</div>
                    <div>• ผู้ตั้งถาม (สมาชิกวุฒิสภา)</div>
                    <div>• ถามรัฐมนตรี / สถานะ (ตอบแล้ว / ขอถอน)</div>
                  </div>
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
                        <span>ดึงข้อมูลจากแผ่นงาน "{selectedSheetName}"</span>
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
                    <span className="text-[11px] text-slate-400">
                      คัดลอกแถวจากแผ่นงานใดก็ได้มาวางได้ทันที
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="1	2026-09-07		มาตรการในการกำกับดูแล...	นายประพนธ์ ตั้งศรีเกียรติกุล	นายกรัฐมนตรี	รอการบรรจุ..."
                    className="w-full font-mono text-[11px] text-black bg-white p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * สามารถคลุมแถวในแผ่นงาน (เช่น Data หรือ 25 ส.ค. 69 - 22 ธ.ค. 69) แล้วกด Copy (Ctrl+C) นำมา Paste ลงในช่องนี้ได้ทันที
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
