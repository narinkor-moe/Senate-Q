import React, { useState, useEffect } from 'react';
import { QuestionItem } from '../types';
import { getWorkingMondays, formatThaiDate, parseThaiOrISODate, formatThaiShortDate } from '../scheduler';
import {
  Calendar,
  Clock,
  Check,
  RotateCcw,
  AlertCircle,
  X,
  Sparkles,
  Info,
  CalendarCheck,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface PostponeModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePostpone: (
    question: QuestionItem,
    targetDateISO: string | undefined,
    syncToSheet: boolean
  ) => Promise<boolean | void> | boolean | void;
  startDate: string;
  holidays?: Record<string, string>;
  isAdmin?: boolean;
}

export const PostponeModal: React.FC<PostponeModalProps> = ({
  question,
  isOpen,
  onClose,
  onSavePostpone,
  startDate,
  holidays,
  isAdmin = true,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [syncToGoogleSheet, setSyncToGoogleSheet] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generate upcoming working Mondays for quick selection (excluding holidays)
  const upcomingMondays = React.useMemo(() => {
    const { workingMondays } = getWorkingMondays(startDate || '2026-08-31', 8, holidays);
    return workingMondays;
  }, [startDate, holidays]);

  useEffect(() => {
    if (question) {
      if (question.postponedDate) {
        const parsed = parseThaiOrISODate(question.postponedDate);
        setSelectedDate(parsed || question.postponedDate);
      } else {
        // Default to next available Monday
        setSelectedDate(upcomingMondays[1] || upcomingMondays[0] || '2026-09-07');
      }
      setSyncToGoogleSheet(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
    }
  }, [question, upcomingMondays]);

  if (!isOpen || !question) return null;

  const targetSheetRow = question.sheetRowIndex || question.submittedOrder + 1;
  const targetCellName = `Data!C${targetSheetRow}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isAdmin) {
      setErrorMsg('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถบันทึกข้อมูลการขอเลื่อนตอบไปยัง Google Sheet ได้');
      return;
    }

    if (!selectedDate || selectedDate.trim() === '') {
      setErrorMsg('กรุณาระบุวันที่ต้องการขอเลื่อนไปตอบ');
      return;
    }

    const parsedISO = parseThaiOrISODate(selectedDate);
    if (!parsedISO) {
      setErrorMsg('รูปแบบวันที่ไม่ถูกต้อง กรุณาเลือกวันที่จากปฏิทินหรือปุ่มลัด');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onSavePostpone(question, parsedISO, syncToGoogleSheet);
      if (res !== false) {
        setSuccessMsg(
          syncToGoogleSheet
            ? `บันทึกข้อมูลและอัปเดตลง Google Sheet (${targetCellName}) สำเร็จ!`
            : 'บันทึกการขอเลื่อนวันตอบในระบบเรียบร้อยแล้ว'
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPostpone = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isAdmin) {
      setErrorMsg('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถยกเลิกการขอเลื่อนตอบใน Google Sheet ได้');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onSavePostpone(question, undefined, syncToGoogleSheet);
      if (res !== false) {
        setSuccessMsg(
          syncToGoogleSheet
            ? `ยกเลิกการขอเลื่อนและลบข้อมูลใน Google Sheet (${targetCellName}) สำเร็จ`
            : 'ยกเลิกการขอเลื่อนตอบในระบบเรียบร้อยแล้ว'
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการยกเลิกวันขอเลื่อน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>ขอเลื่อนวันตอบกระทู้ถาม</span>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  #{question.submittedOrder.toString().padStart(3, '0')}/2569
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดวันขอเลื่อนตอบ และซิงค์ข้อมูลตรงกับ Google Sheet (คอลัมน์ "เลื่อนตอบวันที่")
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Sheet Verification Banner */}
        {question.isPostponedInSheet || question.postponedSheetRaw ? (
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">
                  ตรวจพบวันเลื่อนตอบใน Google Sheet แล้ว
                </span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-bold border border-emerald-300">
                  {targetCellName}
                </span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                ค่าปัจจุบันในคอลัมน์ "เลื่อนตอบวันที่":{' '}
                <strong className="text-emerald-950 underline font-mono text-xs">
                  {question.postponedSheetRaw || question.postponedDate}
                </strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">
                  ยังไม่มีวันเลื่อนตอบใน Google Sheet
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-medium border border-amber-300">
                  {targetCellName} ว่างอยู่
                </span>
              </div>
              <p className="text-amber-800 text-[11px]">
                คุณสามารถเลือกวันที่ขอเลื่อนด้านล่าง ระบบจะบันทึกข้อมูลลง Google Sheet อัตโนมัติ
              </p>
            </div>
          </div>
        )}

        {/* Question Details summary */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px]">
              ลำดับที่ยื่น: {question.submittedOrder}
            </span>
            {question.postponedDate && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[10px] border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                เลื่อนตอบปัจจุบัน: {question.postponedSheetRaw || question.postponedDate}
              </span>
            )}
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm leading-snug">
              {question.topic}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1.5 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400">ผู้ตั้งถาม: </span>
              <strong className="text-slate-700">{question.asker}</strong>
            </div>
            <div>
              <span className="text-slate-400">ถาม รมต.: </span>
              <strong className="text-slate-700">{question.minister}</strong>
            </div>
          </div>
        </div>

        {/* Date Selection Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0369a1]" />
                ใส่วันที่ใหม่ที่ขอเลื่อนวันไปตอบ *
              </span>
              {selectedDate && (
                <span className="text-[11px] font-semibold text-[#0369a1]">
                  {formatThaiDate(selectedDate)}
                </span>
              )}
            </label>
            <input
              type="date"
              required
              disabled={isSubmitting}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/20 bg-white disabled:opacity-50"
            />
          </div>

          {/* Quick Select Buttons from Working Mondays */}
          <div>
            <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
              หรือเลือกวันจันทร์ที่มีวาระการประชุม:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {upcomingMondays.map((monday, idx) => {
                const isSelected = selectedDate === monday;
                return (
                  <button
                    key={monday}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedDate(monday);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs font-medium transition-all border cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-[#0369a1] text-white border-[#0369a1] shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#0369a1]'}`} />
                      <span>{formatThaiDate(monday).replace('วันจันทร์ที่ ', '')}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      W{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Sheets Sync Checkbox */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className={`flex items-start gap-2.5 ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer select-none'}`}>
              <input
                type="checkbox"
                disabled={isSubmitting || !isAdmin}
                checked={syncToGoogleSheet}
                onChange={(e) => setSyncToGoogleSheet(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0369a1] focus:ring-[#0369a1] cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  บันทึกข้อมูลลง Google Sheet ด้วย
                  {!isAdmin && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                      เฉพาะ Admin
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ระบบจะบันทึกวันที่ลงในเซลล์ <strong className="text-slate-800 font-mono">{targetCellName}</strong>{' '}
                  (คอลัมน์ "เลื่อนตอบวันที่") ของ Google Sheet
                </p>
              </div>
            </label>
          </div>

          {!isAdmin && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-900">
                  สิทธิ์ผู้ใช้งานทั่วไป: ไม่สามารถบันทึกการขอเลื่อนตอบไปยัง Google Sheet ได้
                </span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  ฟังก์ชันนี้สงวนสิทธิ์สำหรับผู้ดูแลระบบ (Admin) เท่านั้น กรุณาเข้าสู่ระบบด้วยรหัสผ่าน <strong className="font-mono underline">admin1234</strong> เพื่อบันทึกข้อมูล
                </p>
              </div>
            </div>
          )}

          {/* Parliamentary Rules Guide */}
          <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-200 text-[11px] text-sky-900 space-y-1">
            <div className="font-bold flex items-center gap-1 text-sky-950">
              <Sparkles className="w-3.5 h-3.5 text-[#0369a1]" />
              สิทธิ์และเกณฑ์การจัดลำดับเมื่อขอเลื่อนวันตอบ:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-sky-800 leading-relaxed pl-0.5">
              <li>ได้สิทธิ์เป็น <strong>ลำดับแรก (Prioritized Slot)</strong> ในวันที่ขอเลื่อนไปตอบ</li>
              <li>สามารถจัด <strong>เกิน 3 กระทู้ได้</strong> ในวันดังกล่าว</li>
              <li><strong>ชื่อผู้ตั้งถามห้ามซ้ำกัน</strong> กับกระทู้อื่นในวันนั้น</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {question.postponedDate ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResetPostpone}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer border border-rose-200 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>ยกเลิกการขอเลื่อน (ลบใน Google Sheet)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                ปิด
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isAdmin}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors ${
                !isAdmin
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'bg-[#0369a1] hover:bg-[#075985] text-white cursor-pointer disabled:opacity-50'
              }`}
              title={!isAdmin ? 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถบันทึกข้อมูลลง Google Sheet ได้' : undefined}
            >
              {!isAdmin ? (
                <>
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>เฉพาะ Admin (บันทึกลง Google Sheet)</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกลง Sheet...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึก & บันทึกลง Google Sheet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
