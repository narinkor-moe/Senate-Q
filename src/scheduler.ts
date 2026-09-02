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

      if (year > 2400) year -= 543;
      else if (year < 100) year += 2000;

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
      skippedHolidays.push({
        date: dateStr,
        name: customHolidays[dateStr]
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
 * 4. สามารถจัดเกิน 3 กระทู้ได้ หากมีการเลื่อนกระทู้ถามมาตอบในวันดังกล่าว (ปกติ 3 เรื่อง + กระทู้เลื่อน = 3+N เรื่อง)
 * 5. กระทู้ที่เลื่อนมาตอบวันเดียวกับที่จัดกระทู้ตามลำดับ "ชื่อผู้ตั้งถามสามารถซ้ำกันได้"
 * 6. สำหรับกระทู้ที่จัดตามลำดับปกติ (3 เรื่อง) ห้ามผู้ตั้งถามซ้ำกันในวันเดียวกัน
 * 7. จัดเรียงตามลำดับที่ยื่นกระทู้อย่างเคร่งครัด
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
  startDate: string = '2026-09-07',
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

  // Group questions that have explicit "postponedDate" (เลื่อนตอบวันที่) by their target working Monday
  const explicitPostponedByMonday = new Map<string, QuestionItem[]>();
  const regularPool: QuestionItem[] = [];

  for (const q of sortedQuestions) {
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
    
    // Track askers specifically for the REGULAR queue questions scheduled today
    const regularAskersInThisSession = new Set<string>();

    // 1. Collect all Postponed questions for this Monday:
    // A) Explicit postponed questions mapped to this Monday (from Google Sheets / data field)
    const explicitForToday = explicitPostponedByMonday.get(mondayDate) || [];
    
    // Combine dynamic carryovers and explicit postponed items, sorted strictly by submittedOrder
    const allPostponedForToday: { question: QuestionItem; originalDate?: string }[] = [
      ...dynamicPostponedCarryOver.map((c) => ({ question: c.question, originalDate: c.originalDate })),
      ...explicitForToday.map((q) => ({ question: q, originalDate: q.postponedDate }))
    ];

    allPostponedForToday.sort((a, b) => a.question.submittedOrder - b.question.submittedOrder);

    let placedPostponedCount = 0;
    for (const item of allPostponedForToday) {
      const isPostponedAgain = postponedQuestionIds.has(item.question.id);
      scheduledQuestions.push({
        question: item.question,
        slotNumber: scheduledQuestions.length + 1,
        isPostponedFromPrevious: true,
        postponedFromDate: item.originalDate,
        isPostponedNow: isPostponedAgain
      });
      placedPostponedCount++;
    }

    // Reset carry-overs
    dynamicPostponedCarryOver = [];

    // 2. Fill 3 REGULAR slots from the general pool:
    // "ให้นำไปจัดลำดับรวมกับกระทู้ถามที่จัดตามเงื่อนไข 3 กระทู้ถามต่อวันด้วย"
    // "โดยกระทู้ถามที่ขอเลื่อนให้ยกเว้นเงื่อนไขเรื่องชื่อซ้ำ"
    let regularScheduledCount = 0;
    const newPool: QuestionItem[] = [];

    for (const q of pool) {
      if (regularScheduledCount < 3) {
        // Check rule: No duplicate asker AMONG the regular questions scheduled today
        // (Note: It is explicitly ALLOWED to share asker name with postponed questions)
        if (!regularAskersInThisSession.has(q.asker)) {
          const isPostponed = postponedQuestionIds.has(q.id);
          scheduledQuestions.push({
            question: q,
            slotNumber: scheduledQuestions.length + 1,
            isPostponedFromPrevious: false,
            isPostponedNow: isPostponed
          });
          regularAskersInThisSession.add(q.asker);
          regularScheduledCount++;
        } else {
          // Cannot place today due to duplicate asker with another regular question, stays in pool
          newPool.push(q);
        }
      } else {
        // Regular capacity of 3 reached for today, stays in pool
        newPool.push(q);
      }
    }
    pool = newPool;

    // 3. Check if any question scheduled today was marked as "Postponed" (ขอเลื่อน) via interactive button
    // If postponed, they move to dynamicPostponedCarryOver for the NEXT working Monday!
    const effectiveScheduled: ScheduledQuestion[] = [];
    for (const sq of scheduledQuestions) {
      if (sq.isPostponedNow) {
        dynamicPostponedCarryOver.push({
          question: sq.question,
          originalDate: mondayDate
        });
      }
      effectiveScheduled.push(sq);
    }

    // Re-number slot numbers for clean display
    effectiveScheduled.forEach((sq, idx) => {
      sq.slotNumber = idx + 1;
    });

    const dynamicCapacity = 3 + placedPostponedCount;

    schedules.push({
      date: mondayDate,
      thaiDateFormatted: formatThaiDate(mondayDate),
      questions: effectiveScheduled,
      capacity: dynamicCapacity,
      baseCapacity: 3,
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

