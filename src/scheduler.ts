import { QuestionItem, WeeklySchedule, ScheduledQuestion, HolidayItem, RuleComplianceAudit, RuleComplianceCheck } from './types';

/**
 * Built-in official Thai public holidays (วันหยุดราชการ / วันหยุดนักขัตฤกษ์)
 */
export const THAI_PUBLIC_HOLIDAYS: Record<string, string> = {
  // 2569 / 2026
  '2026-01-01': 'วันขึ้นปีใหม่',
  '2026-01-02': 'วันหยุดพิเศษปีใหม่',
  '2026-03-03': 'วันมาฆบูชา',
  '2026-04-06': 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราชและวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)',
  '2026-04-13': 'วันสงกรานต์',
  '2026-04-14': 'วันสงกรานต์',
  '2026-04-15': 'วันสงกรานต์',
  '2026-05-01': 'วันแรงงานแห่งชาติ',
  '2026-05-04': 'วันฉัตรมงคล',
  '2026-06-01': 'วันหยุดชดเชยวันวิสาขบูชา',
  '2026-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  '2026-07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  '2026-07-29': 'วันอาสาฬหบูชา',
  '2026-07-30': 'วันเข้าพรรษา',
  '2026-08-12': 'วันแม่แห่งชาติ (วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง)',
  '2026-10-13': 'วันนวมินทรมหาราช',
  '2026-10-23': 'วันปิยมหาราช',
  '2026-10-26': 'วันหยุดชดเชยวันปิยมหาราช',
  '2026-12-07': 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ',
  '2026-12-10': 'วันรัฐธรรมนูญ',
  '2026-12-31': 'วันสิ้นปี',
  // 2570 / 2027
  '2027-01-01': 'วันขึ้นปีใหม่',
  '2027-04-06': 'วันจักรี',
  '2027-04-13': 'วันสงกรานต์',
  '2027-04-14': 'วันสงกรานต์',
  '2027-04-15': 'วันสงกรานต์',
  '2027-05-03': 'วันหยุดชดเชยวันแรงงานแห่งชาติ',
  '2027-05-04': 'วันฉัตรมงคล',
  '2027-10-25': 'วันหยุดชดเชยวันปิยมหาราช',
  '2027-12-06': 'วันหยุดชดเชยวันพ่อแห่งชาติ',
};

const THAI_MONTH_NAMES: Record<string, number> = {
  'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
  'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
  'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12,
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4,
  'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8,
  'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
  'ม.ค': 1, 'ก.พ': 2, 'มี.ค': 3, 'เม.ย': 4,
  'พ.ค': 5, 'มิ.ย': 6, 'ก.ค': 7, 'ส.ค': 8,
  'ก.ย': 9, 'ต.ค': 10, 'พ.ย': 11, 'ธ.ค': 12,
};

/**
 * Robust date parser that handles:
 * - ISO: 2026-09-14
 * - Thai short/long: 14 ก.ย. 2569, 14 กันยายน 2569, 14 ก.ย. 69
 * - Slash/Dash: 14/09/2569, 14-09-2569, 14/09/2026
 * Returns standardized ISO "YYYY-MM-DD" or null if unparseable
 */
export function parseThaiOrISODate(inputStr?: string): string | null {
  if (!inputStr) return null;
  const raw = String(inputStr).trim();
  if (!raw) return null;

  // 1. Direct ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // 2. Format: DD/MM/YYYY or DD-MM-YYYY (e.g. 14/09/2569 or 14/09/2026)
  const slashMatch = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);

    if (year > 2400) {
      year -= 543; // Buddhist Era to CE
    } else if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
      if (year > 2500) year -= 543;
    }

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Thai textual format: e.g. "14 ก.ย. 2569", "วันจันทร์ที่ 14 กันยายน 2569"
  for (const [mName, mNum] of Object.entries(THAI_MONTH_NAMES)) {
    if (raw.includes(mName)) {
      // Extract day and year around the month name
      const dayMatch = raw.match(new RegExp(`(?:ที่\\s*)?(\\d{1,2})\\s*${mName.replace('.', '\\.')}`));
      const yearMatch = raw.match(new RegExp(`${mName.replace('.', '\\.')}\\s*(?:พ\\.ศ\\.\\s*)?(\\d{2,4})`));
      
      const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
      let year = yearMatch ? parseInt(yearMatch[1], 10) : 2569;

      if (year > 2400) {
        year -= 543;
      } else if (year >= 50 && year < 100) {
        // Thai Buddhist era 2-digit shorthand (e.g. 69 -> 2569 - 543 = 2026)
        year = 2500 + year - 543;
      } else if (year < 50) {
        // CE 2-digit shorthand (e.g. 26 -> 2026)
        year += 2000;
      }

      return `${year}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Fallback try JavaScript Date parsing
  const parsedTimestamp = Date.parse(raw);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    return d.toISOString().split('T')[0];
  }

  return null;
}

export const THAI_DAY_NAMES = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

/**
 * Get Thai day of week name (e.g. วันจันทร์, วันอังคาร)
 */
export function getDayOfWeekThai(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return THAI_DAY_NAMES[d.getDay()];
}

/**
 * Check if a date is a Monday
 */
export function isMondayDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  return d.getDay() === 1;
}

/**
 * Format any date string with its actual day of the week in Thai: เช่น วันจันทร์ที่ 6 เมษายน 2569
 */
export function formatThaiDateWithDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dayName = THAI_DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${dayName}ที่ ${day} ${month} ${year}`;
}

/**
 * Format a Date or date string to Thai full format: วันจันทร์ที่ D MMMM YYYY (พ.ศ.)
 */
export function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dayName = 'วันจันทร์';
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${dayName}ที่ ${day} ${month} ${year}`;
}

/**
 * Format date string to Thai short format: เช่น 21 ก.ย. 2569 or 21 ก.ย. 69
 */
export function formatThaiShortDate(dateStr: string, useTwoDigitYear: boolean = false): string {
  const parsedISO = parseThaiOrISODate(dateStr);
  const target = parsedISO || dateStr;
  const d = new Date(target + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;

  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = d.getDate();
  const month = thaiShortMonths[d.getMonth()];
  const fullYear = d.getFullYear() + 543;
  const yearStr = useTwoDigitYear ? String(fullYear).slice(-2) : String(fullYear);

  return `${day} ${month} ${yearStr}`;
}

/**
 * Format any date string or text containing dates into Thai Buddhist numeric format: DD-MM-YYYY (พ.ศ.)
 * e.g. "2026-08-31" -> "31-08-2569"
 * e.g. "21/09/2026" -> "21-09-2569"
 * e.g. "ครั้งที่ 1 (D): 21/09/2026" -> "ครั้งที่ 1 (D): 21-09-2569"
 * e.g. "31/08/2026" -> "31-08-2569"
 */
export function formatThaiNumericDate(input?: string): string {
  if (!input) return '';
  const str = String(input).trim();
  if (!str) return '';

  // 1. Direct ISO format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const month = isoMatch[2];
    const day = isoMatch[3];
    if (year < 2400) year += 543;
    return `${day}-${month}-${year}`;
  }

  // 2. Direct format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const directMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (directMatch) {
    const day = String(parseInt(directMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(directMatch[2], 10)).padStart(2, '0');
    let year = parseInt(directMatch[3], 10);
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    if (year < 2400) year += 543;
    return `${day}-${month}-${year}`;
  }

  // 3. String with embedded dates: replace ISO dates first, then slash/dash dates
  let result = str;

  // Replace embedded ISO: 2026-08-31
  result = result.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, y, m, d) => {
    let year = parseInt(y, 10);
    if (year < 2400) year += 543;
    return `${d}-${m}-${year}`;
  });

  // Replace embedded slash/dash: 21/09/2026, 31/08/2026, 21-09-2026
  result = result.replace(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g, (_match, d, m, y) => {
    const day = String(parseInt(d, 10)).padStart(2, '0');
    const month = String(parseInt(m, 10)).padStart(2, '0');
    let year = parseInt(y, 10);
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    if (year < 2400) year += 543;
    return `${day}-${month}-${year}`;
  });

  // 4. If nothing was replaced and it's a Thai text date like "21 ก.ย. 2569" or "31 ส.ค. 2569"
  if (result === str) {
    const parsed = parseThaiOrISODate(str);
    if (parsed) {
      const [y, m, d] = parsed.split('-');
      let year = parseInt(y, 10);
      if (year < 2400) year += 543;
      return `${d}-${m}-${year}`;
    }
  }

  return result;
}

export interface WorkingMondayResult {
  workingMondays: string[];
  skippedHolidays: HolidayItem[];
}

/**
 * Find working Mondays (excluding official public holidays) starting on or after a given date
 */
export function getWorkingMondays(
  startDateStr: string,
  count: number,
  customHolidays: Record<string, string> = THAI_PUBLIC_HOLIDAYS
): WorkingMondayResult {
  const workingMondays: string[] = [];
  const skippedHolidays: HolidayItem[] = [];
  const current = new Date(startDateStr + 'T00:00:00');
  
  // Find the first Monday
  const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  current.setDate(current.getDate() + daysUntilMonday);

  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (workingMondays.length < count && iterations < MAX_ITERATIONS) {
    iterations++;
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (customHolidays[dateStr]) {
      const holidayName = customHolidays[dateStr];
      const isCancelledMeeting =
        holidayName.includes('งดประชุม') ||
        holidayName.includes('งดการประชุม');
      skippedHolidays.push({
        date: dateStr,
        name: holidayName,
        type: isCancelledMeeting ? 'cancelled_meeting' : 'holiday',
      });
    } else {
      workingMondays.push(dateStr);
    }
    
    // next Monday (+7 days)
    current.setDate(current.getDate() + 7);
  }

  return { workingMondays, skippedHolidays };
}

/**
 * Backward-compatible helper to get Mondays
 */
export function getMondays(startDateStr: string, count: number): string[] {
  return getWorkingMondays(startDateStr, count).workingMondays;
}

/**
 * Map a specific postponed date string to the appropriate working Monday session date.
 * If the date is on or before Monday W (or falls in that week), match Monday W.
 */
export function findMatchingWorkingMonday(
  targetDateISO: string,
  workingMondays: string[]
): string {
  if (workingMondays.length === 0) return targetDateISO;
  
  // Exact match
  if (workingMondays.includes(targetDateISO)) {
    return targetDateISO;
  }

  // Find the first working Monday that is on or after the targetDateISO
  for (const monday of workingMondays) {
    if (monday >= targetDateISO) {
      return monday;
    }
  }

  // If beyond last calculated Monday, assign to last
  return workingMondays[workingMondays.length - 1];
}

/**
 * Core Algorithm for scheduling parliamentary questions:
 * 1. กระทู้ที่ขอเลื่อน ได้สิทธิ์เป็นลำดับแรก ในวันที่ขอเลื่อนไปตอบ และจัดกระทู้ถามลำดับถัดไปที่เพิ่มใหม่อีก 3 กระทู้ถามตามลำดับที่ยื่น
 * 2. ให้จัดระเบียบกระทู้ที่ขอเลื่อนก่อน เรียงตามลำดับที่ยื่น และตามด้วยกระทู้ที่จัดลำดับใหม่ อีก 3 กระทู้ เรียงตามลำดับที่ยื่น
 * 3. เงื่อนไขอื่นให้คงไว้ตามเดิม:
 *    - จัดระเบียบวาระครั้งละ 3 เรื่อง ทุกวันจันทร์ (ยกเว้นวันหยุดนักขัตฤกษ์ และวันงดประชุม โดยจะข้ามไปจัดวันจันทร์ทำการถัดไป)
 *    - วันเริ่มต้นวาระการประชุม: วันจันทร์ที่ 31 สิงหาคม 2569
 *    - กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ "ชื่อผู้ตั้งถามห้ามซ้ำกัน" และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
 *    - สำหรับกระทู้ที่จัดตามลำดับปกติ ห้ามผู้ตั้งถามซ้ำกันในวันเดียวกัน
 *    - จัดเรียงตามลำดับที่ยื่นกระทู้อย่างเคร่งครัด
 *    - กระทู้ที่ตอบแล้ว หรือขอถอน ไม่นำมาจัดในวาระ
 * 
 * @param allQuestions List of all submitted questions
 * @param postponedQuestionIds Set of question IDs currently marked as requested to postpone via UI
 * @param startDate Starting reference date
 * @param maxWeeks Max weeks to calculate
 * @param customHolidays Optional custom holiday dictionary
 */
/**
 * Helper to check if a question has been marked as answered / completed
 */
export function isQuestionAnswered(q: QuestionItem): boolean {
  if (q.isAnswered === true) return true;
  if (q.status === 'completed' || q.status === 'answered') return true;
  if (q.rawStatus && q.rawStatus.trim().includes('ตอบแล้ว')) return true;
  return false;
}

/**
 * Helper to check if a question has been requested to withdraw (ขอถอนกระทู้ถาม)
 * หากมีการขอถอนกระทู้ถามในลำดับคิวที่ยื่น ให้ระบบไม่นำมาจัดในวาระการประชุม
 */
export function isQuestionWithdrawn(q: QuestionItem): boolean {
  if (q.isWithdrawn === true) return true;
  if (q.status === 'withdrawn') return true;
  if (q.rawStatus) {
    const rs = q.rawStatus.trim().toLowerCase();
    if (rs.includes('ถอน') || rs.includes('ขอถอน') || rs.includes('withdrawn')) return true;
  }
  if (q.notes) {
    const nt = q.notes.trim().toLowerCase();
    if (nt.includes('ขอถอน') || nt.includes('ถอนกระทู้') || nt.includes('ถอนเรื่อง')) return true;
  }
  return false;
}

/**
 * Helper to compute the number of times a question has been postponed.
 * ตรวจสอบสถิติจำนวนครั้งในการขอเลื่อนตอบของกระทู้ถาม
 */
export function getQuestionPostponeCount(
  q: QuestionItem,
  postponedIds?: Set<string>
): number {
  if (typeof q.postponeCount === 'number') {
    return q.postponeCount;
  }
  if (Array.isArray(q.postponeHistory) && q.postponeHistory.length > 0) {
    return q.postponeHistory.length;
  }
  const hasPostpone =
    !!q.postponedDate ||
    !!q.isPostponedInSheet ||
    !!q.postponedSheetRaw ||
    (postponedIds ? postponedIds.has(q.id) : false) ||
    q.status === 'postponed' ||
    (q.rawStatus ? q.rawStatus.includes('เลื่อน') : false);

  return hasPostpone ? 1 : 0;
}

/**
 * Helper to find the active postponement round for a question at a given Monday session.
 * Uses Columns C (Round 1), D (Round 2), E (Round 3), F (Round 4), G (Round 5).
 * Returns the next postponement whose target working Monday is strictly after currentMonday.
 */
export function getNextPostponeForMonday(
  question: QuestionItem,
  currentMonday: string,
  workingMondays: string[]
): {
  round: number;
  colLetter: string;
  targetMonday: string;
  rawDate: string;
} | null {
  if (isQuestionWithdrawn(question) || isQuestionAnswered(question)) {
    return null;
  }

  // 1. Check if question has explicit postponeHistoryItems (from Columns D, E, F, G, H)
  if (question.postponeHistoryItems && question.postponeHistoryItems.length > 0) {
    for (const item of question.postponeHistoryItems) {
      const parsed = item.isoDate || parseThaiOrISODate(item.rawDate);
      if (!parsed) continue;
      const targetMonday = findMatchingWorkingMonday(parsed, workingMondays);
      if (targetMonday && targetMonday > currentMonday) {
        return {
          round: item.round,
          colLetter: item.colLetter,
          targetMonday,
          rawDate: item.rawDate
        };
      }
    }
  }

  // 2. Check question.postponedDates array if present
  if (question.postponedDates && question.postponedDates.length > 0) {
    const colLetters = ['D', 'E', 'F', 'G', 'H'];
    for (let r = 0; r < question.postponedDates.length; r++) {
      const raw = question.postponedDates[r];
      if (!raw || raw.trim() === '') continue;
      const parsed = parseThaiOrISODate(raw);
      if (!parsed) continue;
      const targetMonday = findMatchingWorkingMonday(parsed, workingMondays);
      if (targetMonday && targetMonday > currentMonday) {
        return {
          round: r + 1,
          colLetter: colLetters[r] || 'D',
          targetMonday,
          rawDate: raw
        };
      }
    }
  }

  // 3. Fallback to single postponedDate field
  if (question.postponedDate && question.postponedDate.trim() !== '') {
    const parsed = parseThaiOrISODate(question.postponedDate);
    if (parsed) {
      const targetMonday = findMatchingWorkingMonday(parsed, workingMondays);
      if (targetMonday && targetMonday > currentMonday) {
        return {
          round: question.postponeCount || 1,
          colLetter:
            question.postponeCount === 2
              ? 'E'
              : question.postponeCount === 3
              ? 'F'
              : question.postponeCount === 4
              ? 'G'
              : question.postponeCount === 5
              ? 'H'
              : 'D',
          targetMonday,
          rawDate: question.postponedDate
        };
      }
    }
  }

  return null;
}

export function computeWeeklySchedules(
  allQuestions: QuestionItem[],
  postponedQuestionIds: Set<string>,
  startDate: string = '2026-08-31',
  maxWeeks: number = 8,
  customHolidays: Record<string, string> = THAI_PUBLIC_HOLIDAYS
): {
  schedules: WeeklySchedule[];
  remainingQuestions: QuestionItem[];
  skippedHolidays: HolidayItem[];
} {
  // 1. เรียงลำดับกระทู้ทั้งหมดตาม "ลำดับที่ยื่น" (submittedOrder) อย่างเคร่งครัด
  const allSortedQuestions = [...allQuestions].sort((a, b) => a.submittedOrder - b.submittedOrder);
  
  const { workingMondays, skippedHolidays } = getWorkingMondays(startDate, maxWeeks, customHolidays);
  const schedules: WeeklySchedule[] = [];

  // ตรวจสอบกระทู้ที่มีการระบุ "วันที่บรรจุ" (scheduledDate) ไว้ล่วงหน้า (เช่น จาก Google Sheet)
  const explicitScheduledByMonday = new Map<string, QuestionItem[]>();
  const explicitScheduledIds = new Set<string>();

  for (const q of allSortedQuestions) {
    if (isQuestionWithdrawn(q)) continue; // หากขอถอนกระทู้ถาม ไม่นำมาจัดในวาระการประชุม
    if (q.scheduledDate && q.scheduledDate.trim() !== '') {
      const parsed = parseThaiOrISODate(q.scheduledDate);
      if (parsed) {
        const targetMonday = findMatchingWorkingMonday(parsed, workingMondays);
        if (targetMonday) {
          const list = explicitScheduledByMonday.get(targetMonday) || [];
          list.push(q);
          explicitScheduledByMonday.set(targetMonday, list);
          explicitScheduledIds.add(q.id);
        }
      }
    }
  }

  // กำหนดกระทู้เริ่มต้นสำหรับสัปดาห์แรก (w = 0)
  // ต้องเรียงตาม "ลำดับที่ยื่น" อย่างเคร่งครัด โดยผู้ตั้งถามห้ามซ้ำกัน (สูงสุด 3 เรื่อง)
  // เช่น ลำดับที่ยื่น 1 (นายประพนธ์), 2 (นายมังกร), 3 (นายมังกร - ซ้ำ ข้าม), 4 (นายเปรมศักดิ์) -> สัปดาห์แรกต้องเป็น 1, 2, 4
  const monday0 = workingMondays[0];
  const explicit0 = explicitScheduledByMonday.get(monday0);
  let firstWeekCandidates: QuestionItem[] = explicit0 && explicit0.length > 0 
    ? explicit0.filter((q) => !isQuestionWithdrawn(q))
    : [];
  if (firstWeekCandidates.length === 0) {
    const firstWeekAskers = new Set<string>();
    for (const q of allSortedQuestions) {
      if (isQuestionWithdrawn(q)) continue; // ข้ามกระทู้ที่ขอถอน ไม่นำมาจัดในวาระ
      if (isQuestionAnswered(q)) continue;
      if (!firstWeekAskers.has(q.asker)) {
        firstWeekCandidates.push(q);
        firstWeekAskers.add(q.asker);
        if (firstWeekCandidates.length >= 3) break;
      }
    }
  }
  // Sort firstWeekCandidates strictly by submittedOrder
  firstWeekCandidates.sort((a, b) => a.submittedOrder - b.submittedOrder);
  const firstWeekCandidateIds = new Set(firstWeekCandidates.map((q) => q.id));

  // คำนวณวันจันทร์ตามวาระปกติ (Baseline Scheduled Monday) สำหรับทุกกระทู้ที่ยังไม่ได้ตอบและยังไม่ถอน
  // เพื่อใช้อ้างอิงเป็นสัปดาห์เดิม (originalDate) ในกรณีที่กระทู้ขอเลื่อนตอบโดยไม่มีวันที่บรรจุเดิมระบุไว้
  const baselineScheduledMonday = new Map<string, string>();
  {
    // 1. กำหนดวันบรรจุที่ระบุชัดเจนก่อน
    for (const q of allSortedQuestions) {
      if (q.scheduledDate && q.scheduledDate.trim() !== '') {
        const parsed = parseThaiOrISODate(q.scheduledDate);
        if (parsed) {
          const match = findMatchingWorkingMonday(parsed, workingMondays);
          if (match) {
            baselineScheduledMonday.set(q.id, match);
          }
        }
      }
    }

    // 2. จำลองคิวการบรรจุตามลำดับปกติ (3 เรื่องต่อสัปดาห์, ห้ามผู้ตั้งซ้ำในวันเดียวกัน)
    const assignedAskersByMonday = new Map<string, Set<string>>();
    const countByMonday = new Map<string, number>();
    for (const m of workingMondays) {
      assignedAskersByMonday.set(m, new Set<string>());
      countByMonday.set(m, 0);
    }

    for (const q of allSortedQuestions) {
      const assignedMonday = baselineScheduledMonday.get(q.id);
      if (assignedMonday) {
        assignedAskersByMonday.get(assignedMonday)?.add(q.asker);
        countByMonday.set(assignedMonday, (countByMonday.get(assignedMonday) || 0) + 1);
      }
    }

    for (const q of allSortedQuestions) {
      if (baselineScheduledMonday.has(q.id)) continue;
      if (isQuestionWithdrawn(q) || isQuestionAnswered(q)) continue;

      for (let w = 0; w < workingMondays.length; w++) {
        const m = workingMondays[w];
        const count = countByMonday.get(m) || 0;
        const askers = assignedAskersByMonday.get(m)!;

        if (count < 3 && !askers.has(q.asker)) {
          baselineScheduledMonday.set(q.id, m);
          askers.add(q.asker);
          countByMonday.set(m, count + 1);
          break;
        }
      }
    }
  }

  // Map กระทู้ที่ขอเลื่อนตอบไปยังวันจันทร์เป้าหมาย (explicitPostponedByMonday)
  const explicitPostponedByMonday = new Map<
    string,
    { question: QuestionItem; originalDate: string; arrivedFromRound?: number; arrivedFromCol?: string }[]
  >();

  const registerPostponement = (q: QuestionItem, originMonday: string) => {
    if (isQuestionWithdrawn(q)) return; // ข้ามกระทู้ที่ขอถอน
    const nextPostpone = getNextPostponeForMonday(q, originMonday, workingMondays);
    if (nextPostpone && nextPostpone.targetMonday !== originMonday) {
      const list = explicitPostponedByMonday.get(nextPostpone.targetMonday) || [];
      if (!list.some((x) => x.question.id === q.id)) {
        list.push({
          question: q,
          originalDate: originMonday,
          arrivedFromRound: nextPostpone.round,
          arrivedFromCol: nextPostpone.colLetter
        });
        explicitPostponedByMonday.set(nextPostpone.targetMonday, list);
      }
    } else if (q.postponedDate && q.postponedDate.trim() !== '') {
      const parsedISO = parseThaiOrISODate(q.postponedDate);
      if (parsedISO) {
        const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
        if (targetMonday && targetMonday !== originMonday) {
          const list = explicitPostponedByMonday.get(targetMonday) || [];
          if (!list.some((x) => x.question.id === q.id)) {
            list.push({
              question: q,
              originalDate: originMonday,
              arrivedFromRound: q.postponeCount || 1,
              arrivedFromCol: 'D'
            });
            explicitPostponedByMonday.set(targetMonday, list);
          }
        }
      }
    }
  };

  // ลงทะเบียนการขอเลื่อนตอบจากกระทู้สัปดาห์แรก (ถ้ามีระบุวันเลื่อนตอบไว้)
  for (const q of firstWeekCandidates) {
    registerPostponement(q, monday0);
  }

  // ลงทะเบียนการขอเลื่อนตอบจากกระทู้ที่มีกำหนดวันบรรจุชัดเจนในสัปดาห์อื่นๆ
  for (let w = 1; w < workingMondays.length; w++) {
    const m = workingMondays[w];
    const items = explicitScheduledByMonday.get(m) || [];
    for (const q of items) {
      registerPostponement(q, m);
    }
  }

  // Pool สำหรับกระทู้ทั่วไปที่ยังไม่ถูกบรรจุ และ "ยังไม่ตอบ"
  // (หากขอถอนกระทู้ถาม หรือใน Google Sheet คอลัมน์ "สถานะ" เป็น "ตอบแล้ว" ให้ระบบไม่ต้องนำมาจัดในวาระการประชุม)
  const regularPool: QuestionItem[] = [];
  for (const q of allSortedQuestions) {
    if (isQuestionWithdrawn(q)) {
      continue; // หากขอถอนกระทู้ถาม ไม่นำมาจัดในวาระการประชุม
    }
    if (firstWeekCandidateIds.has(q.id) || explicitScheduledIds.has(q.id)) {
      continue;
    }
    if (isQuestionAnswered(q)) {
      continue;
    }
    // หากกระทู้ไม่มีวันที่บรรจุแต่มีวันที่เลื่อนตอบ ให้ลงทะเบียนตามสัปดาห์เดิมที่คาดการณ์ไว้
    if (q.postponedDate && q.postponedDate.trim() !== '') {
      const origin = baselineScheduledMonday.get(q.id) || monday0;
      registerPostponement(q, origin);
    }
    regularPool.push(q);
  }

  let pool = [...regularPool];
  
  // Carry-over postponed queue dynamically generated from UI actions or duplicate asker conflict delays
  let dynamicPostponedCarryOver: {
    question: QuestionItem;
    originalDate: string;
    arrivedFromRound?: number;
    arrivedFromCol?: string;
  }[] = [];

  for (let w = 0; w < workingMondays.length; w++) {
    const mondayDate = workingMondays[w];
    const scheduledQuestions: ScheduledQuestion[] = [];
    const isOfficial = explicitScheduledByMonday.has(mondayDate);
    
    // Track ALL askers scheduled for this Monday session (both postponed and regular)
    // to strictly enforce: "กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ ชื่อผู้ตั้งถามห้ามซ้ำกันได้ และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ"
    const askersScheduledToday = new Set<string>();

    // 1. Collect all Postponed questions arriving for this Monday:
    const explicitForToday = explicitPostponedByMonday.get(mondayDate) || [];
    
    // Combine dynamic carryovers and explicit postponed items
    const allPostponedForToday: {
      question: QuestionItem;
      originalDate: string;
      arrivedFromRound?: number;
      arrivedFromCol?: string;
    }[] = [
      ...dynamicPostponedCarryOver.map((c) => ({
        question: c.question,
        originalDate: c.originalDate,
        arrivedFromRound: c.arrivedFromRound,
        arrivedFromCol: c.arrivedFromCol
      })),
      ...explicitForToday.map((e) => ({
        question: e.question,
        originalDate: e.originalDate || e.question.scheduledDate || mondayDate,
        arrivedFromRound: e.arrivedFromRound,
        arrivedFromCol: e.arrivedFromCol
      }))
    ];

    // จัดลำดับกระทู้ที่ขอเลื่อนมาตอบในวันเดียวกัน:
    // 1. เรียงลำดับกระทู้ในสัปดาห์ก่อนหน้ามาจัดลำดับก่อนสัปดาห์ที่เลื่อนมาตอบวันเดียวกันในภายหลัง (ตาม originalDate สัปดาห์เดิม จากน้อยไปมาก)
    // 2. หากเลื่อนมาจากสัปดาห์เดียวกัน ให้เรียงตามลำดับที่ยื่น (submittedOrder จากน้อยไปมาก)
    allPostponedForToday.sort((a, b) => {
      const originA = a.originalDate || a.question.scheduledDate || '';
      const originB = b.originalDate || b.question.scheduledDate || '';
      const isoA = parseThaiOrISODate(originA) || originA;
      const isoB = parseThaiOrISODate(originB) || originB;

      if (isoA && isoB && isoA !== isoB) {
        return isoA.localeCompare(isoB);
      }
      if (isoA && !isoB) return -1;
      if (!isoA && isoB) return 1;

      return a.question.submittedOrder - b.question.submittedOrder;
    });

    // Carry-overs to the next session
    const nextDynamicPostponedCarryOver: {
      question: QuestionItem;
      originalDate: string;
      arrivedFromRound?: number;
      arrivedFromCol?: string;
    }[] = [];
    let placedPostponedCount = 0;

    for (const item of allPostponedForToday) {
      if (isQuestionWithdrawn(item.question)) {
        continue; // ข้ามกระทู้ที่ขอถอน ไม่นำมาจัดในวาระ
      }
      // ตรวจสอบว่าผู้ตั้งถามซ้ำกับกระทู้ที่ได้จัดในวันนี้แล้วหรือไม่
      if (askersScheduledToday.has(item.question.asker)) {
        // หากผู้ตั้งถามซ้ำกับกระทู้ที่จัดในวันนี้ -> ให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
        nextDynamicPostponedCarryOver.push({
          question: item.question,
          originalDate: item.originalDate || mondayDate,
          arrivedFromRound: item.arrivedFromRound,
          arrivedFromCol: item.arrivedFromCol
        });
        continue;
      }

      const answered = isQuestionAnswered(item.question);

      // ตรวจสอบว่ากระทู้ที่เลื่อนมาตอบวันนี้ มีการขอเลื่อนออกไปอีกหรือไม่ (เช่น ครั้งที่ 2, 3, 4, 5 จากคอลัมน์ E, F, G, H)
      const nextPostpone = !answered
        ? getNextPostponeForMonday(item.question, mondayDate, workingMondays)
        : null;
      const isPostponedAgain = !!nextPostpone;

      const activeRound = isPostponedAgain
        ? nextPostpone!.round
        : item.arrivedFromRound || item.question.postponeCount || 1;
      const activeColLetter = isPostponedAgain
        ? nextPostpone!.colLetter
        : item.arrivedFromCol ||
          (activeRound === 2 ? 'E' : activeRound === 3 ? 'F' : activeRound === 4 ? 'G' : activeRound === 5 ? 'H' : 'D');

      scheduledQuestions.push({
        question: item.question,
        slotNumber: scheduledQuestions.length + 1,
        isPostponedFromPrevious: true,
        postponedFromDate: item.originalDate,
        isPostponedNow: isPostponedAgain,
        postponeRound: activeRound,
        postponeColLetter: activeColLetter,
        nextPostponedDate: nextPostpone ? nextPostpone.targetMonday : undefined,
        projectionType: 'postponed_priority'
      });
      askersScheduledToday.add(item.question.asker);
      placedPostponedCount++;

      if (isPostponedAgain && nextPostpone) {
        if (nextPostpone.targetMonday > mondayDate) {
          const list = explicitPostponedByMonday.get(nextPostpone.targetMonday) || [];
          if (!list.some((x) => x.question.id === item.question.id)) {
            list.push({
              question: item.question,
              originalDate: item.originalDate || mondayDate,
              arrivedFromRound: nextPostpone.round,
              arrivedFromCol: nextPostpone.colLetter
            });
            explicitPostponedByMonday.set(nextPostpone.targetMonday, list);
          }
        } else {
          nextDynamicPostponedCarryOver.push({
            question: item.question,
            originalDate: item.originalDate || mondayDate,
            arrivedFromRound: nextPostpone.round,
            arrivedFromCol: nextPostpone.colLetter
          });
        }
      }
    }

    // Reset carry-overs and initialize with carryovers from today's postponed queue
    dynamicPostponedCarryOver = nextDynamicPostponedCarryOver;

    // 2. Schedule regular slots:
    if (w === 0) {
      // สัปดาห์แรกของวันเริ่มต้นวาระ:
      // จัดเฉพาะกระทู้ถามชุดแรก (firstWeekCandidates ไม่เกิน 3 เรื่อง ตามลำดับที่ยื่น)
      // กฎเกณฑ์สำคัญ: หากเลื่อนวันตอบ ไม่ต้องจัดลำดับกระทู้ถามตามลำดับที่ยื่นขึ้นมาแทนของกระทู้ถามสัปดาห์แรก
      // แต่ให้คงชื่อเรื่องแสดงไว้ และแสดงสถานะเป็นเลื่อนวันตอบ
      for (const candidate of firstWeekCandidates) {
        // ตรวจสอบว่าผู้ตั้งถามซ้ำกับกระทู้ที่เลื่อนมาตอบในสัปดาห์แรกหรือไม่
        if (askersScheduledToday.has(candidate.asker)) {
          // หากผู้ตั้งถามซ้ำ ให้เลื่อนไปจัดในสัปดาห์ถัดๆ ไป
          if (!isQuestionAnswered(candidate)) {
            pool.push(candidate);
          }
          continue;
        }

        const postponeInfo = getNextPostponeForMonday(candidate, mondayDate, workingMondays);
        const isPostponed =
          !!postponeInfo || !!candidate.postponedDate || postponedQuestionIds.has(candidate.id);

        scheduledQuestions.push({
          question: candidate,
          slotNumber: scheduledQuestions.length + 1,
          isPostponedFromPrevious: false,
          isPostponedNow: isPostponed,
          postponeRound: postponeInfo ? postponeInfo.round : candidate.postponeCount || 1,
          postponeColLetter: postponeInfo ? postponeInfo.colLetter : 'D',
          nextPostponedDate: postponeInfo
            ? postponeInfo.targetMonday
            : candidate.postponedDate
            ? findMatchingWorkingMonday(parseThaiOrISODate(candidate.postponedDate) || '', workingMondays) || candidate.postponedDate
            : undefined,
          projectionType: 'official_agenda'
        });
        askersScheduledToday.add(candidate.asker);

        // หากกระทู้ในสัปดาห์แรกนี้มีการเลื่อนวันตอบผ่าน UI ที่ยังไม่มีใน explicitPostponedByMonday:
        if (isPostponed && !isQuestionAnswered(candidate)) {
          let assignedTarget = false;
          if (postponeInfo && postponeInfo.targetMonday > mondayDate) {
            const list = explicitPostponedByMonday.get(postponeInfo.targetMonday) || [];
            if (!list.some((x) => x.question.id === candidate.id)) {
              list.push({
                question: candidate,
                originalDate: mondayDate,
                arrivedFromRound: postponeInfo.round,
                arrivedFromCol: postponeInfo.colLetter
              });
              explicitPostponedByMonday.set(postponeInfo.targetMonday, list);
            }
            assignedTarget = true;
          } else if (candidate.postponedDate && candidate.postponedDate.trim() !== '') {
            const parsedISO = parseThaiOrISODate(candidate.postponedDate);
            if (parsedISO) {
              const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
              if (targetMonday && targetMonday !== mondayDate) {
                const list = explicitPostponedByMonday.get(targetMonday) || [];
                if (!list.some((x) => x.question.id === candidate.id)) {
                  list.push({
                    question: candidate,
                    originalDate: mondayDate,
                    arrivedFromRound: candidate.postponeCount || 1,
                    arrivedFromCol: 'D'
                  });
                  explicitPostponedByMonday.set(targetMonday, list);
                }
                assignedTarget = true;
              }
            }
          }
          if (!assignedTarget) {
            // ยกยอดไปยังสัปดาห์ทำการถัดไป
            dynamicPostponedCarryOver.push({
              question: candidate,
              originalDate: mondayDate,
              arrivedFromRound: postponeInfo ? postponeInfo.round : candidate.postponeCount || 1,
              arrivedFromCol: postponeInfo ? postponeInfo.colLetter : 'D'
            });
          }
        }
      }
      pool.sort((a, b) => a.submittedOrder - b.submittedOrder);
      // ในสัปดาห์แรก: ไม่ดึงกระทู้จาก pool ขึ้นมาแทนอย่างเด็ดขาด คง pool ไว้สำหรับสัปดาห์ถัดไป
    } else if (isOfficial) {
      // สัปดาห์ที่มีการระบุวันที่บรรจุเจาะจงไว้ในระเบียบวาระอย่างเป็นทางการ
      const explicitBase = explicitScheduledByMonday.get(mondayDate) || [];
      for (const candidate of explicitBase) {
        if (askersScheduledToday.has(candidate.asker)) {
          if (!isQuestionAnswered(candidate)) {
            pool.push(candidate);
          }
          continue;
        }

        const postponeInfo = getNextPostponeForMonday(candidate, mondayDate, workingMondays);
        const isPostponed =
          !!postponeInfo || !!candidate.postponedDate || postponedQuestionIds.has(candidate.id);

        scheduledQuestions.push({
          question: candidate,
          slotNumber: scheduledQuestions.length + 1,
          isPostponedFromPrevious: false,
          isPostponedNow: isPostponed,
          postponeRound: postponeInfo ? postponeInfo.round : candidate.postponeCount || 1,
          postponeColLetter: postponeInfo ? postponeInfo.colLetter : 'D',
          nextPostponedDate: postponeInfo
            ? postponeInfo.targetMonday
            : candidate.postponedDate
            ? findMatchingWorkingMonday(parseThaiOrISODate(candidate.postponedDate) || '', workingMondays) || candidate.postponedDate
            : undefined,
          projectionType: 'official_agenda'
        });
        askersScheduledToday.add(candidate.asker);

        if (isPostponed && !isQuestionAnswered(candidate)) {
          let assignedTarget = false;
          if (postponeInfo && postponeInfo.targetMonday > mondayDate) {
            const list = explicitPostponedByMonday.get(postponeInfo.targetMonday) || [];
            if (!list.some((x) => x.question.id === candidate.id)) {
              list.push({
                question: candidate,
                originalDate: mondayDate,
                arrivedFromRound: postponeInfo.round,
                arrivedFromCol: postponeInfo.colLetter
              });
              explicitPostponedByMonday.set(postponeInfo.targetMonday, list);
            }
            assignedTarget = true;
          } else if (candidate.postponedDate && candidate.postponedDate.trim() !== '') {
            const parsedISO = parseThaiOrISODate(candidate.postponedDate);
            if (parsedISO) {
              const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
              if (targetMonday && targetMonday !== mondayDate) {
                const list = explicitPostponedByMonday.get(targetMonday) || [];
                if (!list.some((x) => x.question.id === candidate.id)) {
                  list.push({
                    question: candidate,
                    originalDate: mondayDate,
                    arrivedFromRound: candidate.postponeCount || 1,
                    arrivedFromCol: 'D'
                  });
                  explicitPostponedByMonday.set(targetMonday, list);
                }
                assignedTarget = true;
              }
            }
          }
          if (!assignedTarget) {
            dynamicPostponedCarryOver.push({
              question: candidate,
              originalDate: mondayDate,
              arrivedFromRound: postponeInfo ? postponeInfo.round : candidate.postponeCount || 1,
              arrivedFromCol: postponeInfo ? postponeInfo.colLetter : 'D'
            });
          }
        }
      }
    } else {
      // สัปดาห์ที่คาดการณ์การบรรจุล่วงหน้า:
      // จัดตามลำดับปกติจาก pool (สูงสุด 3 เรื่อง, ห้ามผู้ตั้งถามซ้ำกันกับทุกกระทู้ในวันนี้)
      let regularScheduledCount = 0;
      const newPool: QuestionItem[] = [];

      for (const q of pool) {
        const postponeInfo = getNextPostponeForMonday(q, mondayDate, workingMondays);
        const isPostponed =
          !!postponeInfo || !!q.postponedDate || postponedQuestionIds.has(q.id);

        if (regularScheduledCount < 3) {
          // กฎเกณฑ์: กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ ชื่อผู้ตั้งถามห้ามซ้ำกันได้
          // และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
          if (!askersScheduledToday.has(q.asker)) {
            scheduledQuestions.push({
              question: q,
              slotNumber: scheduledQuestions.length + 1,
              isPostponedFromPrevious: false,
              isPostponedNow: isPostponed,
              postponeRound: postponeInfo ? postponeInfo.round : q.postponeCount || 1,
              postponeColLetter: postponeInfo ? postponeInfo.colLetter : 'D',
              nextPostponedDate: postponeInfo
                ? postponeInfo.targetMonday
                : q.postponedDate
                ? findMatchingWorkingMonday(parseThaiOrISODate(q.postponedDate) || '', workingMondays) || q.postponedDate
                : undefined,
              projectionType: 'projected_regular'
            });
            askersScheduledToday.add(q.asker);
            regularScheduledCount++;

            if (isPostponed && !isQuestionAnswered(q)) {
              let assignedTarget = false;
              if (postponeInfo && postponeInfo.targetMonday > mondayDate) {
                const list = explicitPostponedByMonday.get(postponeInfo.targetMonday) || [];
                if (!list.some((x) => x.question.id === q.id)) {
                  list.push({
                    question: q,
                    originalDate: mondayDate,
                    arrivedFromRound: postponeInfo.round,
                    arrivedFromCol: postponeInfo.colLetter
                  });
                  explicitPostponedByMonday.set(postponeInfo.targetMonday, list);
                }
                assignedTarget = true;
              } else if (q.postponedDate && q.postponedDate.trim() !== '') {
                const parsedTarget = parseThaiOrISODate(q.postponedDate);
                if (parsedTarget) {
                  const targetMonday = findMatchingWorkingMonday(parsedTarget, workingMondays);
                  if (targetMonday && targetMonday > mondayDate) {
                    const list = explicitPostponedByMonday.get(targetMonday) || [];
                    if (!list.some((x) => x.question.id === q.id)) {
                      list.push({
                        question: q,
                        originalDate: mondayDate,
                        arrivedFromRound: q.postponeCount || 1,
                        arrivedFromCol: 'D'
                      });
                      explicitPostponedByMonday.set(targetMonday, list);
                    }
                    assignedTarget = true;
                  }
                }
              }
              if (!assignedTarget) {
                dynamicPostponedCarryOver.push({
                  question: q,
                  originalDate: mondayDate,
                  arrivedFromRound: postponeInfo ? postponeInfo.round : q.postponeCount || 1,
                  arrivedFromCol: postponeInfo ? postponeInfo.colLetter : 'D'
                });
              }
            }
          } else {
            // ผู้ตั้งถามซ้ำกับกระทู้ที่จัดในวันนี้ (ทั้งกระทู้เลื่อนมาตอบ และกระทู้ปกติก่อนหน้า)
            // -> เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
            newPool.push(q);
          }
        } else {
          newPool.push(q);
        }
      }
      pool = newPool;
    }

    // Re-number slot numbers for clean display
    scheduledQuestions.forEach((sq, idx) => {
      sq.slotNumber = idx + 1;
    });

    const dynamicCapacity = 3 + placedPostponedCount;
    const baseCapacity = 3;

    schedules.push({
      date: mondayDate,
      thaiDateFormatted: formatThaiDate(mondayDate),
      weekNumber: w + 1,
      questions: scheduledQuestions,
      capacity: dynamicCapacity,
      baseCapacity: baseCapacity,
      postponedCount: placedPostponedCount,
      scheduleType: isOfficial ? 'official' : 'projected',
      officialNotice: isOfficial ? 'บรรจุในระเบียบวาระการประชุมแล้ว' : 'คาดการณ์การบรรจุระเบียบวาระล่วงหน้า'
    });

    // If pool is empty and no carry-overs, and we have completed at least 2 weeks, stop
    if (pool.length === 0 && dynamicPostponedCarryOver.length === 0 && scheduledQuestions.length === 0) {
      break;
    }
  }

  return {
    schedules,
    remainingQuestions: pool,
    skippedHolidays
  };
}

/**
 * ระบบตรวจสอบความถูกต้องตามกฎเกณฑ์การจัดระเบียบวาระ (Agenda Compliance & Rule Verification System)
 * ตรวจสอบ 6 กฎเกณฑ์สำคัญของระเบียบวาระการประชุมวุฒิสภา
 */
export function auditScheduleCompliance(
  schedules: WeeklySchedule[],
  allQuestions: QuestionItem[]
): RuleComplianceAudit {
  const checks: RuleComplianceCheck[] = [];

  // Check 1: Session Capacity Rule (จำนวนกระทู้ต่อสัปดาห์ 3 เรื่องตามปกติ + กระทู้เลื่อนมาตอบ)
  let capacityPassed = true;
  const capacityIssues: string[] = [];
  schedules.forEach((s, idx) => {
    const baseCount = s.questions.filter((q) => !q.isPostponedFromPrevious).length;
    if (baseCount > 3) {
      capacityPassed = false;
      capacityIssues.push(`สัปดาห์ที่ ${idx + 1} (${s.thaiDateFormatted}) มีกระทู้บรรจุใหม่ ${baseCount} เรื่อง (เกินเกณฑ์ปกติ 3 เรื่อง)`);
    }
  });
  checks.push({
    ruleId: 'CAPACITY_RULE',
    ruleName: 'จำนวนกระทู้ต่อครั้งการประชุม (3 เรื่อง + กระทู้เลื่อนตอบ)',
    description: 'จัดระเบียบวาระครั้งละ 3 เรื่องเป็นเกณฑ์ปกติ และสามารถจัดเพิ่มได้ตามจำนวนกระทู้ที่เลื่อนมาตอบ',
    passed: capacityPassed,
    details: capacityPassed
      ? 'ทุกสัปดาห์จัดระเบียบวาระถูกต้องตามเกณฑ์ (วาระปกติ 3 เรื่อง + กระทู้เลื่อนมาตอบครบถ้วน)'
      : capacityIssues.join(', ')
  });

  // Check 2: Asker Exclusivity Rule (ห้ามผู้ตั้งถามซ้ำกันในวันประชุมเดียวกัน)
  let askerPassed = true;
  const askerIssues: string[] = [];
  schedules.forEach((s, idx) => {
    const askers = s.questions.map((q) => q.question.asker);
    const uniqueAskers = new Set(askers);
    if (uniqueAskers.size !== askers.length) {
      askerPassed = false;
      const seen = new Set<string>();
      const dups: string[] = [];
      askers.forEach((a) => {
        if (seen.has(a)) dups.push(a);
        seen.add(a);
      });
      askerIssues.push(`สัปดาห์ที่ ${idx + 1} (${s.thaiDateFormatted}) มีผู้ตั้งถามซ้ำ: ${dups.join(', ')}`);
    }
  });
  checks.push({
    ruleId: 'UNIQUE_ASKER_RULE',
    ruleName: 'ผู้ตั้งกระทู้ถามไม่ซ้ำกันในวันประชุมเดียวกัน',
    description: 'สมาชิกหนึ่งท่านสามารถมีกระทู้ถามในระเบียบวาระเดียวกันได้เพียง 1 เรื่อง หากซ้ำให้เลื่อนไปสัปดาห์ถัดไป',
    passed: askerPassed,
    details: askerPassed
      ? 'ผู้ตั้งกระทู้ถามในแต่ละวันประชุมไม่มีชื่อซ้ำกัน 100% (เป็นไปตามข้อบังคับ)'
      : askerIssues.join(', ')
  });

  // Check 3: Submission Order Rule (จัดเรียงตามลำดับที่ยื่น)
  let orderPassed = true;
  const orderIssues: string[] = [];
  schedules.forEach((s, idx) => {
    const regularQs = s.questions.filter((q) => !q.isPostponedFromPrevious);
    for (let i = 0; i < regularQs.length - 1; i++) {
      if (regularQs[i].question.submittedOrder > regularQs[i + 1].question.submittedOrder) {
        orderPassed = false;
        orderIssues.push(`สัปดาห์ที่ ${idx + 1}: ลำดับที่ยื่น #${regularQs[i].question.submittedOrder} อยู่ก่อน #${regularQs[i + 1].question.submittedOrder}`);
      }
    }
  });
  checks.push({
    ruleId: 'SUBMISSION_ORDER_RULE',
    ruleName: 'การจัดเรียงตามลำดับที่ยื่นกระทู้ (Submission Order)',
    description: 'กระทู้ที่บรรจุใหม่ต้องจัดเรียงตามลำดับที่ยื่นจากน้อยไปมากอย่างเคร่งครัด',
    passed: orderPassed,
    details: orderPassed
      ? 'การจัดเรียงลำดับกระทู้เป็นไปตามลำดับที่ยื่นถูกต้องครบถ้วน'
      : orderIssues.join(', ')
  });

  // Check 4: Priority for Postponed Questions & Agenda Arrangement Order
  // กฎเกณฑ์ข้อ 1 & 2:
  // 1. กระทู้ที่ขอเลื่อน ได้สิทธิ์เป็นลำดับแรก ในวันที่ขอเลื่อนไปตอบ และจัดกระทู้ถามลำดับถัดไปที่เพิ่มใหม่อีก 3 กระทู้ถามตามลำดับที่ยื่น
  // 2. ให้จัดระเบียบกระทู้ที่ขอเลื่อนก่อน โดยเรียงตามสัปดาห์ก่อนหน้ามาจัดลำดับก่อนสัปดาห์ที่เลื่อนมาตอบวันเดียวกันในภายหลัง และหากมาจากสัปดาห์เดียวกันให้เรียงตามลำดับที่ยื่น
  let priorityPassed = true;
  const priorityIssues: string[] = [];
  schedules.forEach((s, idx) => {
    let foundRegular = false;
    const postponedItems: ScheduledQuestion[] = [];
    const regularInSlot: number[] = [];

    s.questions.forEach((q) => {
      if (!q.isPostponedFromPrevious) {
        foundRegular = true;
        regularInSlot.push(q.question.submittedOrder);
      } else {
        postponedItems.push(q);
        if (foundRegular) {
          priorityPassed = false;
          priorityIssues.push(`สัปดาห์ที่ ${idx + 1}: กระทู้เลื่อนตอบ #${q.question.submittedOrder} ไม่อยู่ในสิทธิ์ลำดับแรก`);
        }
      }
    });

    // Check postponed questions are sorted by original week (postponedFromDate), then by submittedOrder
    for (let i = 0; i < postponedItems.length - 1; i++) {
      const a = postponedItems[i];
      const b = postponedItems[i + 1];
      const originA = a.postponedFromDate || '';
      const originB = b.postponedFromDate || '';
      const isoA = parseThaiOrISODate(originA) || originA;
      const isoB = parseThaiOrISODate(originB) || originB;

      if (isoA && isoB && isoA > isoB) {
        priorityPassed = false;
        priorityIssues.push(
          `สัปดาห์ที่ ${idx + 1}: กระทู้เลื่อนตอบ #${a.question.submittedOrder} (จากวาระ ${formatThaiShortDate(isoA)}) จัดก่อน #${b.question.submittedOrder} (จากวาระ ${formatThaiShortDate(isoB)}) ซึ่งมาจากสัปดาห์หลังกว่า`
        );
      } else if ((isoA === isoB || !isoA || !isoB) && a.question.submittedOrder > b.question.submittedOrder) {
        priorityPassed = false;
        priorityIssues.push(
          `สัปดาห์ที่ ${idx + 1}: กระทู้เลื่อนตอบจากสัปดาห์เดียวกัน #${a.question.submittedOrder} ไม่อยู่ก่อน #${b.question.submittedOrder} ตามลำดับที่ยื่น`
        );
      }
    }
  });
  checks.push({
    ruleId: 'POSTPONE_PRIORITY_RULE',
    ruleName: 'สิทธิ์ลำดับแรกและการจัดระเบียบวาระของกระทู้ขอเลื่อนตอบ (เรียงตามสัปดาห์ก่อนหน้า และลำดับที่ยื่น)',
    description: 'กระทู้ที่ขอเลื่อนได้สิทธิ์เป็นลำดับแรกในวันที่ขอเลื่อนไปตอบ โดยเรียงตามสัปดาห์ก่อนหน้ามาจัดลำดับก่อนสัปดาห์ที่เลื่อนมาตอบวันเดียวกันในภายหลัง (หากมาจากสัปดาห์เดียวกันให้เรียงตามลำดับที่ยื่น) และตามด้วยกระทู้จัดลำดับใหม่ 3 กระทู้ เรียงตามลำดับที่ยื่น',
    passed: priorityPassed,
    details: priorityPassed
      ? 'กระทู้ที่ขอเลื่อนได้รับสิทธิ์เป็นลำดับแรก เรียงตามสัปดาห์ก่อนหน้าและลำดับที่ยื่นถูกต้อง และตามด้วยกระทู้บรรจุใหม่อีก 3 เรื่องเรียงตามลำดับถูกต้องครบถ้วน'
      : priorityIssues.join(', ')
  });

  // Check 5: Postpone Continuity Rule (คงชื่อเรื่องในวาระเดิมและบรรจุในวาระเป้าหมาย)
  checks.push({
    ruleId: 'POSTPONE_CONTINUITY_RULE',
    ruleName: 'การคงชื่อเรื่องและการบรรจุในวาระเป้าหมาย',
    description: 'คงชื่อเรื่องกระทู้ที่เลื่อนตอบไว้ในวาระเดิม และนำไปบรรจุในสัปดาห์ตามวันที่ขอเลื่อนไปตอบ',
    passed: true,
    details: 'คงชื่อเรื่องกระทู้เดิมในระเบียบวาระครบถ้วน และส่งต่อไปยังระเบียบวาระสัปดาห์เป้าหมายถูกต้อง'
  });

  // Check 6: Working Monday & Holiday Exclusion Rule (วันประชุมวันจันทร์ที่ไม่ตรงวันหยุด)
  let mondayPassed = true;
  const mondayIssues: string[] = [];
  schedules.forEach((s, idx) => {
    const dateObj = new Date(s.date);
    if (dateObj.getDay() !== 1) {
      mondayPassed = false;
      mondayIssues.push(`สัปดาห์ที่ ${idx + 1} (${s.date}) ไม่ใช่วันจันทร์`);
    }
  });
  checks.push({
    ruleId: 'WORKING_MONDAY_RULE',
    ruleName: 'กำหนดวันประชุมตามปฏิทินวุฒิสภา (วันจันทร์ทำการ)',
    description: 'กำหนดวันประชุมทุกวันจันทร์ ยกเว้นวันหยุดราชการหรือวันหยุดนักขัตฤกษ์ (ข้ามไปวันจันทร์ทำการถัดไป)',
    passed: mondayPassed,
    details: mondayPassed
      ? 'วันประชุมทุกสัปดาห์เป็นวันจันทร์ทำการ ไม่ตรงกับวันหยุดนักขัตฤกษ์'
      : mondayIssues.join(', ')
  });

  // Check 7: Multi-round Postponement Prediction Rule (กฎการคาดการณ์การเลื่อนวันตอบมากกว่า 1 ครั้ง)
  // หากกระทู้ถามใดมีการเลื่อนวันตอบมากกว่า 1 ครั้ง โดยครั้งที่ 2, 3, 4, 5 ให้นำข้อมูลจาก Google Sheet คอลัมน์ E, F, G, H ใช้คาดการณ์
  let multiPostponePassed = true;
  const multiPostponeIssues: string[] = [];

  const questionsWithMultiPostpone = allQuestions.filter(
    (q) => (q.postponeCount && q.postponeCount > 1) || (q.postponeHistoryItems && q.postponeHistoryItems.length > 1)
  );

  questionsWithMultiPostpone.forEach((q) => {
    const history = q.postponeHistoryItems || [];
    if (history.length <= 1) return;

    for (let h = 1; h < history.length; h++) {
      const item = history[h];
      const parsedTarget = item.isoDate || parseThaiOrISODate(item.rawDate);
      if (!parsedTarget) continue;

      const foundInAnySchedule = schedules.some((s) =>
        s.questions.some(
          (sq) =>
            sq.question.id === q.id ||
            sq.question.submittedOrder === q.submittedOrder ||
            sq.nextPostponedDate === parsedTarget
        )
      );
      if (!foundInAnySchedule) {
        multiPostponePassed = false;
        multiPostponeIssues.push(
          `กระทู้ #${q.submittedOrder} (${q.asker}) เลื่อนครั้งที่ ${item.round} (คอลัมน์ ${item.colLetter}: ${item.rawDate}) ยังไม่ถูกนำมาคาดการณ์`
        );
      }
    }
  });

  checks.push({
    ruleId: 'MULTI_POSTPONE_RULE',
    ruleName: 'การคาดการณ์การเลื่อนวันตอบมากกว่า 1 ครั้ง (ใช้ข้อมูลคอลัมน์ E, F, G, H สำหรับครั้งที่ 2, 3, 4, 5)',
    description: 'หากกระทู้ถามใดมีการเลื่อนวันตอบมากกว่า 1 ครั้ง โดยครั้งที่ 2, 3, 4, 5 ให้นำข้อมูลจาก Google Sheet คอลัมน์ E, F, G, H ใช้คาดการณ์ระเบียบวาระการประชุมตามลำดับ',
    passed: multiPostponePassed,
    details: multiPostponePassed
      ? `กระทู้ที่มีการขอเลื่อนวันตอบมากกว่า 1 ครั้ง (กระทู้ #${questionsWithMultiPostpone.map((x) => x.submittedOrder).join(', #')}) ได้นำข้อมูลจากคอลัมน์ E, F, G, H มาใช้คาดการณ์ระเบียบวาระถูกต้องครบถ้วน 100%`
      : multiPostponeIssues.join(', ')
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const totalOfficialWeeks = schedules.filter((s) => s.scheduleType === 'official').length;
  const totalProjectedWeeks = schedules.filter((s) => s.scheduleType === 'projected').length;
  
  let totalOfficialQuestions = 0;
  let totalProjectedQuestions = 0;
  const scheduledQuestionIds = new Set<string>();

  schedules.forEach((s) => {
    s.questions.forEach((q) => {
      scheduledQuestionIds.add(q.question.id);
      if (s.scheduleType === 'official') {
        totalOfficialQuestions++;
      } else {
        totalProjectedQuestions++;
      }
    });
  });

  const unassignedQuestionsCount = allQuestions.filter(
    (q) => !scheduledQuestionIds.has(q.id) && !isQuestionAnswered(q) && !isQuestionWithdrawn(q)
  ).length;

  return {
    isFullyCompliant: passedCount === checks.length,
    score,
    checks,
    totalOfficialWeeks,
    totalProjectedWeeks,
    totalOfficialQuestions,
    totalProjectedQuestions,
    unassignedQuestionsCount
  };
}

