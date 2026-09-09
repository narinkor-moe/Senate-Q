import React, { useState, useMemo } from 'react';
import { QuestionItem, WeeklySchedule } from '../types';
import { computeAskerStats } from '../utils/askerStats';
import {
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  FileX2,
} from 'lucide-react';

interface AskerStatsSectionProps {
  questions: QuestionItem[];
  schedules: WeeklySchedule[];
  postponedIds: Set<string>;
  onOpenFullModal: () => void;
  onFilterByAsker: (askerName: string) => void;
  activeAskerFilter?: string;
}

export const AskerStatsSection: React.FC<AskerStatsSectionProps> = ({
  questions,
  schedules,
  postponedIds,
  onOpenFullModal,
  onFilterByAsker,
  activeAskerFilter,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const stats = useMemo(() => {
    return computeAskerStats(questions, schedules, postponedIds);
  }, [questions, schedules, postponedIds]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-sky-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0369a1] text-white flex items-center justify-center shadow-xs">
            <Users className="w-4 h-4 text-sky-100" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>สถิติผู้ตั้งกระทู้ถาม (วุฒิสภา)</span>
              <span className="px-2 py-0.2 rounded-full bg-sky-100 text-[#0369a1] text-xs font-bold border border-sky-200">
                {stats.totalUniqueAskers} ท่าน
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              ภาพรวมจำนวนกระทู้ถามที่ยื่นและการกระจายตัวตามสมาชิกวุฒิสภา
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-full-asker-stats"
            onClick={onOpenFullModal}
            className="px-3 py-1.5 rounded-lg bg-[#0369a1] hover:bg-[#075985] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-200" />
            <span>ดูสถิติฉบับเต็ม / รายละเอียดรายบุคคล</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            title={isCollapsed ? 'ขยายสถิติ' : 'ย่อสถิติ'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 block">ผู้ตั้งถามทั้งหมด</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-800">{stats.totalUniqueAskers}</span>
                <span className="text-xs text-slate-500">ท่าน</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
              <span className="text-[11px] font-semibold text-emerald-700 block">เฉลี่ยต่อท่าน</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-800">{stats.avgQuestionsPerAsker}</span>
                <span className="text-xs text-emerald-600">เรื่อง</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200/60">
              <span className="text-[11px] font-semibold text-blue-700 block">มีวาระทางการแล้ว</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-blue-800">{stats.askersWithOfficial}</span>
                <span className="text-xs text-blue-600">ท่าน</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/60">
              <span className="text-[11px] font-semibold text-amber-700 block">มีกระทู้ขอเลื่อนตอบ</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-amber-800">{stats.askersWithPostponed}</span>
                <span className="text-xs text-amber-600">ท่าน</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/60">
              <span className="text-[11px] font-semibold text-rose-700 block">ขอถอนกระทู้</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-rose-800">{stats.totalWithdrawnQuestions}</span>
                <span className="text-xs text-rose-600">
                  เรื่อง {stats.askersWithWithdrawn > 0 ? `(${stats.askersWithWithdrawn} ท่าน)` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Top Askers Interactive Grid */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>รายชื่อผู้ตั้งกระทู้ถาม (คลิกเพื่อกรองตารางกระทู้ด้านล่าง):</span>
              </span>
              {activeAskerFilter && (
                <button
                  type="button"
                  onClick={() => onFilterByAsker('')}
                  className="text-[11px] text-[#0369a1] hover:underline font-medium cursor-pointer"
                >
                  ล้างตัวกรอง ({activeAskerFilter})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {stats.allAskers.map((asker) => {
                const isSelected = activeAskerFilter === asker.asker;

                return (
                  <button
                    key={asker.asker}
                    type="button"
                    onClick={() => onFilterByAsker(isSelected ? '' : asker.asker)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="font-bold text-xs truncate flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {asker.rank}
                        </span>
                        <span className="truncate">{asker.asker}</span>
                      </div>
                      <div className={`text-[10px] mt-0.5 flex items-center gap-1.5 ${
                        isSelected ? 'text-sky-100' : 'text-slate-500'
                      }`}>
                        <span>{asker.totalQuestions} กระทู้</span>
                        <span>•</span>
                        <span>{asker.percentageOfTotal}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {asker.officialCount > 0 && (
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}
                          title={`วาระทางการ: ${asker.officialCount} เรื่อง`}
                        />
                      )}
                      {asker.projectedCount > 0 && (
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-200' : 'bg-purple-600'}`}
                          title={`คาดการณ์: ${asker.projectedCount} เรื่อง`}
                        />
                      )}
                      {asker.postponedCount > 0 && (
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`}
                          title={`ขอเลื่อน: ${asker.postponedCount} เรื่อง`}
                        />
                      )}
                      {asker.withdrawnCount > 0 && (
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-rose-200' : 'bg-rose-500'}`}
                          title={`ขอถอน: ${asker.withdrawnCount} เรื่อง (ไม่นำมาจัดวาระ)`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
