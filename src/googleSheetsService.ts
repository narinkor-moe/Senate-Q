// Google Identity Services (GSI) and Google Sheets API integration helper
import { parseThaiOrISODate, formatThaiShortDate } from './scheduler';
import { QuestionItem } from './types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export const DEFAULT_SHEET_ID = '18tE6RON_7Z3BO-NtrF4jaqH_qP92A1-FiZ-RPACXGdU';
export const DEFAULT_SHEET_NAME = 'Data';
export const DEFAULT_RANGE = 'Data!A1:Z500';
export const GOOGLE_OAUTH_CLIENT_ID = '819658838500-8he6f1sam7g1c1ml8h9b1kp20ulmk4i3.apps.googleusercontent.com';

export interface GoogleUserSession {
  accessToken: string;
  expiresAt: number;
}

export interface SheetPostponeInfo {
  submittedOrder: number;
  sheetRowNumber: number; // 1-based row number in Google Sheet (e.g., Row 2 for Order 1)
  colLetter: string; // Column letter (e.g. "C")
  cellRange: string; // Range string (e.g. "Data!C2")
  rawDate: string; // Raw string from cell (e.g. "21 ก.ย. 26")
  parsedISO: string | null; // Parsed ISO YYYY-MM-DD (e.g. "2026-09-21")
  hasDate: boolean; // True if column "เลื่อนตอบวันที่" has a non-empty date
  rawStatus?: string; // สถานะตามคอลัมน์ใน Sheet เช่น "ตอบแล้ว", "เลื่อนตอบ", "รอการบรรจุ"
  isAnswered?: boolean; // True if status is "ตอบแล้ว"
}

let cachedSession: GoogleUserSession | null = null;

/**
 * Request an access token via Google Identity Services (GSI) OAuth 2.0 token client
 */
export async function requestGoogleToken(forcePrompt: boolean = false): Promise<string> {
  if (!forcePrompt && cachedSession && cachedSession.expiresAt > Date.now() + 60000) {
    return cachedSession.accessToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded. โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(`การยืนยันตัวตน Google ไม่สำเร็จ: ${resp.error}`));
            return;
          }
          if (resp.access_token) {
            cachedSession = {
              accessToken: resp.access_token,
              expiresAt: Date.now() + 3500 * 1000
            };
            resolve(resp.access_token);
          } else {
            reject(new Error('ไม่ได้รับ Access Token จาก Google'));
          }
        }
      });

      client.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
    } catch (err: any) {
      reject(new Error(err?.message || 'ไม่สามารถเริ่มต้น Google Token Client ได้'));
    }
  });
}

/**
 * Robust CSV string parser handling quoted fields, commas, escaped quotes, and newlines.
 */
export function parseCSVString(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push last remaining field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Fetch rows from a Google Sheet given spreadsheetId and range (e.g. "Data!A1:G100" or "Data")
 * Tries direct public GViz / CSV export first (zero auth needed for accessible sheets),
 * and falls back to authenticated Sheets API v4.
 */
export async function fetchSheetRows(
  spreadsheetId: string = DEFAULT_SHEET_ID,
  range: string = DEFAULT_RANGE,
  token?: string
): Promise<string[][]> {
  // Extract sheet name if given in range (e.g., "Data!A1:G100" -> sheet="Data", range="A1:G100")
  let sheetName = DEFAULT_SHEET_NAME;
  let sheetRange = '';
  if (range.includes('!')) {
    const parts = range.split('!');
    sheetName = parts[0];
    sheetRange = parts[1] || '';
  } else if (range.trim()) {
    sheetName = range.trim();
  }

  // 1. Try public GViz CSV endpoint first (fastest, zero friction)
  try {
    let gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    if (sheetRange) {
      gvizUrl += `&range=${encodeURIComponent(sheetRange)}`;
    }

    const gvizRes = await fetch(gvizUrl, { cache: 'no-cache' });
    if (gvizRes.ok) {
      const csvText = await gvizRes.text();
      // Check if response is HTML login page or valid CSV
      if (!csvText.includes('<!DOCTYPE html>') && !csvText.includes('<html')) {
        const parsed = parseCSVString(csvText);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Public GViz fetch failed, falling back to authenticated Google Sheets API:', err);
  }

  // 2. Fallback to authenticated Google Sheets API v4
  const authToken = token || (await requestGoogleToken());
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to fetch Google Sheet (${res.status})`
    );
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Fetch and parse column "เลื่อนตอบวันที่" for each submitted question from Google Sheet.
 * Returns a Map keyed by submittedOrder (ลำดับที่ยื่น: 1, 2, 3...)
 */
export async function fetchPostponeMapFromSheet(
  spreadsheetId: string = DEFAULT_SHEET_ID,
  sheetName: string = DEFAULT_SHEET_NAME
): Promise<Map<number, SheetPostponeInfo>> {
  const rows = await fetchSheetRows(spreadsheetId, `${sheetName}!A1:G100`);
  const resultMap = new Map<number, SheetPostponeInfo>();

  if (!rows || rows.length === 0) {
    return resultMap;
  }

  // Find header row and columns
  let headerIndex = -1;
  let colOrder = 0; // Col A
  let colPostponed = 2; // Col C
  let colStatus = 6; // Col G

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    if (!row) continue;
    const strRow = row.map((c) => String(c || '').trim().toLowerCase());

    const oIdx = strRow.findIndex((c) => c.includes('ลำดับ'));
    const pIdx = strRow.findIndex((c) => c.includes('เลื่อนตอบ') || c.includes('เลื่อน') || c.includes('ขอเลื่อน'));
    const stIdx = strRow.findIndex((c) => c.includes('สถานะ') || c.includes('status'));

    if (pIdx !== -1 || oIdx !== -1) {
      headerIndex = r;
      if (oIdx !== -1) colOrder = oIdx;
      if (pIdx !== -1) colPostponed = pIdx;
      if (stIdx !== -1) colStatus = stIdx;
      break;
    }
  }

  const startRowIdx = headerIndex !== -1 ? headerIndex + 1 : 1;
  const colLetter = String.fromCharCode(65 + colPostponed); // e.g. 'C'

  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawOrder = colOrder < row.length ? String(row[colOrder] || '').trim() : '';
    if (!/^\d+$/.test(rawOrder)) continue;
    const orderNum = parseInt(rawOrder, 10);
    if (isNaN(orderNum) || orderNum <= 0) continue;

    const rawPostponed = colPostponed < row.length ? String(row[colPostponed] || '').trim() : '';
    const rawStatus = colStatus !== -1 && colStatus < row.length ? String(row[colStatus] || '').trim() : '';
    const isAnswered = rawStatus.includes('ตอบแล้ว') || rawStatus.toLowerCase() === 'answered';
    const sheetRowNumber = i + 1; // 1-indexed row number in Google Sheet
    const cellRange = `${sheetName}!${colLetter}${sheetRowNumber}`;
    const parsedISO = rawPostponed ? parseThaiOrISODate(rawPostponed) : null;

    resultMap.set(orderNum, {
      submittedOrder: orderNum,
      sheetRowNumber,
      colLetter,
      cellRange,
      rawDate: rawPostponed,
      parsedISO,
      hasDate: rawPostponed.length > 0,
      rawStatus,
      isAnswered
    });
  }

  return resultMap;
}

/**
 * Format date for writing into the Google Sheet matching the parliamentary format
 * e.g. "14 ก.ย. 26" or "14 ก.ย. 2569"
 */
export function formatDateForSheet(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  // If already formatted, keep it; if ISO, format as Thai short date
  const parsedISO = parseThaiOrISODate(dateStr);
  if (parsedISO) {
    return formatThaiShortDate(parsedISO, true); // e.g. "14 ก.ย. 26"
  }
  return dateStr.trim();
}

/**
 * Update a specific cell in Google Sheet using Google Sheets API v4
 */
export async function updateSheetCell(
  spreadsheetId: string,
  range: string,
  value: string,
  token?: string
): Promise<{ success: boolean; updatedRange: string; writtenValue: string }> {
  const authToken = token || (await requestGoogleToken());

  // If value is empty, clear the cell
  if (!value || value.trim() === '') {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}:clear`;

    const res = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || `ลบข้อมูลใน Google Sheet ไม่สำเร็จ (${res.status})`
      );
    }

    return {
      success: true,
      updatedRange: range,
      writtenValue: ''
    };
  }

  // Update value with USER_ENTERED
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[value]]
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `บันทึกข้อมูลลงใน Google Sheet ไม่สำเร็จ (${res.status})`
    );
  }

  const resJson = await res.json();
  return {
    success: true,
    updatedRange: resJson.updatedRange || range,
    writtenValue: value
  };
}

/**
 * Save or clear the postponement date in Google Sheet for a given question's submittedOrder
 */
export async function savePostponeDateToSheet(
  submittedOrder: number,
  newDateISOOrThai: string | undefined,
  spreadsheetId: string = DEFAULT_SHEET_ID,
  sheetName: string = DEFAULT_SHEET_NAME
): Promise<{
  success: boolean;
  cellRange: string;
  sheetRowNumber: number;
  writtenValue: string;
}> {
  // First, find the exact row number for this submittedOrder
  let targetRowNumber = -1;
  let targetColLetter = 'C';

  try {
    const sheetMap = await fetchPostponeMapFromSheet(spreadsheetId, sheetName);
    const existing = sheetMap.get(submittedOrder);
    if (existing) {
      targetRowNumber = existing.sheetRowNumber;
      targetColLetter = existing.colLetter;
    }
  } catch (err) {
    console.warn('Could not fetch sheet map, calculating default row based on order:', err);
  }

  // Fallback formula: Row 1 is Header, Row 2 is Order 1, Row 3 is Order 2, etc.
  if (targetRowNumber <= 0) {
    targetRowNumber = submittedOrder + 1;
    targetColLetter = 'C';
  }

  const cellRange = `${sheetName}!${targetColLetter}${targetRowNumber}`;
  const writtenValue = newDateISOOrThai ? formatDateForSheet(newDateISOOrThai) : '';

  await updateSheetCell(spreadsheetId, cellRange, writtenValue);

  return {
    success: true,
    cellRange,
    sheetRowNumber: targetRowNumber,
    writtenValue
  };
}

/**
 * Parse 2D raw array of rows from Google Sheet into QuestionItem array
 */
export function parseSheetRowsToQuestions(rows: (string | number | undefined)[][]): QuestionItem[] {
  if (!rows || rows.length === 0) return [];

  let headerIndex = -1;
  let colOrder = -1;
  let colTopic = -1;
  let colAsker = -1;
  let colMinister = -1;
  let colPostponed = -1;
  let colScheduled = -1;
  let colStatus = -1;

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

    // Skip rows that are clearly not parliamentary questions (e.g. timestamps, chatbot logs, AI responses, notes)
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
      // Must have both valid topic and a realistic parliamentary asker/minister to even consider
      if (!topicVal || topicVal.length < 5 || (!askerVal && !ministerVal)) {
        continue;
      }
      // If topic contains typical markdown bullets or multi-paragraph text, skip it
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

      // Check if status is "ตอบแล้ว"
      const isAnswered = statusVal.includes('ตอบแล้ว') || statusVal.toLowerCase() === 'answered';
      let qStatus: QuestionItem['status'] = 'pending';
      if (isAnswered) {
        qStatus = 'completed';
      } else if (cleanPostponedDate) {
        qStatus = 'postponed';
      }

      parsedItems.push({
        id: `sheet-q-${orderVal}-${i + 1}`,
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
      });
    }
  }

  // Sort strictly by submittedOrder
  parsedItems.sort((a, b) => a.submittedOrder - b.submittedOrder);
  return parsedItems;
}

/**
 * Fetch all questions directly from Google Sheet and parse into QuestionItem array
 */
export async function fetchFullQuestionsFromSheet(
  spreadsheetId: string = DEFAULT_SHEET_ID,
  range: string = DEFAULT_RANGE
): Promise<QuestionItem[]> {
  const rows = await fetchSheetRows(spreadsheetId, range);
  return parseSheetRowsToQuestions(rows);
}

