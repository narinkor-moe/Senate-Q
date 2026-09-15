import { QuestionItem, WeeklySchedule, PostponeHistoryItem } from '../types';
import {
  isQuestionAnswered,
  isQuestionWithdrawn,
  getQuestionPostponeCount,
  formatThaiDateWithDayOfWeek,
  parseThaiOrISODate,
  formatThaiShortDate,
} from '../scheduler';

export interface PostponeRoundSummary {
  round: number;
  colLetter: string;
  count: number;
  percentage: number;
  questions: QuestionItem[];
}

export interface MinisterPostponeSummary {
  minister: string;
  questionCount: number;
  postponeTimes: number;
  percentage: number;
  questions: QuestionItem[];
}

export interface AskerPostponeSummary {
  asker: string;
  questionCount: number;
  postponeTimes: number;
  percentage: number;
  questions: QuestionItem[];
}

export interface TargetDatePostponeSummary {
  targetMondayISO: string;
  thaiDateFormatted: string;
  count: number;
  items: {
    question: QuestionItem;
    round: number;
    colLetter: string;
    rawDate: string;
  }[];
}

export interface PostponeHistoryEntry {
  question: QuestionItem;
  submittedOrder: number;
  topic: string;
  asker: string;
  minister: string;
  rounds: PostponeHistoryItem[];
  totalRounds: number;
  latestRound?: PostponeHistoryItem;
  currentPlacement?: {
    thaiDate: string;
    weekIndex: number;
    slotNumber: number;
    scheduleType?: 'official' | 'projected';
  };
  statusCategory: 'official' | 'projected' | 'answered' | 'withdrawn' | 'pending';
  statusLabel: string;
}

export interface PostponeAnalytics {
  totalQuestions: number;
  totalPostponedQuestions: number;
  totalPostponeTimes: number;
  percentagePostponed: number;
  singlePostponeCount: number;
  multiPostponeCount: number;
  maxPostponeRound: number;
  roundSummaries: PostponeRoundSummary[];
  topMinisters: MinisterPostponeSummary[];
  topAskers: AskerPostponeSummary[];
  targetDates: TargetDatePostponeSummary[];
  historyEntries: PostponeHistoryEntry[];
  answeredPostponedCount: number;
  withdrawnPostponedCount: number;
  activeScheduledPostponedCount: number;
}

const ROUND_COLUMNS: { round: number; colLetter: string; name: string }[] = [
  { round: 1, colLetter: 'C', name: 'ครั้งที่ 1 (คอลัมน์ C)' },
  { round: 2, colLetter: 'D', name: 'ครั้งที่ 2 (คอลัมน์ D)' },
  { round: 3, colLetter: 'E', name: 'ครั้งที่ 3 (คอลัมน์ E)' },
  { round: 4, colLetter: 'F', name: 'ครั้งที่ 4 (คอลัมน์ F)' },
  { round: 5, colLetter: 'G', name: 'ครั้งที่ 5 (คอลัมน์ G)' },
];

/**
 * Extract or build complete postpone history items for a question
 */
export function getQuestionPostponeHistoryItems(
  q: QuestionItem,
  postponedIds?: Set<string>
): PostponeHistoryItem[] {
  // If already loaded as postponeHistoryItems
  if (Array.isArray(q.postponeHistoryItems) && q.postponeHistoryItems.length > 0) {
    return q.postponeHistoryItems;
  }

  // If array of postponedDates exists
  if (Array.isArray(q.postponedDates) && q.postponedDates.length > 0) {
    return q.postponedDates.map((raw, idx) => {
      const colLetter = ROUND_COLUMNS[idx]?.colLetter || String.fromCharCode(67 + idx);
      const iso = parseThaiOrISODate(raw) || undefined;
      return {
        round: idx + 1,
        colLetter,
        rawDate: raw,
        isoDate: iso,
        thaiFormatted: iso ? formatThaiShortDate(iso) : raw,
      };
    });
  }

  // Single date fallback
  if (q.postponedDate || (postponedIds && postponedIds.has(q.id)) || q.postponedSheetRaw) {
    const raw = q.postponedSheetRaw || q.postponedDate || '';
    const iso = parseThaiOrISODate(raw) || parseThaiOrISODate(q.postponedDate) || undefined;
    return [
      {
        round: 1,
        colLetter: 'C',
        rawDate: raw || (iso ? formatThaiShortDate(iso) : 'ระบุขอเลื่อน'),
        isoDate: iso,
        thaiFormatted: iso ? formatThaiShortDate(iso) : raw || 'ระบุขอเลื่อน',
      },
    ];
  }

  return [];
}

/**
 * Compute all postponement statistics and structured history timeline
 */
export function computePostponeStats(
  questions: QuestionItem[],
  schedules: WeeklySchedule[],
  postponedIds: Set<string>
): PostponeAnalytics {
  const totalQuestions = questions.length;

  // Build scheduled map
  const scheduledMap = new Map<
    string,
    {
      thaiDate: string;
      weekIndex: number;
      slotNumber: number;
      scheduleType?: 'official' | 'projected';
    }
  >();

  schedules.forEach((sch, wIdx) => {
    sch.questions.forEach((sq) => {
      if (!scheduledMap.has(sq.question.id) || !sq.isPostponedNow) {
        scheduledMap.set(sq.question.id, {
          thaiDate: sch.thaiDateFormatted,
          weekIndex: wIdx + 1,
          slotNumber: sq.slotNumber,
          scheduleType: sch.scheduleType,
        });
      }
    });
  });

  const historyEntries: PostponeHistoryEntry[] = [];
  const roundMap = new Map<number, QuestionItem[]>();
  ROUND_COLUMNS.forEach((rc) => roundMap.set(rc.round, []));

  const ministerMap = new Map<string, { questions: QuestionItem[]; times: number }>();
  const askerMap = new Map<string, { questions: QuestionItem[]; times: number }>();
  const targetDateMap = new Map<
    string,
    {
      thaiDate: string;
      items: { question: QuestionItem; round: number; colLetter: string; rawDate: string }[];
    }
  >();

  let totalPostponeTimes = 0;
  let singlePostponeCount = 0;
  let multiPostponeCount = 0;
  let maxPostponeRound = 0;
  let answeredPostponedCount = 0;
  let withdrawnPostponedCount = 0;
  let activeScheduledPostponedCount = 0;

  questions.forEach((q) => {
    const isAnswered = isQuestionAnswered(q);
    const isWithdrawn = isQuestionWithdrawn(q);
    const rounds = getQuestionPostponeHistoryItems(q, postponedIds);
    const postponeTimes = rounds.length > 0 ? rounds.length : getQuestionPostponeCount(q, postponedIds);

    if (postponeTimes === 0 && rounds.length === 0) {
      return;
    }

    totalPostponeTimes += postponeTimes;
    if (postponeTimes === 1) {
      singlePostponeCount++;
    } else if (postponeTimes > 1) {
      multiPostponeCount++;
    }

    if (postponeTimes > maxPostponeRound) {
      maxPostponeRound = postponeTimes;
    }

    if (isAnswered) answeredPostponedCount++;
    if (isWithdrawn) withdrawnPostponedCount++;

    const placement = scheduledMap.get(q.id);
    if (placement && !isAnswered && !isWithdrawn) {
      activeScheduledPostponedCount++;
    }

    // Assign rounds
    rounds.forEach((r) => {
      if (!roundMap.has(r.round)) {
        roundMap.set(r.round, []);
      }
      roundMap.get(r.round)!.push(q);

      // Track target dates
      const iso = r.isoDate || parseThaiOrISODate(r.rawDate);
      if (iso) {
        if (!targetDateMap.has(iso)) {
          targetDateMap.set(iso, {
            thaiDate: formatThaiDateWithDayOfWeek(iso),
            items: [],
          });
        }
        targetDateMap.get(iso)!.items.push({
          question: q,
          round: r.round,
          colLetter: r.colLetter,
          rawDate: r.rawDate,
        });
      }
    });

    // Group by minister
    const minister = q.minister && q.minister.trim() ? q.minister.trim() : 'ไม่ระบุรัฐมนตรี';
    if (!ministerMap.has(minister)) {
      ministerMap.set(minister, { questions: [], times: 0 });
    }
    const mData = ministerMap.get(minister)!;
    mData.questions.push(q);
    mData.times += postponeTimes;

    // Group by asker
    const asker = q.asker && q.asker.trim() ? q.asker.trim() : 'ไม่ระบุผู้ตั้งถาม';
    if (!askerMap.has(asker)) {
      askerMap.set(asker, { questions: [], times: 0 });
    }
    const aData = askerMap.get(asker)!;
    aData.questions.push(q);
    aData.times += postponeTimes;

    // Status Category & Label
    let statusCategory: PostponeHistoryEntry['statusCategory'] = 'pending';
    let statusLabel = 'รอจัดสรรวาระเป้าหมาย';

    if (isWithdrawn) {
      statusCategory = 'withdrawn';
      statusLabel = 'ขอถอนกระทู้';
    } else if (isAnswered) {
      statusCategory = 'answered';
      statusLabel = 'ตอบแล้วในสภา';
    } else if (placement) {
      if (placement.scheduleType === 'official') {
        statusCategory = 'official';
        statusLabel = `บรรจุวาระทางการ (${placement.thaiDate})`;
      } else {
        statusCategory = 'projected';
        statusLabel = `คาดการณ์บรรจุ (${placement.thaiDate})`;
      }
    }

    historyEntries.push({
      question: q,
      submittedOrder: q.submittedOrder,
      topic: q.topic,
      asker,
      minister,
      rounds,
      totalRounds: postponeTimes,
      latestRound: rounds[rounds.length - 1],
      currentPlacement: placement,
      statusCategory,
      statusLabel,
    });
  });

  // Sort history entries by submitted order
  historyEntries.sort((a, b) => a.submittedOrder - b.submittedOrder);

  const totalPostponedQuestions = historyEntries.length;
  const percentagePostponed =
    totalQuestions > 0 ? Math.round((totalPostponedQuestions / totalQuestions) * 100) : 0;

  // Build round summaries
  const roundSummaries: PostponeRoundSummary[] = ROUND_COLUMNS.map((rc) => {
    const list = roundMap.get(rc.round) || [];
    return {
      round: rc.round,
      colLetter: rc.colLetter,
      count: list.length,
      percentage:
        totalPostponedQuestions > 0
          ? Math.round((list.length / totalPostponedQuestions) * 100)
          : 0,
      questions: list,
    };
  });

  // Build top ministers
  const topMinisters: MinisterPostponeSummary[] = Array.from(ministerMap.entries())
    .map(([minister, data]) => ({
      minister,
      questionCount: data.questions.length,
      postponeTimes: data.times,
      percentage:
        totalPostponedQuestions > 0
          ? Math.round((data.questions.length / totalPostponedQuestions) * 100)
          : 0,
      questions: data.questions,
    }))
    .sort((a, b) => b.postponeTimes - a.postponeTimes || b.questionCount - a.questionCount);

  // Build top askers
  const topAskers: AskerPostponeSummary[] = Array.from(askerMap.entries())
    .map(([asker, data]) => ({
      asker,
      questionCount: data.questions.length,
      postponeTimes: data.times,
      percentage:
        totalPostponedQuestions > 0
          ? Math.round((data.questions.length / totalPostponedQuestions) * 100)
          : 0,
      questions: data.questions,
    }))
    .sort((a, b) => b.postponeTimes - a.postponeTimes || b.questionCount - a.questionCount);

  // Build target dates
  const targetDates: TargetDatePostponeSummary[] = Array.from(targetDateMap.entries())
    .map(([dateISO, data]) => ({
      targetMondayISO: dateISO,
      thaiDateFormatted: data.thaiDate,
      count: data.items.length,
      items: data.items,
    }))
    .sort((a, b) => a.targetMondayISO.localeCompare(b.targetMondayISO));

  return {
    totalQuestions,
    totalPostponedQuestions,
    totalPostponeTimes,
    percentagePostponed,
    singlePostponeCount,
    multiPostponeCount,
    maxPostponeRound,
    roundSummaries,
    topMinisters,
    topAskers,
    targetDates,
    historyEntries,
    answeredPostponedCount,
    withdrawnPostponedCount,
    activeScheduledPostponedCount,
  };
}
