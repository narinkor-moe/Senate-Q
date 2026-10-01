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
  ShieldCheck,
  CalendarCheck,
  CalendarPlus,
  Cloud
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
  specialMeetings?: Record<string, string>;
  onSaveSpecialMeeting?: (date: string, name: string, oldDate?: string) => void;
  onDeleteSpecialMeeting?: (date: string) => void;
  onResetSpecialMeetings?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline';
}

export const HolidayManagerModal: React.FC<HolidayManagerModalProps> = ({
  isOpen,
  onClose,
  holidays,
  onSaveHoliday,
  onDeleteHoliday,
  onResetHolidays,
  specialMeetings = {},
  onSaveSpecialMeeting,
  onDeleteSpecialMeeting,
  onResetSpecialMeetings,
  cloudSyncStatus = 'synced',
}) => {
  // --- 1. Public Holidays Form State ---
  const [inputDate, setInputDate] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [editingOldDate, setEditingOldDate] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // --- 2. Special Meeting Dates Form State ---
  const [inputSpecialDate, setInputSpecialDate] = useState<string>('');
  const [inputSpecialName, setInputSpecialName] = useState<string>('');
  const [editingOldSpecialDate, setEditingOldSpecialDate] = useState<string | null>(null);
  const [specialFormError, setSpecialFormError] = useState<string | null>(null);
  const [confirmDeleteSpecialDate, setConfirmDeleteSpecialDate] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<
    'all' | 'monday_only' | 'cancelled_only' | 'holiday_only' | 'special_only' | '2026' | '2027'
  >('all');
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  // Quick preset titles for Public Holidays
  const PRESET_NAMES = [
    'วันงดประชุม (มติที่ประชุม)',
    'วันงดประชุมวุฒิสภา',
    'วันหยุดราชการเป็นกรณีพิเศษ',
    'วันหยุดชดเชย',
    'วันหยุดพิเศษตามมติ ครม.',
    'วันหยุดชดเชยวันแรงงานแห่งชาติ'
  ];

  // Quick preset titles for Special Meetings
  const SPECIAL_PRESET_NAMES = [
    'วันนัดประชุมวุฒิสภาเป็นพิเศษ',
    'วันนัดประชุมเป็นพิเศษ (พิจารณากระทู้ถาม)',
    'วันนัดประชุมร่วมกันของรัฐสภาเป็นพิเศษ',
    'วันนัดประชุมเป็นพิเศษตามมติที่ประชุม',
    'วันนัดประชุมเป็นพิเศษ (นัดพิเศษวันอังคาร)',
    'วันนัดประชุมเป็นพิเศษ (นัดพิเศษวันศุกร์)',
  ];

  // Convert holidays dictionary to sorted array
  const sortedHolidays = useMemo(() => {
    return Object.entries(holidays)
      .map(([date, rawName]) => {
        const name = String(rawName || '');
        const isCancelledMeeting = name.includes('งดประชุม') || name.includes('งดการประชุม');
        return {
          itemType: 'holiday' as const,
          date,
          name,
          isMonday: isMondayDate(date),
          isCancelledMeeting,
          thaiFull: formatThaiDateWithDayOfWeek(date),
          dayOfWeek: getDayOfWeekThai(date),
          year: date.split('-')[0]
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  // Convert special meetings dictionary to sorted array
  const sortedSpecialMeetings = useMemo(() => {
    return Object.entries(specialMeetings || {})
      .map(([date, rawName]) => {
        const name = String(rawName || '');
        return {
          itemType: 'special' as const,
          date,
          name,
          isMonday: isMondayDate(date),
          isCancelledMeeting: false,
          thaiFull: formatThaiDateWithDayOfWeek(date),
          dayOfWeek: getDayOfWeekThai(date),
          year: date.split('-')[0],
          isHolidayConflict: !!holidays[date],
          holidayConflictName: holidays[date] || '',
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [specialMeetings, holidays]);

  // Summary counts
  const totalHolidaysCount = sortedHolidays.length;
  const mondayCount = useMemo(() => {
    return sortedHolidays.filter((h) => h.isMonday).length;
  }, [sortedHolidays]);
  const cancelledCount = useMemo(() => {
    return sortedHolidays.filter((h) => h.isCancelledMeeting).length;
  }, [sortedHolidays]);
  const specialCount = sortedSpecialMeetings.length;

  // Combined items for search & filter below
  const combinedItems = useMemo(() => {
    const list = [...sortedHolidays, ...sortedSpecialMeetings];
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [sortedHolidays, sortedSpecialMeetings]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return combinedItems.filter((item) => {
      // Search match
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.includes(searchQuery) ||
        item.thaiFull.includes(searchQuery);

      if (!matchesSearch) return false;

      // Filter category
      if (filterType === 'monday_only') return item.isMonday;
      if (filterType === 'cancelled_only') return item.itemType === 'holiday' && item.isCancelledMeeting;
      if (filterType === 'holiday_only') return item.itemType === 'holiday' && !item.isCancelledMeeting;
      if (filterType === 'special_only') return item.itemType === 'special';
      if (filterType === '2026') return item.year === '2026';
      if (filterType === '2027') return item.year === '2027';
      return true;
    });
  }, [combinedItems, searchQuery, filterType]);

  if (!isOpen) return null;

  // --- Handlers for Holiday ---
  const handleStartEditHoliday = (date: string, name: string) => {
    setInputDate(date);
    setInputName(name);
    setEditingOldDate(date);
    setFormError(null);
    setSuccessNotice(null);
    setConfirmDeleteDate(null);
  };

  const handleCancelEditHoliday = () => {
    setInputDate('');
    setInputName('');
    setEditingOldDate(null);
    setFormError(null);
  };

  const handleHolidayFormSubmit = (e: React.FormEvent) => {
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

  const handleDeleteHolidayItem = (date: string) => {
    onDeleteHoliday(date);
    setConfirmDeleteDate(null);
    if (editingOldDate === date) {
      handleCancelEditHoliday();
    }
    setSuccessNotice(`ลบวันหยุดวันที่ ${date} สำเร็จ`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleResetHolidaysList = () => {
    if (window.confirm('คุณต้องการคืนค่าวันหยุดนักขัตฤกษ์ทั้งหมดให้เป็นค่ามาตรฐานของทางการไทยใช่หรือไม่?')) {
      onResetHolidays();
      handleCancelEditHoliday();
      setSuccessNotice('คืนค่าวันหยุดนักขัตฤกษ์มาตรฐานเรียบร้อยแล้ว');
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  // --- Handlers for Special Meetings ---
  const handleStartEditSpecial = (date: string, name: string) => {
    setInputSpecialDate(date);
    setInputSpecialName(name);
    setEditingOldSpecialDate(date);
    setSpecialFormError(null);
    setSuccessNotice(null);
    setConfirmDeleteSpecialDate(null);
  };

  const handleCancelEditSpecial = () => {
    setInputSpecialDate('');
    setInputSpecialName('');
    setEditingOldSpecialDate(null);
    setSpecialFormError(null);
  };

  const handleSpecialFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpecialFormError(null);
    setSuccessNotice(null);

    const trimmedDate = inputSpecialDate.trim();
    const trimmedName = inputSpecialName.trim();

    if (!trimmedDate) {
      setSpecialFormError('กรุณาเลือกวันที่ของวันนัดประชุมเป็นพิเศษ');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setSpecialFormError('รูปแบบวันที่ต้องเป็น YYYY-MM-DD');
      return;
    }

    if (!trimmedName) {
      setSpecialFormError('กรุณาระบุรายละเอียดหรือวาระการนัดประชุมเป็นพิเศษ');
      return;
    }

    if (onSaveSpecialMeeting) {
      onSaveSpecialMeeting(trimmedDate, trimmedName, editingOldSpecialDate || undefined);
    }

    const dayName = getDayOfWeekThai(trimmedDate);
    setSuccessNotice(
      editingOldSpecialDate
        ? `แก้ไขวันนัดประชุมเป็นพิเศษ "${trimmedName}" (${dayName}ที่ ${trimmedDate}) เรียบร้อยแล้ว`
        : `เพิ่มวันนัดประชุมเป็นพิเศษ "${trimmedName}" (${dayName}ที่ ${trimmedDate}) เรียบร้อยแล้ว`
    );

    // Reset special form
    setInputSpecialDate('');
    setInputSpecialName('');
    setEditingOldSpecialDate(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDeleteSpecialItem = (date: string) => {
    if (onDeleteSpecialMeeting) {
      onDeleteSpecialMeeting(date);
    }
    setConfirmDeleteSpecialDate(null);
    if (editingOldSpecialDate === date) {
      handleCancelEditSpecial();
    }
    setSuccessNotice(`ลบวันนัดประชุมเป็นพิเศษวันที่ ${date} สำเร็จ`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Previews
  const inputDayOfWeek = inputDate ? getDayOfWeekThai(inputDate) : '';
  const inputIsMonday = inputDate ? isMondayDate(inputDate) : false;
  const inputThaiFull = inputDate ? formatThaiDateWithDayOfWeek(inputDate) : '';

  const inputSpecialDayOfWeek = inputSpecialDate ? getDayOfWeekThai(inputSpecialDate) : '';
  const inputSpecialIsMonday = inputSpecialDate ? isMondayDate(inputSpecialDate) : false;
  const inputSpecialThaiFull = inputSpecialDate ? formatThaiDateWithDayOfWeek(inputSpecialDate) : '';
  const inputSpecialConflictHoliday = inputSpecialDate ? holidays[inputSpecialDate] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0369a1]/10 text-[#0369a1] border border-[#0369a1]/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  จัดการปฏิทินวันหยุดนักขัตฤกษ์ และ วันงดประชุม
                </h3>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  วันหยุด {totalHolidaysCount} วัน
                </span>
                <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  ตรงกับวันจันทร์ {mondayCount} วัน (งดประชุม)
                </span>
                {cancelledCount > 0 && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    วันงดประชุม {cancelledCount} วัน
                  </span>
                )}
                {specialCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    นัดประชุมเป็นพิเศษ {specialCount} วัน
                  </span>
                )}
                <span
                  className="bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                  title="ข้อมูลปฏิทินวันหยุด วันงดประชุม และวันนัดประชุมเป็นพิเศษ ซิงก์เชื่อมโยงผ่าน Cloud Firestore ทุกอุปกรณ์ใช้ข้อมูลเดียวกันแบบเรียลไทม์"
                >
                  <Cloud className="w-3.5 h-3.5 text-sky-600" />
                  ซิงก์คลาวด์ทุกอุปกรณ์
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เพิ่ม ลบ หรือแก้ไขวันหยุดราชการ วันงดประชุม และวันนัดประชุมเป็นพิเศษ เพื่อประกอบการคำนวณและจัดระเบียบวาระกระทู้ถามอัตโนมัติ
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

          {/* SECTION 1: Form Add or Edit Holiday (เพิ่มวันหยุดราชการใหม่) */}
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
                  onClick={handleCancelEditHoliday}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                >
                  ยกเลิกการแก้ไข (กลับไปเพิ่มใหม่)
                </button>
              )}
            </div>

            <form onSubmit={handleHolidayFormSubmit} className="space-y-3">
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

              {/* Quick Presets for Holidays */}
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

          {/* SECTION 2: วันนัดประชุมเป็นพิเศษ (Special Meeting Dates Section - Directly under เพิ่มวันหยุดราชการใหม่) */}
          <div className={`p-4.5 rounded-xl border transition-all ${
            editingOldSpecialDate
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200/60'
              : 'bg-gradient-to-br from-indigo-50/40 via-sky-50/20 to-slate-50/60 border-indigo-200/90 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  {editingOldSpecialDate ? (
                    <>
                      <span>แก้ไขวันนัดประชุมเป็นพิเศษ: <span className="font-mono text-indigo-800">{editingOldSpecialDate}</span></span>
                    </>
                  ) : (
                    <>
                      <span>วันนัดประชุมเป็นพิเศษ</span>
                      <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {specialCount} วัน
                      </span>
                    </>
                  )}
                </span>
              </div>

              {editingOldSpecialDate && (
                <button
                  type="button"
                  onClick={handleCancelEditSpecial}
                  className="text-xs text-indigo-700 hover:text-indigo-900 underline font-medium cursor-pointer"
                >
                  ยกเลิกการแก้ไข (กลับไปเพิ่มใหม่)
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3">
              กำหนดวันนัดประชุมวุฒิสภาเป็นพิเศษ (นอกเหนือจากวันจันทร์ปกติ หรือนัดประชุมเพิ่มเติมเป็นกรณีพิเศษ) เพื่อประกอบการจัดระเบียบวาระกระทู้ถาม
            </p>

            <form onSubmit={handleSpecialFormSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Special Date Input */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    วันที่นัดประชุมเป็นพิเศษ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={inputSpecialDate}
                    onChange={(e) => setInputSpecialDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                    required
                  />
                </div>

                {/* Special Name / Agenda Input */}
                <div className="md:col-span-8 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    รายละเอียด / วาระวันนัดประชุมเป็นพิเศษ <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputSpecialName}
                      onChange={(e) => setInputSpecialName(e.target.value)}
                      placeholder="เช่น วันนัดประชุมวุฒิสภาเป็นพิเศษ (พิจารณากระทู้ถามค้างตอบ)..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                      required
                    />
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                        editingOldSpecialDate
                          ? 'bg-indigo-700 hover:bg-indigo-800'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {editingOldSpecialDate ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>+ เพิ่มวันนัดประชุมเป็นพิเศษ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Preview for Special Date */}
              {inputSpecialDate && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-600 font-medium">
                    ตรงกับ: <strong className="text-slate-800">{inputSpecialThaiFull || inputSpecialDate}</strong>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                    <CalendarCheck className="w-3 h-3 text-indigo-700" />
                    วันนัดประชุมเป็นพิเศษ ({inputSpecialDayOfWeek})
                  </span>

                  {inputSpecialConflictHoliday ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      ตรงกับวันหยุด: "{inputSpecialConflictHoliday}" (กำหนดจัดประชุมเป็นพิเศษแทนการงด)
                    </span>
                  ) : !inputSpecialIsMonday ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 text-sky-800 border border-sky-200">
                      วันนัดประชุมเพิ่มเติมนอกรอบวันจันทร์ปกติ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ตรงกับวันจันทร์ปกติ
                    </span>
                  )}
                </div>
              )}

              {/* Quick Presets for Special Meetings */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold">ตัวอย่างข้อความลัด:</span>
                {SPECIAL_PRESET_NAMES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInputSpecialName(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {specialFormError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{specialFormError}</span>
                </div>
              )}
            </form>

            {/* List of currently registered Special Meetings */}
            <div className="mt-4 pt-3 border-t border-indigo-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>รายการวันนัดประชุมเป็นพิเศษที่กำหนดไว้ ({specialCount} วัน)</span>
                </span>
                {specialCount > 0 && onResetSpecialMeetings && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('คุณต้องการล้างรายการวันนัดประชุมเป็นพิเศษทั้งหมดใช่หรือไม่?')) {
                        onResetSpecialMeetings();
                        handleCancelEditSpecial();
                        setSuccessNotice('ล้างรายการวันนัดประชุมเป็นพิเศษเรียบร้อยแล้ว');
                        setTimeout(() => setSuccessNotice(null), 3000);
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 underline font-normal cursor-pointer"
                  >
                    ล้างรายการวันนัดพิเศษทั้งหมด
                  </button>
                )}
              </div>

              {specialCount === 0 ? (
                <div className="p-3 bg-white/80 rounded-lg border border-dashed border-indigo-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    ยังไม่มีการกำหนดวันนัดประชุมเป็นพิเศษ สามารถเลือกวันที่และระบุรายละเอียดเพื่อเพิ่มวันนัดประชุมด้านบนได้ทันที
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {sortedSpecialMeetings.map((item) => {
                    const isBeingEdited = editingOldSpecialDate === item.date;
                    const isConfirmingDelete = confirmDeleteSpecialDate === item.date;

                    return (
                      <div
                        key={item.date}
                        className={`p-2.5 rounded-lg border transition-all flex flex-wrap items-center justify-between gap-2 ${
                          isBeingEdited
                            ? 'bg-indigo-100/70 border-indigo-400 shadow-2xs'
                            : 'bg-white border-indigo-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-[220px] flex-1">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center shrink-0 text-center font-bold text-indigo-900">
                            <span className="text-xs leading-none">{item.date.split('-')[2]}</span>
                            <span className="text-[9px] leading-tight font-medium opacity-80">
                              {item.date.split('-')[1]}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">
                                {item.name}
                              </span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                นัดประชุมเป็นพิเศษ
                              </span>
                              {item.isHolidayConflict && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-200">
                                  แทนวันหยุด ({item.holidayConflictName})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>{item.thaiFull}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-[10px] text-slate-400">{item.date}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg animate-in fade-in">
                              <span className="text-[10px] text-rose-800 font-bold">ยืนยันลบ?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSpecialItem(item.date)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                ลบ
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSpecialDate(null)}
                                className="px-1 py-0.5 text-slate-500 hover:text-slate-700 text-[11px] font-medium cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditSpecial(item.date, item.name)}
                                className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                                  isBeingEdited
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title="แก้ไขวันนัดประชุมเป็นพิเศษ"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span className="hidden sm:inline text-[11px]">แก้ไข</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSpecialDate(item.date)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="ลบวันนัดประชุมเป็นพิเศษ"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="hidden sm:inline text-[11px]">ลบ</span>
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
                ทั้งหมด ({combinedItems.length})
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

              {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('cancelled_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    filterType === 'cancelled_only'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  วันงดประชุม ({cancelledCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => setFilterType('holiday_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'holiday_only'
                    ? 'bg-[#0369a1] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                วันหยุดราชการ ({totalHolidaysCount - cancelledCount})
              </button>

              {specialCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('special_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    filterType === 'special_only'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  <CalendarCheck className="w-3 h-3" />
                  วันนัดประชุมเป็นพิเศษ ({specialCount})
                </button>
              )}

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

          {/* List of Holidays & Meetings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>
                {filterType === 'special_only'
                  ? `รายการวันนัดประชุมเป็นพิเศษ (${filteredItems.length} วัน)`
                  : `รายการวันหยุดราชการ และ วันนัดประชุม (${filteredItems.length} วัน)`}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">เรียงตามลำดับปฏิทิน</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CalendarOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">ไม่พบรายการตามเงื่อนไขที่เลือก</p>
                <p className="text-xs text-slate-400 mt-0.5">ลองเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const isSpecial = item.itemType === 'special';
                  const isBeingEdited = isSpecial
                    ? editingOldSpecialDate === item.date
                    : editingOldDate === item.date;
                  const isConfirmingDelete = isSpecial
                    ? confirmDeleteSpecialDate === item.date
                    : confirmDeleteDate === item.date;

                  return (
                    <div
                      key={`${item.itemType}-${item.date}`}
                      className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                        isBeingEdited
                          ? 'bg-amber-50 border-amber-300 shadow-2xs'
                          : isSpecial
                          ? 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-300'
                          : item.isCancelledMeeting
                          ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                          : item.isMonday
                          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Left info: Date + Day Badge + Name */}
                      <div className="flex items-center gap-3 min-w-[240px] flex-1">
                        {/* Date badge */}
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border shrink-0 text-center font-bold ${
                          isSpecial
                            ? 'bg-indigo-100 border-indigo-200 text-indigo-900'
                            : item.isCancelledMeeting
                            ? 'bg-amber-100 border-amber-200 text-amber-900'
                            : item.isMonday
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

                            {isSpecial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
                                <CalendarCheck className="w-2.5 h-2.5 text-indigo-600" />
                                วันนัดประชุมเป็นพิเศษ (วุฒิสภา)
                              </span>
                            ) : item.isCancelledMeeting ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                วันงดประชุมสภา (ข้ามไปจัดวันจันทร์ถัดไป)
                              </span>
                            ) : item.isMonday ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                ตรงกับวันจันทร์ (วันหยุดนักขัตฤกษ์ - งดประชุม)
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
                              onClick={() => {
                                if (isSpecial) {
                                  handleDeleteSpecialItem(item.date);
                                } else {
                                  handleDeleteHolidayItem(item.date);
                                }
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              ลบ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSpecial) {
                                  setConfirmDeleteSpecialDate(null);
                                } else {
                                  setConfirmDeleteDate(null);
                                }
                              }}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSpecial) {
                                  handleStartEditSpecial(item.date, item.name);
                                } else {
                                  handleStartEditHoliday(item.date, item.name);
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                                isBeingEdited
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={isSpecial ? 'แก้ไขวันนัดประชุมเป็นพิเศษ' : 'แก้ไขวันหยุด'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">แก้ไข</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isSpecial) {
                                  setConfirmDeleteSpecialDate(item.date);
                                } else {
                                  setConfirmDeleteDate(item.date);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title={isSpecial ? 'ลบวันนัดประชุมเป็นพิเศษ' : 'ลบวันหยุด'}
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
            onClick={handleResetHolidaysList}
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
