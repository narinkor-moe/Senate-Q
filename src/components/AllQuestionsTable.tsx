import React, { useState, useMemo } from 'react';
import { QuestionItem, WeeklySchedule } from '../types';
import {
  Search,
  ArrowUpDown,
  Plus,
  Trash2,
  RotateCcw,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles,
  User,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

export type QuestionStatusCategory = 'all' | 'scheduled' | 'pending' | 'postponed';
export type SearchScope = 'all' | 'asker' | 'topic';

interface AllQuestionsTableProps {
  questions: QuestionItem[];
  postponedIds?: Set<string>;
  schedules?: WeeklySchedule[];
  onAddQuestion: (q: Omit<QuestionItem, 'id'>) => void;
  onDeleteQuestion: (id: string) => void;
  onReorderQuestions?: (questions: QuestionItem[]) => void;
  onResetToDefault: () => void;
  onOpenPostponeModal?: (question: QuestionItem) => void;
  onRefreshSheet?: () => void;
  isRefreshingSheet?: boolean;
}

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-slate-900 rounded-xs px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const AllQuestionsTable: React.FC<AllQuestionsTableProps> = ({
  questions,
  postponedIds = new Set(),
  schedules = [],
  onAddQuestion,
  onDeleteQuestion,
  onReorderQuestions,
  onResetToDefault,
  onOpenPostponeModal,
  onRefreshSheet,
  isRefreshingSheet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [statusFilter, setStatusFilter] = useState<QuestionStatusCategory>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newAsker, setNewAsker] = useState('');
  const [newMinister, setNewMinister] = useState('');
  const [newPostponedDate, setNewPostponedDate] = useState('');
  const [newOrder, setNewOrder] = useState<number>(() => {
    const max = Math.max(...questions.map((q) => q.submittedOrder), 0);
    return max + 1;
  });

  // Drag & Drop reordering state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Map each question ID to its scheduled placement info
  const scheduledMap = useMemo(() => {
    const map = new Map<string, { thaiDate: string; weekIndex: number; slotNumber: number; isPostponedNow: boolean }>();
    schedules.forEach((sch, wIdx) => {
      sch.questions.forEach((sq) => {
        if (!map.has(sq.question.id) || !sq.isPostponedNow) {
          map.set(sq.question.id, {
            thaiDate: sch.thaiDateFormatted,
            weekIndex: wIdx + 1,
            slotNumber: sq.slotNumber,
            isPostponedNow: !!sq.isPostponedNow,
          });
        }
      });
    });
    return map;
  }, [schedules]);

  // Determine the status category for any question
  const getQuestionStatus = (qId: string): { category: 'postponed' | 'scheduled' | 'pending'; label: string; subLabel?: string } => {
    if (postponedIds.has(qId)) {
      return { category: 'postponed', label: 'ขอเลื่อน', subLabel: 'ยกยอดสัปดาห์ถัดไป' };
    }
    const schedInfo = scheduledMap.get(qId);
    if (schedInfo && !schedInfo.isPostponedNow) {
      return {
        category: 'scheduled',
        label: 'บรรจุแล้ว',
        subLabel: `สัปดาห์ที่ ${schedInfo.weekIndex} (ลำดับที่ ${schedInfo.slotNumber})`,
      };
    }
    return { category: 'pending', label: 'รอคิว', subLabel: 'รอการจัดวาระ' };
  };

  // Count per status category
  const counts = useMemo(() => {
    let scheduled = 0;
    let pending = 0;
    let postponed = 0;

    questions.forEach((q) => {
      const status = getQuestionStatus(q.id).category;
      if (status === 'postponed') postponed++;
      else if (status === 'scheduled') scheduled++;
      else pending++;
    });

    return {
      all: questions.length,
      scheduled,
      pending,
      postponed,
    };
  }, [questions, scheduledMap, postponedIds]);

  // List of top frequent askers for quick 1-click filtering
  const frequentAskers = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => {
      if (q.asker && q.asker !== 'ไม่ระบุผู้ตั้งถาม') {
        map.set(q.asker, (map.get(q.asker) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [questions]);

  // Filter questions by search AND status filter
  const filteredQuestions = useMemo(() => {
    const qLower = searchTerm.trim().toLowerCase();
    return questions.filter((q) => {
      // 1. Search filter
      if (qLower) {
        let matchesSearch = false;
        if (searchScope === 'asker') {
          matchesSearch = q.asker.toLowerCase().includes(qLower);
        } else if (searchScope === 'topic') {
          matchesSearch = q.topic.toLowerCase().includes(qLower);
        } else {
          matchesSearch =
            q.topic.toLowerCase().includes(qLower) ||
            q.asker.toLowerCase().includes(qLower) ||
            q.minister.toLowerCase().includes(qLower) ||
            (q.postponedDate && q.postponedDate.toLowerCase().includes(qLower)) ||
            String(q.submittedOrder).includes(qLower);
        }
        if (!matchesSearch) return false;
      }

      // 2. Status filter
      if (statusFilter === 'all') return true;
      const qStatus = getQuestionStatus(q.id).category;
      return qStatus === statusFilter;
    });
  }, [questions, searchTerm, searchScope, statusFilter, scheduledMap, postponedIds]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newAsker.trim() || !newMinister.trim()) return;

    onAddQuestion({
      submittedOrder: Number(newOrder) || questions.length + 1,
      topic: newTopic.trim(),
      asker: newAsker.trim(),
      minister: newMinister.trim(),
      postponedDate: newPostponedDate.trim() || undefined,
      status: newPostponedDate.trim() ? 'postponed' : 'pending',
    });

    setNewTopic('');
    setNewAsker('');
    setNewMinister('');
    setNewPostponedDate('');
    setNewOrder((prev) => prev + 1);
    setIsAddModalOpen(false);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId === id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const position = offset < rect.height / 2 ? 'top' : 'bottom';

    setDragOverId(id);
    setDragPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // If leaving table container
    const related = e.relatedTarget as HTMLElement;
    if (!related || !related.closest('#questions-data-table')) {
      setDragOverId(null);
      setDragPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData('text/plain');

    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      setDragPosition(null);
      return;
    }

    const sourceIndex = questions.findIndex((q) => q.id === sourceId);
    const targetIndex = questions.findIndex((q) => q.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      setDragPosition(null);
      return;
    }

    const newQuestions = [...questions];
    const [movedItem] = newQuestions.splice(sourceIndex, 1);

    let insertIndex = newQuestions.findIndex((q) => q.id === targetId);
    if (dragPosition === 'bottom') {
      insertIndex += 1;
    }

    newQuestions.splice(insertIndex, 0, movedItem);

    if (onReorderQuestions) {
      onReorderQuestions(newQuestions);
      setNotification(`สลับลำดับกระทู้ "${movedItem.topic.slice(0, 30)}..." เป็นลำดับที่ ${insertIndex + 1} แล้ว`);
      setTimeout(() => setNotification(null), 3500);
    }

    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  // Move single item up or down
  const handleMoveStep = (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newQuestions = [...questions];
    const [movedItem] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIndex, 0, movedItem);

    if (onReorderQuestions) {
      onReorderQuestions(newQuestions);
      setNotification(`ปรับลำดับกระทู้เป็นลำดับที่ ${targetIndex + 1} เรียบร้อยแล้ว`);
      setTimeout(() => setNotification(null), 2500);
    }
  };

  return (
    <div id="all-questions-section" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Table Toolbar Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <span>ทะเบียนรายการกระทู้ถามที่ยื่นทั้งหมด</span>
            <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
              {questions.length} รายการ
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกลาก <strong className="text-slate-700">⋮⋮ (Drag & Drop)</strong> เพื่อจัดลำดับก่อนหลังตามต้องการ ระบบจะจัดสรรลงวันจันทร์ใหม่อัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRefreshSheet && (
            <button
              type="button"
              id="btn-table-refresh-sheet"
              onClick={onRefreshSheet}
              disabled={isRefreshingSheet}
              title="ดึงข้อมูลที่เป็นปัจจุบันทั้งหมดจาก Google Sheet และประมวลผลจัดวาระใหม่ทันที"
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSheet ? 'animate-spin' : ''}`} />
              <span>{isRefreshingSheet ? 'กำลังรีเฟรช...' : 'รีเฟรชจาก Sheet'}</span>
            </button>
          )}

          <button
            type="button"
            id="btn-open-add-question"
            onClick={() => {
              const max = Math.max(...questions.map((q) => q.submittedOrder), 0);
              setNewOrder(max + 1);
              setIsAddModalOpen(true);
            }}
            className="bg-[#0369a1] hover:bg-[#075985] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ยื่นกระทู้ถามใหม่</span>
          </button>

          <button
            type="button"
            id="btn-reset-questions"
            onClick={onResetToDefault}
            title="รีเซ็ตข้อมูลตัวอย่าง"
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ต</span>
          </button>
        </div>
      </div>

      {/* Dedicated Search and Quick Filter Bar */}
      <div className="px-6 py-3 bg-sky-50/50 border-b border-slate-200 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0369a1] pointer-events-none" />
            <input
              id="search-questions-input"
              type="text"
              aria-label="ค้นหากระทู้ถามตามชื่อเรื่อง หรือ ผู้ตั้งถาม"
              placeholder={
                searchScope === 'asker'
                  ? 'พิมพ์ค้นหาตามชื่อผู้ตั้งถาม (ส.ว.)...'
                  : searchScope === 'topic'
                  ? 'พิมพ์ค้นหาตามหัวข้อกระทู้ถาม...'
                  : 'ค้นหากระทู้ถาม: พิมพ์ชื่อผู้ตั้งถาม หรือหัวข้อกระทู้ถาม...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchTerm('');
              }}
              className="w-full text-xs font-medium pl-10 pr-9 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                id="btn-clear-search"
                onClick={() => setSearchTerm('')}
                title="ล้างคำค้นหา (Esc)"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Scope Filter Buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs text-xs font-semibold shrink-0">
            <button
              type="button"
              id="scope-all-btn"
              onClick={() => setSearchScope('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-[#0369a1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              ค้นหาทั้งหมด
            </button>
            <button
              type="button"
              id="scope-asker-btn"
              onClick={() => setSearchScope('asker')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                searchScope === 'asker'
                  ? 'bg-[#0369a1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User className="w-3 h-3" />
              <span>ผู้ตั้งถาม</span>
            </button>
            <button
              type="button"
              id="scope-topic-btn"
              onClick={() => setSearchScope('topic')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                searchScope === 'topic'
                  ? 'bg-[#0369a1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>หัวข้อกระทู้</span>
            </button>
          </div>

          {/* Result Count Indicator */}
          {searchTerm.trim() && (
            <div className="text-xs font-semibold px-2.5 py-1.5 bg-sky-100 text-sky-900 rounded-lg border border-sky-200 shrink-0 inline-flex items-center gap-1.5">
              <span>พบ <strong>{filteredQuestions.length}</strong> จาก {questions.length} กระทู้</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-sky-700 hover:text-sky-950 font-bold ml-0.5 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Quick Asker Suggestion Badges */}
        {frequentAskers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-0.5">
              <User className="w-3 h-3 text-[#0369a1]" />
              ค้นหาด่วนตามผู้ตั้งถาม:
            </span>
            {frequentAskers.map(({ name, count }) => {
              const isSelected = searchTerm === name && (searchScope === 'asker' || searchScope === 'all');
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSearchTerm('');
                    } else {
                      setSearchTerm(name);
                      setSearchScope('asker');
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                  }`}
                  title={`กรองกระทู้ถามของ ${name}`}
                >
                  <span>{name}</span>
                  <span className={`ml-1 text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reorder Notification Toast / Helper Banner */}
      {notification && (
        <div className="px-6 py-2 bg-sky-50 border-b border-sky-200 text-xs font-semibold text-[#0369a1] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#0369a1]" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-sky-700 hover:text-sky-900 font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs Bar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            กรองสถานะ:
          </span>

          {/* All */}
          <button
            type="button"
            id="filter-status-all"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-[#1e293b] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>ทั้งหมด</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.all}
            </span>
          </button>

          {/* Scheduled: บรรจุแล้ว */}
          <button
            type="button"
            id="filter-status-scheduled"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              statusFilter === 'scheduled'
                ? 'bg-[#0369a1] text-white shadow-xs'
                : 'bg-sky-50 text-[#0369a1] hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>บรรจุแล้ว</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'scheduled' ? 'bg-white/20 text-white' : 'bg-sky-200 text-sky-900'
              }`}
            >
              {counts.scheduled}
            </span>
          </button>

          {/* Pending: รอคิว */}
          <button
            type="button"
            id="filter-status-pending"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>รอคิว</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          {/* Postponed: ขอเลื่อน */}
          <button
            type="button"
            id="filter-status-postponed"
            onClick={() => setStatusFilter('postponed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              statusFilter === 'postponed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>ขอเลื่อน</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'postponed' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {counts.postponed}
            </span>
          </button>
        </div>

        {statusFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="text-xs text-[#0369a1] hover:underline font-semibold cursor-pointer"
          >
            ล้างตัวกรองสถานะ
          </button>
        )}
      </div>

      {/* Table (Rule 5: ลำดับ, กระทู้ถามเรื่อง, ผู้ตั้งถาม, ถามรัฐมนตรี, สถานะ, จัดการ) */}
      <div className="overflow-x-auto">
        <table id="questions-data-table" className="w-full text-left" onDragLeave={handleDragLeave}>
          <thead className="sticky top-0 bg-white border-b border-slate-200">
            <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-36">
                <span className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-slate-400" />
                  ลำดับที่ยื่น
                </span>
              </th>
              <th className="px-6 py-3 min-w-[300px]">กระทู้ถามเรื่อง</th>
              <th className="px-6 py-3 min-w-[170px]">ผู้ตั้งถาม</th>
              <th className="px-6 py-3 min-w-[200px]">ถามรัฐมนตรี</th>
              <th className="px-6 py-3 text-center w-36">สถานะ</th>
              <th className="px-4 py-3 text-center w-24">ปรับลำดับ / ลบ</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {filteredQuestions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">
                      ไม่พบข้อมูลกระทู้ถาม
                    </p>
                    <p className="text-slate-500 text-xs">
                      {searchTerm
                        ? `ไม่พบรายการที่ตรงกับคำค้นหา "${searchTerm}" ${
                            searchScope === 'asker'
                              ? '(ในช่องผู้ตั้งถาม)'
                              : searchScope === 'topic'
                              ? '(ในช่องหัวข้อกระทู้)'
                              : ''
                          }`
                        : 'ไม่มีรายการกระทู้ในสถานะที่เลือก'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setSearchScope('all');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0369a1] text-white text-xs font-semibold hover:bg-[#075985] cursor-pointer transition-colors shadow-2xs"
                        >
                          ล้างคำค้นหาทั้งหมด
                        </button>
                      )}
                      {statusFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          ล้างตัวกรองสถานะ
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredQuestions.map((q, idx) => {
                const statusInfo = getQuestionStatus(q.id);
                const isBeingDragged = draggedId === q.id;
                const isOverTop = dragOverId === q.id && dragPosition === 'top';
                const isOverBottom = dragOverId === q.id && dragPosition === 'bottom';
                const originalIndex = questions.findIndex((item) => item.id === q.id);

                return (
                  <tr
                    key={q.id}
                    id={`row-question-${q.id}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, q.id)}
                    onDragOver={(e) => handleDragOver(e, q.id)}
                    onDrop={(e) => handleDrop(e, q.id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-150 select-none ${
                      isBeingDragged
                        ? 'opacity-40 bg-sky-50 scale-[0.99]'
                        : isOverTop
                        ? 'border-t-2 border-[#0369a1] bg-sky-50/50'
                        : isOverBottom
                        ? 'border-b-2 border-[#0369a1] bg-sky-50/50'
                        : statusInfo.category === 'postponed'
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : statusInfo.category === 'scheduled'
                        ? 'bg-sky-50/20 hover:bg-sky-50/50'
                        : 'hover:bg-slate-50/90'
                    }`}
                  >
                    {/* Drag Handle + Order Column */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span
                          title="คลิกลากเพื่อจัดลำดับคิว (Drag to reorder)"
                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-[#0369a1] hover:bg-slate-100 rounded transition-colors"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <span>{String(q.submittedOrder).padStart(3, '0')}/2569</span>
                      </div>
                    </td>

                    <td className="px-6 py-3 font-medium text-slate-900 leading-snug">
                      <div className="flex flex-col gap-1">
                        <span className="break-words">
                          {highlightMatch(q.topic, searchScope === 'asker' ? '' : searchTerm)}
                        </span>
                        {q.postponedDate && (
                          <span
                            className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.isPostponedInSheet
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {q.isPostponedInSheet ? (
                              <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            )}
                            <span>เลื่อนตอบวันที่: {q.postponedSheetRaw || q.postponedDate}</span>
                            {q.isPostponedInSheet && (
                              <span className="bg-emerald-200/80 text-emerald-900 px-1 rounded text-[9px] font-bold ml-0.5">
                                Sheet
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-700 font-medium text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm(q.asker);
                          setSearchScope('asker');
                        }}
                        title={`คลิกเพื่อค้นหากระทู้ทั้งหมดของ ${q.asker}`}
                        className="text-left hover:text-[#0369a1] hover:underline cursor-pointer group inline-flex items-center gap-1 transition-colors"
                      >
                        <span>{highlightMatch(q.asker, searchScope === 'topic' ? '' : searchTerm)}</span>
                        <Search className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#0369a1] transition-opacity shrink-0" />
                      </button>
                    </td>
                    <td className="px-6 py-3 text-slate-700 text-xs">
                      {highlightMatch(q.minister, searchScope === 'all' ? searchTerm : '')}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {statusInfo.category === 'postponed' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            ขอเลื่อน
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium mt-0.5">
                            {q.postponedDate ? `ระบุ ${q.postponedDate}` : 'ยกยอดสัปดาห์ถัดไป'}
                          </span>
                        </div>
                      )}

                      {statusInfo.category === 'scheduled' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="bg-[#f0f9ff] text-[#0369a1] border border-[#0369a1]/30 px-2.5 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#0369a1]" />
                            บรรจุแล้ว
                          </span>
                          {statusInfo.subLabel && (
                            <span className="text-[10px] text-sky-700 font-medium mt-0.5">
                              {statusInfo.subLabel}
                            </span>
                          )}
                        </div>
                      )}

                      {statusInfo.category === 'pending' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            รอคิว
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            รอจัดสรรวาระ
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Quick Move Up/Down & Postpone & Delete */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {onOpenPostponeModal && (
                          <button
                            type="button"
                            id={`btn-table-postpone-${q.id}`}
                            onClick={() => onOpenPostponeModal(q)}
                            title={
                              q.postponedDate
                                ? q.isPostponedInSheet
                                  ? `ข้อมูลจาก Google Sheet: ${q.postponedSheetRaw || q.postponedDate} (คลิกเพื่อแก้ไข/ล้าง)`
                                  : `แก้ไขวันขอเลื่อน (${q.postponedDate})`
                                : 'ใน Sheet ยังไม่มีวันเลื่อนตอบ (คลิกเพื่อขอเลื่อนและบันทึกลง Sheet)'
                            }
                            className={`p-1 rounded transition-colors cursor-pointer mr-0.5 ${
                              q.postponedDate
                                ? q.isPostponedInSheet
                                  ? 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200'
                                  : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {q.isPostponedInSheet ? (
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          id={`btn-move-up-${q.id}`}
                          onClick={() => handleMoveStep(q.id, 'up')}
                          disabled={originalIndex === 0}
                          title="เลื่อนขึ้นหนึ่งลำดับ"
                          className="p-1 text-slate-400 hover:text-[#0369a1] hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`btn-move-down-${q.id}`}
                          onClick={() => handleMoveStep(q.id, 'down')}
                          disabled={originalIndex === questions.length - 1}
                          title="เลื่อนลงหนึ่งลำดับ"
                          className="p-1 text-slate-400 hover:text-[#0369a1] hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`btn-delete-q-${q.id}`}
                          onClick={() => onDeleteQuestion(q.id)}
                          title="ลบรายการกระทู้นี้"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination / Count Bar */}
      <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
        <p>
          แสดงผล <strong className="text-slate-700">{filteredQuestions.length}</strong> จากทั้งหมด {questions.length} รายการ
          {statusFilter !== 'all' && (
            <span className="ml-1 text-[#0369a1]">
              (กรองเฉพาะสถานะ: {statusFilter === 'scheduled' ? 'บรรจุแล้ว' : statusFilter === 'pending' ? 'รอคิว' : 'ขอเลื่อน'})
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-xs mr-2">
            💡 ลากแถว (Drag & Drop) หรือกด ▲ ▼ เพื่อปรับลำดับคิวกระทู้
          </span>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h4 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              ยื่นกระทู้ถามใหม่เข้าสู่ระบบ
            </h4>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กระทู้ถามเรื่อง *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="ระบุชื่อเรื่องกระทู้ถามอย่างย่อ..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ผู้ตั้งถาม (ส.ว. / สมาชิก) *
                </label>
                <input
                  type="text"
                  required
                  value={newAsker}
                  onChange={(e) => setNewAsker(e.target.value)}
                  placeholder="เช่น นายประเสริฐ เจริญสุข"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ถามรัฐมนตรี *
                </label>
                <input
                  type="text"
                  required
                  value={newMinister}
                  onChange={(e) => setNewMinister(e.target.value)}
                  placeholder="เช่น รัฐมนตรีว่าการกระทรวงศึกษาธิการ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลื่อนตอบวันที่ (ระบุหากเป็นกระทู้ขอเลื่อนตอบ เช่น 2026-09-14 หรือ 14 ก.ย. 2569)
                </label>
                <input
                  type="text"
                  value={newPostponedDate}
                  onChange={(e) => setNewPostponedDate(e.target.value)}
                  placeholder="เว้นว่างไว้หากเป็นการยื่นปกติ หรือระบุวันที่ เช่น 2026-09-14"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * กระทู้ที่ระบุวันเลื่อนตอบจะได้รับสิทธิ์เป็นลำดับแรกในวันดังกล่าว และสามารถจัดเกิน 3 กระทู้รวมถึงยกเว้นข้อจำกัดชื่อซ้ำได้
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0369a1] text-white text-xs font-semibold hover:bg-[#075985] cursor-pointer shadow-xs"
                >
                  บันทึกกระทู้ถาม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

