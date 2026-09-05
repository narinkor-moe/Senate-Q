import { QuestionItem, WeeklySchedule, ScheduledQuestion, HolidayItem } from './types';

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
  // Sort pool of questions by submittedOrder
  const sortedQuestions = [...allQuestions].sort((a, b) => a.submittedOrder - b.submittedOrder);
  
  const { workingMondays, skippedHolidays } = getWorkingMondays(startDate, maxWeeks, customHolidays);
  const schedules: WeeklySchedule[] = [];

  // Determine the baseline candidates designated for the first week (w = 0)
  // based strictly on order of submission and unique askers (up to 3 questions)
  const firstWeekCandidates: QuestionItem[] = [];
  const firstWeekAskers = new Set<string>();
  for (const q of sortedQuestions) {
    if (!firstWeekAskers.has(q.asker)) {
      firstWeekCandidates.push(q);
      firstWeekAskers.add(q.asker);
      if (firstWeekCandidates.length === 3) break;
    }
  }
  const firstWeekCandidateIds = new Set(firstWeekCandidates.map((q) => q.id));

  // Group questions that have explicit "postponedDate" (เลื่อนตอบวันที่) by their target working Monday
  const explicitPostponedByMonday = new Map<string, QuestionItem[]>();
  const regularPool: QuestionItem[] = [];

  for (const q of sortedQuestions) {
    // First week candidates are handled specifically in week 0
    if (firstWeekCandidateIds.has(q.id)) {
      continue;
    }
    if (q.postponedDate && q.postponedDate.trim() !== '') {
      const parsedISO = parseThaiOrISODate(q.postponedDate);
      if (parsedISO) {
        const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
        const list = explicitPostponedByMonday.get(targetMonday) || [];
        list.push(q);
        explicitPostponedByMonday.set(targetMonday, list);
        continue;
      }
    }
    regularPool.push(q);
  }

  let pool = [...regularPool];
  
  // Carry-over postponed queue dynamically generated from previous sessions
  let dynamicPostponedCarryOver: { question: QuestionItem; originalDate: string }[] = [];

  for (let w = 0; w < workingMondays.length; w++) {
    const mondayDate = workingMondays[w];
    const scheduledQuestions: ScheduledQuestion[] = [];
    
    // Track ALL askers scheduled for this Monday session (both postponed and regular)
    // to strictly enforce: "กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ ชื่อผู้ตั้งถามห้ามซ้ำกันได้ และให้เลื่อนไปจัดลำดับในสัปดาห์ถัดๆ ไปที่ชื่อผู้ตั้งถามไม่ซ้ำ"
    const askersScheduledToday = new Set<string>();

    // 1. Collect all Postponed questions for this Monday:
    // A) Explicit postponed questions mapped to this Monday (from Google Sheets / data field)
    const explicitForToday = explicitPostponedByMonday.get(mondayDate) || [];
    
    // Combine dynamic carryovers and explicit postponed items, sorted strictly by submittedOrder
    const allPostponedForToday: { question: QuestionItem; originalDate?: string }[] = [
      ...dynamicPostponedCarryOver.map((c) => ({ question: c.question, originalDate: c.originalDate })),
      ...explicitForToday.map((q) => ({ question: q, originalDate: q.postponedDate }))
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

      const isPostponedAgain = postponedQuestionIds.has(item.question.id);
      scheduledQuestions.push({
        question: item.question,
        slotNumber: scheduledQuestions.length + 1,
        isPostponedFromPrevious: true,
        postponedFromDate: item.originalDate,
        isPostponedNow: isPostponedAgain
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
          pool.push(candidate);
          continue;
        }

        const isPostponed =
          postponedQuestionIds.has(candidate.id) ||
          !!(candidate.postponedDate && candidate.postponedDate.trim() !== '');

        scheduledQuestions.push({
          question: candidate,
          slotNumber: scheduledQuestions.length + 1,
          isPostponedFromPrevious: false,
          isPostponedNow: isPostponed
        });
        askersScheduledToday.add(candidate.asker);

        // หากกระทู้ในสัปดาห์แรกนี้มีการเลื่อนวันตอบ:
        // ให้ส่งต่อไปยังวันตอบที่กำหนด (หรือวันจันทร์ถัดไป) โดยได้สิทธิ์เป็นลำดับแรก
        if (isPostponed) {
          let assignedTarget = false;
          if (candidate.postponedDate && candidate.postponedDate.trim() !== '') {
            const parsedISO = parseThaiOrISODate(candidate.postponedDate);
            if (parsedISO) {
              const targetMonday = findMatchingWorkingMonday(parsedISO, workingMondays);
              if (targetMonday && targetMonday !== mondayDate) {
                const list = explicitPostponedByMonday.get(targetMonday) || [];
                list.push(candidate);
                explicitPostponedByMonday.set(targetMonday, list);
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
    } else {
      // สัปดาห์ถัดไป (w > 0): จัดตามลำดับปกติ (สูงสุด 3 เรื่อง, ห้ามผู้ตั้งถามซ้ำกันกับทุกกระทู้ในวันนี้)
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
              isPostponedNow: isPostponedViaUI
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
      postponedCount: placedPostponedCount
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

