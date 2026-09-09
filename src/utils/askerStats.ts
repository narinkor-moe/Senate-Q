import { QuestionItem, WeeklySchedule } from '../types';

export interface AskerQuestionDetail {
  question: QuestionItem;
  statusCategory: 'official' | 'projected' | 'postponed' | 'answered' | 'pending';
  statusLabel: string;
  scheduleInfo?: {
    thaiDate: string;
    weekIndex: number;
    slotNumber: number;
    scheduleType?: 'official' | 'projected';
  };
}

export interface AskerStatItem {
  asker: string;
  rank: number;
  totalQuestions: number;
  officialCount: number;
  projectedCount: number;
  postponedCount: number;
  answeredCount: number;
  pendingCount: number;
  percentageOfTotal: number;
  topMinisters: { minister: string; count: number }[];
  questionDetails: AskerQuestionDetail[];
}

export interface OverallAskerStats {
  totalUniqueAskers: number;
  totalQuestions: number;
  avgQuestionsPerAsker: number;
  askersWithPostponed: number;
  askersWithOfficial: number;
  askersWithProjected: number;
  askersWithAnswered: number;
  allAskers: AskerStatItem[];
  topAskers: AskerStatItem[];
  ministryDistribution: { minister: string; count: number; percentage: number }[];
}

/**
 * Compute comprehensive statistics for all question askers
 */
export function computeAskerStats(
  questions: QuestionItem[],
  schedules: WeeklySchedule[],
  postponedIds: Set<string>
): OverallAskerStats {
  // 1. Build scheduled map
  const scheduledMap = new Map<
    string,
    {
      thaiDate: string;
      weekIndex: number;
      slotNumber: number;
      isPostponedNow: boolean;
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
          isPostponedNow: !!sq.isPostponedNow,
          scheduleType: sch.scheduleType,
        });
      }
    });
  });

  // Helper to determine status
  const getStatusInfo = (q: QuestionItem) => {
    const isAnswered =
      q.isAnswered === true ||
      q.status === 'completed' ||
      q.status === 'answered' ||
      (q.rawStatus && q.rawStatus.includes('ตอบแล้ว'));

    if (isAnswered) {
      return { category: 'answered' as const, label: 'ตอบแล้ว' };
    }

    const isPostponed = postponedIds.has(q.id) || !!q.postponedDate || q.status === 'postponed';
    if (isPostponed) {
      return { category: 'postponed' as const, label: 'ขอเลื่อนตอบ' };
    }

    const sched = scheduledMap.get(q.id);
    if (sched && !sched.isPostponedNow) {
      if (sched.scheduleType === 'official') {
        return {
          category: 'official' as const,
          label: `บรรจุในวาระแล้ว (สัปดาห์ที่ ${sched.weekIndex})`,
        };
      }
      return {
        category: 'projected' as const,
        label: `คาดการณ์ล่วงหน้า (สัปดาห์ที่ ${sched.weekIndex})`,
      };
    }

    return { category: 'pending' as const, label: 'รอคิวการบรรจุ' };
  };

  // Group by asker
  const askerMap = new Map<
    string,
    {
      asker: string;
      questions: QuestionItem[];
      ministersMap: Map<string, number>;
      officialCount: number;
      projectedCount: number;
      postponedCount: number;
      answeredCount: number;
      pendingCount: number;
      details: AskerQuestionDetail[];
    }
  >();

  const overallMinistryMap = new Map<string, number>();

  questions.forEach((q) => {
    const askerName = q.asker && q.asker.trim() ? q.asker.trim() : 'ไม่ระบุผู้ตั้งถาม';
    const ministerName = q.minister && q.minister.trim() ? q.minister.trim() : 'ไม่ระบุรัฐมนตรี';

    overallMinistryMap.set(ministerName, (overallMinistryMap.get(ministerName) || 0) + 1);

    if (!askerMap.has(askerName)) {
      askerMap.set(askerName, {
        asker: askerName,
        questions: [],
        ministersMap: new Map(),
        officialCount: 0,
        projectedCount: 0,
        postponedCount: 0,
        answeredCount: 0,
        pendingCount: 0,
        details: [],
      });
    }

    const group = askerMap.get(askerName)!;
    group.questions.push(q);
    group.ministersMap.set(ministerName, (group.ministersMap.get(ministerName) || 0) + 1);

    const status = getStatusInfo(q);
    const sched = scheduledMap.get(q.id);

    if (status.category === 'official') group.officialCount++;
    else if (status.category === 'projected') group.projectedCount++;
    else if (status.category === 'postponed') group.postponedCount++;
    else if (status.category === 'answered') group.answeredCount++;
    else group.pendingCount++;

    group.details.push({
      question: q,
      statusCategory: status.category,
      statusLabel: status.label,
      scheduleInfo: sched ? {
        thaiDate: sched.thaiDate,
        weekIndex: sched.weekIndex,
        slotNumber: sched.slotNumber,
        scheduleType: sched.scheduleType,
      } : undefined,
    });
  });

  const totalQuestions = questions.length;
  const totalUniqueAskers = askerMap.size;

  // Convert to array and calculate ranks
  const sortedAskers = Array.from(askerMap.values())
    .map((item) => {
      const topMinisters = Array.from(item.ministersMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([minister, count]) => ({ minister, count }));

      const percentageOfTotal = totalQuestions > 0 ? (item.questions.length / totalQuestions) * 100 : 0;

      return {
        asker: item.asker,
        rank: 0,
        totalQuestions: item.questions.length,
        officialCount: item.officialCount,
        projectedCount: item.projectedCount,
        postponedCount: item.postponedCount,
        answeredCount: item.answeredCount,
        pendingCount: item.pendingCount,
        percentageOfTotal: Number(percentageOfTotal.toFixed(1)),
        topMinisters,
        questionDetails: item.details.sort((a, b) => a.question.submittedOrder - b.question.submittedOrder),
      };
    })
    .sort((a, b) => {
      if (b.totalQuestions !== a.totalQuestions) {
        return b.totalQuestions - a.totalQuestions;
      }
      return a.asker.localeCompare(b.asker, 'th');
    });

  // Assign ranks
  sortedAskers.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const avgQuestionsPerAsker =
    totalUniqueAskers > 0 ? Number((totalQuestions / totalUniqueAskers).toFixed(1)) : 0;

  let askersWithPostponed = 0;
  let askersWithOfficial = 0;
  let askersWithProjected = 0;
  let askersWithAnswered = 0;

  sortedAskers.forEach((item) => {
    if (item.postponedCount > 0) askersWithPostponed++;
    if (item.officialCount > 0) askersWithOfficial++;
    if (item.projectedCount > 0) askersWithProjected++;
    if (item.answeredCount > 0) askersWithAnswered++;
  });

  // Ministry distribution
  const ministryDistribution = Array.from(overallMinistryMap.entries())
    .map(([minister, count]) => ({
      minister,
      count,
      percentage: totalQuestions > 0 ? Number(((count / totalQuestions) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUniqueAskers,
    totalQuestions,
    avgQuestionsPerAsker,
    askersWithPostponed,
    askersWithOfficial,
    askersWithProjected,
    askersWithAnswered,
    allAskers: sortedAskers,
    topAskers: sortedAskers.slice(0, 5),
    ministryDistribution,
  };
}
