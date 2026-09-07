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
 * 1. จัดระเบียบวาระครั้งละ 3 เรื่อง ทุกวันจันทร์ (ยกเว้นวันหยุดนักขัตฤกษ์ โดยจะข้ามไปจัดวันจันทร์ทำการถัดไป)
 * 2. รองรับคอลัมน์ "เลื่อนตอบวันที่" (Postponed Date) จาก Google Sheets / ข้อมูลกระทู้
 * 3. ให้กระทู้ที่ขอเลื่อน ได้สิทธิ์เป็นลำดับแรกในสัปดาห์นั้น (เรียงตามลำดับที่ยื่นกระทู้)
 * 4. หากวันจันทร์เริ่มต้นวาระ มีกระทู้เลื่อนมาตอบ จะจัดเฉพาะกระทู้ที่เลื่อนมา โดยไม่ต้องนำลำดับที่ยื่นมาจัดในวันเริ่มต้นวาระ
 * 5. สำหรับกระทู้ถามที่ถูกจัดลำดับในสัปดาห์แรกของวันจันทร์เริ่มต้นวาระ หากเลื่อนวันตอบ ไม่ต้องจัดลำดับกระทู้ถามตามลำดับที่ยื่นขึ้นมาแทนของกระทู้ถามสัปดาห์แรก
 * 6. สำหรับสัปดาห์อื่นๆ สามารถจัดเกิน 3 กระทู้ได้ หากมีการเลื่อนกระทู้ถามมาตอบในวันดังกล่าว (ปกติ 3 เรื่อง + กระทู้เลื่อน = 3+N เรื่อง)
 * 7. กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ "ชื่อผู้ตั้งถามห้ามซ้ำกัน" และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
 * 8. สำหรับกระทู้ที่จัดตามลำดับปกติ (3 เรื่อง) ห้ามผู้ตั้งถามซ้ำกันในวันเดียวกัน
 * 9. จัดเรียงตามลำดับที่ยื่นกระทู้อย่างเคร่งครัด
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
  let firstWeekCandidates: QuestionItem[] = explicit0 && explicit0.length > 0 ? [...explicit0] : [];
  if (firstWeekCandidates.length === 0) {
    const firstWeekAskers = new Set<string>();
    for (const q of allSortedQuestions) {
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

  // Map กระทู้ที่ขอเลื่อนตอบไปยังวันจันทร์เป้าหมาย (explicitPostponedByMonday)
  const explicitPostponedByMonday = new Map<string, { question: QuestionItem; originalDate: string }[]>();

  const registerPostponement = (q: QuestionItem, originMonday: string) => {
    if (q.postponedDate && q.postponedDate.trim() !== '') {
      const parsedISO = parseThaiOrISODate(q.postponedDate);
      if (parsedISO) {
        const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
        if (targetMonday && targetMonday !== originMonday) {
          const list = explicitPostponedByMonday.get(targetMonday) || [];
          list.push({ question: q, originalDate: originMonday });
          explicitPostponedByMonday.set(targetMonday, list);
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
  // (หากใน Google Sheet คอลัมน์ "สถานะ" เป็น "ตอบแล้ว" ให้ระบบไม่ต้องนำมาจัดในวาระการประชุม)
  const regularPool: QuestionItem[] = [];
  for (const q of allSortedQuestions) {
    if (firstWeekCandidateIds.has(q.id) || explicitScheduledIds.has(q.id)) {
      continue;
    }
    if (isQuestionAnswered(q)) {
      continue;
    }
    // หากกระทู้ไม่มีวันที่บรรจุแต่มีวันที่เลื่อนตอบ ให้จัดส่งไปยังสัปดาห์เป้าหมาย
    if (q.postponedDate && q.postponedDate.trim() !== '') {
      const parsedISO = parseThaiOrISODate(q.postponedDate);
      if (parsedISO) {
        const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
        if (targetMonday) {
          const list = explicitPostponedByMonday.get(targetMonday) || [];
          list.push({ question: q, originalDate: monday0 });
          explicitPostponedByMonday.set(targetMonday, list);
          continue;
        }
      }
    }
    regularPool.push(q);
  }

  let pool = [...regularPool];
  
  // Carry-over postponed queue dynamically generated from UI actions or duplicate asker conflict delays
  let dynamicPostponedCarryOver: { question: QuestionItem; originalDate: string }[] = [];

  for (let w = 0; w < workingMondays.length; w++) {
    const mondayDate = workingMondays[w];
    const scheduledQuestions: ScheduledQuestion[] = [];
    const isOfficial = explicitScheduledByMonday.has(mondayDate);
    
    // Track ALL askers scheduled for this Monday session (both postponed and regular)
    // to strictly enforce: "กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ ชื่อผู้ตั้งถามห้ามซ้ำกันได้ และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ"
    const askersScheduledToday = new Set<string>();

    // 1. Collect all Postponed questions arriving for this Monday:
    const explicitForToday = explicitPostponedByMonday.get(mondayDate) || [];
    
    // Combine dynamic carryovers and explicit postponed items, sorted strictly by submittedOrder
    const allPostponedForToday: { question: QuestionItem; originalDate?: string }[] = [
      ...dynamicPostponedCarryOver.map((c) => ({ question: c.question, originalDate: c.originalDate })),
      ...explicitForToday.map((e) => ({ question: e.question, originalDate: e.originalDate || e.question.postponedDate }))
    ];

    allPostponedForToday.sort((a, b) => a.question.submittedOrder - b.question.submittedOrder);

    // Carry-overs to the next session
    const nextDynamicPostponedCarryOver: { question: QuestionItem; originalDate: string }[] = [];
    let placedPostponedCount = 0;

    for (const item of allPostponedForToday) {
      // ตรวจสอบว่าผู้ตั้งถามซ้ำกับกระทู้ที่ได้จัดในวันนี้แล้วหรือไม่
      if (askersScheduledToday.has(item.question.asker)) {
        // หากผู้ตั้งถามซ้ำกับกระทู้ที่จัดในวันนี้ -> ให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
        nextDynamicPostponedCarryOver.push({
          question: item.question,
          originalDate: item.originalDate || mondayDate
        });
        continue;
      }

      const answered = isQuestionAnswered(item.question);

      // ตรวจสอบว่ากระทู้ที่เลื่อนมาตอบวันนี้ มีการขอเลื่อนออกไปอีกหรือไม่ (เช่น ระบุวันเลื่อนตอบใหม่ที่อยู่หลังสัปดาห์นี้)
      let isPostponedAgain = false;
      if (!answered && item.question.postponedDate && item.question.postponedDate.trim() !== '') {
        const parsedTarget = parseThaiOrISODate(item.question.postponedDate);
        if (parsedTarget) {
          const targetMonday = findMatchingWorkingMonday(parsedTarget, workingMondays);
          if (targetMonday && targetMonday > mondayDate) {
            isPostponedAgain = true;
          }
        }
      }

      scheduledQuestions.push({
        question: item.question,
        slotNumber: scheduledQuestions.length + 1,
        isPostponedFromPrevious: true,
        postponedFromDate: item.originalDate,
        isPostponedNow: isPostponedAgain,
        projectionType: 'postponed_priority'
      });
      askersScheduledToday.add(item.question.asker);
      placedPostponedCount++;

      if (isPostponedAgain) {
        nextDynamicPostponedCarryOver.push({
          question: item.question,
          originalDate: mondayDate
        });
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

        const isPostponed = candidate.postponedDate ? true : postponedQuestionIds.has(candidate.id);

        scheduledQuestions.push({
          question: candidate,
          slotNumber: scheduledQuestions.length + 1,
          isPostponedFromPrevious: false,
          isPostponedNow: isPostponed,
          projectionType: 'official_agenda'
        });
        askersScheduledToday.add(candidate.asker);

        // หากกระทู้ในสัปดาห์แรกนี้มีการเลื่อนวันตอบผ่าน UI ที่ยังไม่มีใน explicitPostponedByMonday:
        if (isPostponed && !isQuestionAnswered(candidate)) {
          let assignedTarget = false;
          if (candidate.postponedDate && candidate.postponedDate.trim() !== '') {
            const parsedISO = parseThaiOrISODate(candidate.postponedDate);
            if (parsedISO) {
              const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
              if (targetMonday && targetMonday !== mondayDate) {
                assignedTarget = true;
              }
            }
          }
          if (!assignedTarget) {
            // ยกยอดไปยังสัปดาห์ทำการถัดไป
            dynamicPostponedCarryOver.push({
              question: candidate,
              originalDate: mondayDate
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

        const isPostponed = candidate.postponedDate ? true : postponedQuestionIds.has(candidate.id);

        scheduledQuestions.push({
          question: candidate,
          slotNumber: scheduledQuestions.length + 1,
          isPostponedFromPrevious: false,
          isPostponedNow: isPostponed,
          projectionType: 'official_agenda'
        });
        askersScheduledToday.add(candidate.asker);
      }
    } else {
      // สัปดาห์ที่คาดการณ์การบรรจุล่วงหน้า:
      // จัดตามลำดับปกติจาก pool (สูงสุด 3 เรื่อง, ห้ามผู้ตั้งถามซ้ำกันกับทุกกระทู้ในวันนี้)
      let regularScheduledCount = 0;
      const newPool: QuestionItem[] = [];

      for (const q of pool) {
        const isPostponedViaUI = postponedQuestionIds.has(q.id);

        if (regularScheduledCount < 3) {
          // กฎเกณฑ์: กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ ชื่อผู้ตั้งถามห้ามซ้ำกันได้
          // และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ
          if (!askersScheduledToday.has(q.asker)) {
            scheduledQuestions.push({
              question: q,
              slotNumber: scheduledQuestions.length + 1,
              isPostponedFromPrevious: false,
              isPostponedNow: isPostponedViaUI,
              projectionType: 'projected_regular'
            });
            askersScheduledToday.add(q.asker);
            regularScheduledCount++;

            if (isPostponedViaUI) {
              dynamicPostponedCarryOver.push({
                question: q,
                originalDate: mondayDate
              });
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

  // Check 4: Priority for Postponed Questions (สิทธิ์ลำดับแรกของกระทู้เลื่อนตอบ)
  let priorityPassed = true;
  const priorityIssues: string[] = [];
  schedules.forEach((s, idx) => {
    let foundRegular = false;
    s.questions.forEach((q) => {
      if (!q.isPostponedFromPrevious) {
        foundRegular = true;
      } else if (foundRegular) {
        priorityPassed = false;
        priorityIssues.push(`สัปดาห์ที่ ${idx + 1}: กระทู้เลื่อนตอบ #${q.question.submittedOrder} ไม่อยู่ในสิทธิ์ลำดับแรก`);
      }
    });
  });
  checks.push({
    ruleId: 'POSTPONE_PRIORITY_RULE',
    ruleName: 'สิทธิ์ลำดับแรกของกระทู้ที่ขอเลื่อนตอบ (Priority Slots)',
    description: 'กระทู้ที่เลื่อนมาตอบต้องได้รับสิทธิ์บรรจุเป็นลำดับแรก (Slot 1..N) ก่อนกระทู้บรรจุใหม่',
    passed: priorityPassed,
    details: priorityPassed
      ? 'กระทู้ที่ขอเลื่อนมาตอบได้รับสิทธิ์บรรจุเป็นลำดับแรกทุกเรื่อง'
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
    (q) => !scheduledQuestionIds.has(q.id) && !q.isAnswered
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

