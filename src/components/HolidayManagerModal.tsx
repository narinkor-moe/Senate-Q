import React, { useState, useMemo } from 'react';
import {
  CalendarOff,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  Check,
  X,
  AlertTriangle,
  Info,
  Sparkles,
  CalendarDays,
  Clock,
  ShieldCheck
} from 'lucide-react';
import {
  formatThaiDateWithDayOfWeek,
  getDayOfWeekThai,
  isMondayDate,
  THAI_PUBLIC_HOLIDAYS
} from '../scheduler';

interface HolidayManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: Record<string, string>;
  onSaveHoliday: (date: string, name: string, oldDate?: string) => void;
  onDeleteHoliday: (date: string) => void;
  onResetHolidays: () => void;
}

export const HolidayManagerModal: React.FC<HolidayManagerModalProps> = ({
  isOpen,
  onClose,
  holidays,
  onSaveHoliday,
  onDeleteHoliday,
  onResetHolidays,
}) => {
  // Form state
  const [inputDate, setInputDate] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [editingOldDate, setEditingOldDate] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'monday_only' | '2026' | '2027'>('all');
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  // Quick preset titles
  const PRESET_NAMES = [
    'วันหยุดราชการเป็นกรณีพิเศษ',
    'วันหยุดชดเชย',
    'วันหยุดพิเศษตามมติ ครม.',
    'วันหยุดชดเชยวันแรงงานแห่งชาติ',
    'วันหยุดชดเชยวันสิ้นปี'
  ];

  // Convert dictionary to sorted array
  const sortedHolidays = useMemo(() => {
    return Object.entries(holidays)
      .map(([date, name]) => ({
        date,
        name,
        isMonday: isMondayDate(date),
        thaiFull: formatThaiDateWithDayOfWeek(date),
        dayOfWeek: getDayOfWeekThai(date),
        year: date.split('-')[0]
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  // Summary counts
  const totalCount = sortedHolidays.length;
  const mondayCount = useMemo(() => {
    return sortedHolidays.filter((h) => h.isMonday).length;
  }, [sortedHolidays]);

  // Filtered holidays list
  const filteredHolidays = useMemo(() => {
    return sortedHolidays.filter((h) => {
      // Search match
      const matchesSearch =
        searchQuery.trim() === '' ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.date.includes(searchQuery) ||
        h.thaiFull.includes(searchQuery);

      if (!matchesSearch) return false;

      // Filter category
      if (filterType === 'monday_only') return h.isMonday;
      if (filterType === '2026') return h.year === '2026';
      if (filterType === '2027') return h.year === '2027';
      return true;
    });
  }, [sortedHolidays, searchQuery, filterType]);

  if (!isOpen) return null;

  const handleStartEdit = (date: string, name: string) => {
    setInputDate(date);
    setInputName(name);
    setEditingOldDate(date);
    setFormError(null);
    setSuccessNotice(null);
    setConfirmDeleteDate(null);
  };

  const handleCancelEdit = () => {
    setInputDate('');
    setInputName('');
    setEditingOldDate(null);
    setFormError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    const trimmedDate = inputDate.trim();
    const trimmedName = inputName.trim();

    if (!trimmedDate) {
      setFormError('กรุณาเลือกวันที่ของวันหยุด');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setFormError('รูปแบบวันที่ต้องเป็น YYYY-MM-DD');
      return;
    }

    if (!trimmedName) {
      setFormError('กรุณาระบุชื่อวันหยุดราชการ');
      return;
    }

    // Check if adding new and already exists
    if (!editingOldDate && holidays[trimmedDate]) {
      // Overwrite confirmation is handled seamlessly
    }

    onSaveHoliday(trimmedDate, trimmedName, editingOldDate || undefined);

    const isMonday = isMondayDate(trimmedDate);
    setSuccessNotice(
      editingOldDate
        ? `แก้ไขวันหยุด "${trimmedName}" เรียบร้อยแล้ว${isMonday ? ' (ตรงกับวันจันทร์: ระบบปรับวาระอัตโนมัติ)' : ''}`
        : `เพิ่มวันหยุด "${trimmedName}" เรียบร้อยแล้ว${isMonday ? ' (ตรงกับวันจันทร์: ระบบปรับวาระอัตโนมัติ)' : ''}`
    );

    // Reset form
    setInputDate('');
    setInputName('');
    setEditingOldDate(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDelete = (date: string) => {
    onDeleteHoliday(date);
    setConfirmDeleteDate(null);
    if (editingOldDate === date) {
      handleCancelEdit();
    }
    setSuccessNotice(`ลบวันหยุดวันที่ ${date} สำเร็จ`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm('คุณต้องการคืนค่าวันหยุดนักขัตฤกษ์ทั้งหมดให้เป็นค่ามาตรฐานของทางการไทยใช่หรือไม่?')) {
      onResetHolidays();
      handleCancelEdit();
      setSuccessNotice('คืนค่าวันหยุดนักขัตฤกษ์มาตรฐานเรียบร้อยแล้ว');
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const inputDayOfWeek = inputDate ? getDayOfWeekThai(inputDate) : '';
  const inputIsMonday = inputDate ? isMondayDate(inputDate) : false;
  const inputThaiFull = inputDate ? formatThaiDateWithDayOfWeek(inputDate) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0369a1]/10 text-[#0369a1] border border-[#0369a1]/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  จัดการปฏิทินวันหยุดราชการ
                </h3>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {totalCount} วัน
                </span>
                <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  ตรงกับวันจันทร์ {mondayCount} วัน (งดประชุม)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เพิ่ม ลบ หรือแก้ไขวันหยุดนักขัตฤกษ์เพื่อประกอบการคำนวณและจัดระเบียบวาระกระทู้ถามอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notification Alert */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Form: Add or Edit Holiday */}
          <div className={`p-4 rounded-xl border transition-all ${
            editingOldDate
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-200/50'
              : 'bg-slate-50/70 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                {editingOldDate ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>แก้ไขวันหยุดราชการ: <span className="font-mono text-amber-800">{editingOldDate}</span></span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#0369a1]" />
                    <span>เพิ่มวันหยุดราชการใหม่</span>
                  </>
                )}
              </span>

              {editingOldDate && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                >
                  ยกเลิกการแก้ไข (กลับไปเพิ่มใหม่)
                </button>
              )}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Date Input */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    วันที่ (ค.ศ. / YYYY-MM-DD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1] bg-white"
                    required
                  />
                </div>

                {/* Name Input */}
                <div className="md:col-span-8 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ชื่อวันหยุดราชการ / วันหยุดนักขัตฤกษ์ <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="เช่น วันหยุดชดเชยวันวิสาขบูชา หรือ วันหยุดราชการพิเศษ..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1] bg-white"
                      required
                    />
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                        editingOldDate
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-[#0369a1] hover:bg-[#075985]'
                      }`}
                    >
                      {editingOldDate ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มวันหยุด</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Preview & Monday Impact Warning */}
              {inputDate && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-600 font-medium">
                    ตรงกับ: <strong className="text-slate-800">{inputThaiFull || inputDate}</strong>
                  </span>

                  {inputIsMonday ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      ตรงกับวันจันทร์: ระบบจะงดการประชุมและเลื่อนไปวันจันทร์ถัดไปโดยอัตโนมัติ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
                      ตรงกับ{inputDayOfWeek} (ไม่ใช่วันจันทร์ ไม่กระทบต่อการประชุมสภา)
                    </span>
                  )}
                </div>
              )}

              {/* Quick Presets */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">ตัวอย่างข้อความลัด:</span>
                {PRESET_NAMES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInputName(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#0369a1] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ทั้งหมด ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('monday_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  filterType === 'monday_only'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                เฉพาะวันจันทร์ ({mondayCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('2026')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === '2026'
                    ? 'bg-[#0369a1] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ปี 2569 (2026)
              </button>

              <button
                type="button"
                onClick={() => setFilterType('2027')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === '2027'
                    ? 'bg-[#0369a1] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ปี 2570 (2027)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อวันหยุด หรือวันที่..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-1 focus:ring-[#0369a1] bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Holidays List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>รายการวันหยุดราชการ ({filteredHolidays.length} วัน)</span>
              <span className="text-[11px] text-slate-400 font-normal">เรียงตามลำดับปฏิทิน</span>
            </div>

            {filteredHolidays.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CalendarOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">ไม่พบวันหยุดราชการตามเงื่อนไขที่เลือก</p>
                <p className="text-xs text-slate-400 mt-0.5">ลองเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredHolidays.map((item) => {
                  const isBeingEdited = editingOldDate === item.date;
                  const isConfirmingDelete = confirmDeleteDate === item.date;

                  return (
                    <div
                      key={item.date}
                      className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                        isBeingEdited
                          ? 'bg-amber-50 border-amber-300 shadow-2xs'
                          : item.isMonday
                          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Left info: Date + Day Badge + Name */}
                      <div className="flex items-center gap-3 min-w-[240px] flex-1">
                        {/* Date badge */}
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border shrink-0 text-center font-bold ${
                          item.isMonday
                            ? 'bg-rose-100 border-rose-200 text-rose-800'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          <span className="text-sm leading-tight">{item.date.split('-')[2]}</span>
                          <span className="text-[10px] leading-tight font-medium opacity-80">
                            {item.date.split('-')[1]}
                          </span>
                        </div>

                        {/* Text detail */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 leading-snug">
                              {item.name}
                            </span>
                            {item.isMonday ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                ตรงกับวันจันทร์ (งดประชุมสภา)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                {item.dayOfWeek}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{item.thaiFull}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[10px] text-slate-400">{item.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right actions: Edit & Delete */}
                      <div className="flex items-center gap-2">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg animate-in fade-in">
                            <span className="text-[11px] text-rose-800 font-bold">ยืนยันลบ?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.date)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              ลบ
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDate(null)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item.date, item.name)}
                              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                                isBeingEdited
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title="แก้ไขวันหยุด"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">แก้ไข</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDate(item.date)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title="ลบวันหยุด"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ลบ</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>คืนค่าวันหยุดมาตรฐาน (ตามประกาศทางการ)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            เสร็จสิ้น / ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
