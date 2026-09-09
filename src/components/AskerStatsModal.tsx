import React, { useState, useMemo } from 'react';
import { QuestionItem, WeeklySchedule } from '../types';
import { computeAskerStats, AskerStatItem } from '../utils/askerStats';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  X,
  Building2,
  FileText,
  Award,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface AskerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionItem[];
  schedules: WeeklySchedule[];
  postponedIds: Set<string>;
  onSelectAskerInTable?: (askerName: string) => void;
  onOpenPrintReport?: () => void;
}

export const AskerStatsModal: React.FC<AskerStatsModalProps> = ({
  isOpen,
  onClose,
  questions,
  schedules,
  postponedIds,
  onSelectAskerInTable,
  onOpenPrintReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'questions' | 'name' | 'postponed'>('questions');
  const [filterType, setFilterType] = useState<'all' | 'has_official' | 'has_postponed' | 'has_projected'>('all');
  const [expandedAsker, setExpandedAsker] = useState<string | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    return computeAskerStats(questions, schedules, postponedIds);
  }, [questions, schedules, postponedIds]);

  // Filtered and sorted askers
  const displayedAskers = useMemo(() => {
    let list = stats.allAskers;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((a) => a.asker.toLowerCase().includes(term));
    }

    // Category filter
    if (filterType === 'has_official') {
      list = list.filter((a) => a.officialCount > 0);
    } else if (filterType === 'has_postponed') {
      list = list.filter((a) => a.postponedCount > 0);
    } else if (filterType === 'has_projected') {
      list = list.filter((a) => a.projectedCount > 0);
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'questions') {
        return b.totalQuestions - a.totalQuestions;
      }
      if (sortBy === 'postponed') {
        return b.postponedCount - a.postponedCount || b.totalQuestions - a.totalQuestions;
      }
      return a.asker.localeCompare(b.asker, 'th');
    });
  }, [stats.allAskers, searchTerm, filterType, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-[#1e293b] to-[#0f172a] text-white flex items-center justify-between border-b-4 border-[#0369a1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0369a1] flex items-center justify-center text-white shadow-inner">
              <BarChart3 className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <span>สถิติผู้ตั้งกระทู้ถาม (วุฒิสภา)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/30 text-sky-200 border border-sky-400/30 font-medium">
                  {stats.totalUniqueAskers} ท่าน
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                สรุปจำนวนกระทู้ถามและการจัดสรรระเบียบวาระจำแนกตามรายชื่อสมาชิกวุฒิสภา
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrintReport && (
              <button
                type="button"
                onClick={onOpenPrintReport}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/20"
                title="พิมพ์รายงานสรุป"
              >
                <Printer className="w-3.5 h-3.5 text-sky-300" />
                <span>พิมพ์รายงาน</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#f8fafc]">
          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Metric 1: Total Askers */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ผู้ตั้งถามทั้งหมด
                </span>
                <Users className="w-4 h-4 text-[#0369a1]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{stats.totalUniqueAskers}</span>
                <span className="text-xs text-slate-500 font-medium">ท่าน</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                จากกระทู้ทั้งหมด {stats.totalQuestions} เรื่อง
              </div>
            </div>

            {/* Metric 2: Avg Questions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  เฉลี่ยต่อท่าน
                </span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">{stats.avgQuestionsPerAsker}</span>
                <span className="text-xs text-slate-500 font-medium">เรื่อง/ท่าน</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                ยื่นสูงสุด {stats.topAskers[0]?.totalQuestions || 0} เรื่อง
              </div>
            </div>

            {/* Metric 3: Top Asker */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ยื่นกระทู้มากที่สุด
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                  อันดับ 1
                </span>
              </div>
              <div className="mt-2 truncate font-bold text-slate-800 text-sm" title={stats.topAskers[0]?.asker}>
                {stats.topAskers[0]?.asker || '-'}
              </div>
              <div className="mt-1 text-[11px] text-amber-700 font-semibold">
                {stats.topAskers[0]?.totalQuestions || 0} เรื่อง ({stats.topAskers[0]?.percentageOfTotal || 0}% ของทั้งหมด)
              </div>
            </div>

            {/* Metric 4: Askers with Postponed Questions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  มีกระทู้ขอเลื่อน
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">{stats.askersWithPostponed}</span>
                <span className="text-xs text-slate-500 font-medium">ท่าน</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                มีสิทธิ์ลำดับแรกในวันนัดตอบ
              </div>
            </div>
          </div>

          {/* Top 5 Leaderboard & Status Distribution */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>5 อันดับผู้ตั้งกระทู้ถามสูงสุด & สัดส่วนสถานะการบรรจุ</span>
              </h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span>
                  <span className="text-slate-600">วาระทางการ</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block"></span>
                  <span className="text-slate-600">คาดการณ์</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
                  <span className="text-slate-600">ขอเลื่อน</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block"></span>
                  <span className="text-slate-600">ตอบแล้ว</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block"></span>
                  <span className="text-slate-600">รอคิว</span>
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {stats.topAskers.map((asker, idx) => {
                const maxVal = stats.topAskers[0].totalQuestions || 1;
                const widthPercent = Math.max(15, (asker.totalQuestions / maxVal) * 100);

                const officialPct = (asker.officialCount / asker.totalQuestions) * 100;
                const projectedPct = (asker.projectedCount / asker.totalQuestions) * 100;
                const postponedPct = (asker.postponedCount / asker.totalQuestions) * 100;
                const answeredPct = (asker.answeredCount / asker.totalQuestions) * 100;
                const pendingPct = (asker.pendingCount / asker.totalQuestions) * 100;

                return (
                  <div key={asker.asker} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-all">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0 ? 'bg-amber-400 text-amber-950 font-black' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-700 text-amber-50' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800">{asker.asker}</span>
                        {asker.topMinisters.length > 0 && (
                          <span className="hidden md:inline-block text-[11px] text-slate-500 font-normal">
                            (ถามหลัก: {asker.topMinisters[0].minister})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-[#0369a1]">{asker.totalQuestions} เรื่อง</span>
                        <span className="text-slate-400 text-[10px]">({asker.percentageOfTotal}%)</span>
                      </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex" style={{ width: `${widthPercent}%` }}>
                      {officialPct > 0 && (
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${officialPct}%` }}
                          title={`วาระทางการ: ${asker.officialCount} เรื่อง`}
                        />
                      )}
                      {projectedPct > 0 && (
                        <div
                          className="bg-purple-600 h-full"
                          style={{ width: `${projectedPct}%` }}
                          title={`คาดการณ์: ${asker.projectedCount} เรื่อง`}
                        />
                      )}
                      {postponedPct > 0 && (
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${postponedPct}%` }}
                          title={`ขอเลื่อน: ${asker.postponedCount} เรื่อง`}
                        />
                      )}
                      {answeredPct > 0 && (
                        <div
                          className="bg-emerald-600 h-full"
                          style={{ width: `${answeredPct}%` }}
                          title={`ตอบแล้ว: ${asker.answeredCount} เรื่อง`}
                        />
                      )}
                      {pendingPct > 0 && (
                        <div
                          className="bg-slate-300 h-full"
                          style={{ width: `${pendingPct}%` }}
                          title={`รอคิว: ${asker.pendingCount} เรื่อง`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสมาชิกวุฒิสภา / ผู้ตั้งถาม..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({stats.totalUniqueAskers})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('has_official')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterType === 'has_official'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  มีวาระทางการ ({stats.askersWithOfficial})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('has_projected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterType === 'has_projected'
                      ? 'bg-purple-700 text-white'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  มีคาดการณ์ ({stats.askersWithProjected})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('has_postponed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterType === 'has_postponed'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  มีขอเลื่อนตอบ ({stats.askersWithPostponed})
                </button>
              </div>

              {/* Sort Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">เรียงตาม:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:border-[#0369a1]"
                >
                  <option value="questions">จำนวนกระทู้มากสุด</option>
                  <option value="postponed">จำนวนขอเลื่อนมากสุด</option>
                  <option value="name">ชื่อตัวอักษร ก-ฮ</option>
                </select>
              </div>
            </div>
          </div>

          {/* All Askers Detailed Table / List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>รายชื่อผู้ตั้งกระทู้ถามและสถิติจำแนกตามสถานะ ({displayedAskers.length} ท่าน)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                คลิกที่แถวเพื่อเปิดดูรายละเอียดกระทู้ทั้งหมดของแต่ละท่าน
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {displayedAskers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ไม่พบข้อมูลผู้ตั้งกระทู้ถามที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                displayedAskers.map((asker) => {
                  const isExpanded = expandedAsker === asker.asker;

                  return (
                    <div key={asker.asker} className="transition-colors hover:bg-slate-50/80">
                      {/* Main Row */}
                      <div
                        onClick={() => setExpandedAsker(isExpanded ? null : asker.asker)}
                        className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        {/* Asker Name & Rank */}
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {asker.rank}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                              <span>{asker.asker}</span>
                              {asker.rank <= 3 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  Top {asker.rank}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>รวม {asker.totalQuestions} กระทู้ ({asker.percentageOfTotal}%)</span>
                              {asker.topMinisters.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[250px]" title={asker.topMinisters.map((m) => `${m.minister} (${m.count})`).join(', ')}>
                                    กระทรวงหลัก: {asker.topMinisters[0].minister} ({asker.topMinisters[0].count})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badges Group */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Official */}
                          {asker.officialCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              วาระทางการ {asker.officialCount}
                            </span>
                          ) : null}

                          {/* Projected */}
                          {asker.projectedCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              คาดการณ์ {asker.projectedCount}
                            </span>
                          ) : null}

                          {/* Postponed */}
                          {asker.postponedCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              ขอเลื่อน {asker.postponedCount}
                            </span>
                          ) : null}

                          {/* Answered */}
                          {asker.answeredCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ตอบแล้ว {asker.answeredCount}
                            </span>
                          ) : null}

                          {/* Pending */}
                          {asker.pendingCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                              รอคิว {asker.pendingCount}
                            </span>
                          ) : null}
                        </div>

                        {/* Expand / Collapse Button & Actions */}
                        <div className="flex items-center gap-2">
                          {onSelectAskerInTable && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAskerInTable(asker.asker);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0369a1] border border-sky-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="กรองดูกระทู้ในตารางหลัก"
                            >
                              <span>ดูกระทู้ในตาราง</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedAsker(isExpanded ? null : asker.asker);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Questions Detail */}
                      {isExpanded && (
                        <div className="px-6 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 space-y-3">
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>รายการกระทู้ถามของ {asker.asker} ({asker.questionDetails.length} เรื่อง):</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              เรียงตามลำดับที่ยื่น
                            </span>
                          </div>

                          <div className="space-y-2">
                            {asker.questionDetails.map((item) => {
                              const q = item.question;
                              const isOff = item.statusCategory === 'official';
                              const isProj = item.statusCategory === 'projected';
                              const isPost = item.statusCategory === 'postponed';
                              const isAns = item.statusCategory === 'answered';

                              return (
                                <div
                                  key={q.id}
                                  className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0 mt-0.5">
                                        ลำดับที่ {q.submittedOrder}
                                      </span>
                                      <span className="font-semibold text-slate-900 leading-snug">
                                        {q.topic}
                                      </span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0">
                                      {isOff && (
                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200">
                                          วาระทางการ ({item.scheduleInfo?.thaiDate || 'ระเบียบวาระ'})
                                        </span>
                                      )}
                                      {isProj && (
                                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[11px] font-bold border border-purple-200">
                                          คาดการณ์ ({item.scheduleInfo?.thaiDate || 'สัปดาห์ถัดไป'})
                                        </span>
                                      )}
                                      {isPost && (
                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
                                          ขอเลื่อนตอบ: {q.postponedDate || 'รอระบุ'}
                                        </span>
                                      )}
                                      {isAns && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-200">
                                          ตอบแล้ว
                                        </span>
                                      )}
                                      {!isOff && !isProj && !isPost && !isAns && (
                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                          รอคิวบรรจุ
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-0.5">
                                    <div className="flex items-center gap-1 text-slate-700">
                                      <Building2 className="w-3 h-3 text-slate-400" />
                                      <span>ถาม: <strong>{q.minister}</strong></span>
                                    </div>
                                    {q.submittingDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span>วันที่ยื่น: {q.submittingDate}</span>
                                      </div>
                                    )}
                                    {item.scheduleInfo && (
                                      <div className="flex items-center gap-1 text-[#0369a1] font-semibold">
                                        <Clock className="w-3 h-3" />
                                        <span>สัปดาห์ที่ {item.scheduleInfo.weekIndex} (ลำดับที่ {item.scheduleInfo.slotNumber})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            ข้อมูลอัปเดตสอดคล้องกับระเบียบวาระและตารางกระทู้ถามปัจจุบัน ({stats.totalQuestions} กระทู้)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
