export interface QuestionItem {
  id: string; // unique ID
  submittedOrder: number; // ลำดับที่ยื่น
  topic: string; // กระทู้ถามเรื่อง
  asker: string; // ผู้ตั้งถาม
  minister: string; // ถามรัฐมนตรี
  submittingDate?: string; // วันที่ยื่น (optional)
  postponedDate?: string; // เลื่อนตอบวันที่ (เช่น 2026-09-14 หรือ 14 ก.ย. 2569)
  postponedSheetRaw?: string; // ข้อความเดิมจากคอลัมน์ "เลื่อนตอบวันที่" ใน Sheet เช่น "21 ก.ย. 26"
  isPostponedInSheet?: boolean; // ตรวจพบวันเลื่อนตอบใน Google Sheet หรือไม่
  sheetRowIndex?: number; // ลำดับแถวใน Google Sheet เช่น แถวที่ 2 (Data!C2)
  notes?: string; // หมายเหตุ
  status?: 'pending' | 'scheduled' | 'postponed' | 'completed';
}

export interface ScheduledQuestion {
  question: QuestionItem;
  slotNumber: number; // 1, 2, 3
  isPostponedFromPrevious: boolean; // มาจากการเลื่อนของสัปดาห์ก่อนหน้าหรือไม่ (ลำดับแรก)
  postponedFromDate?: string;
  isPostponedNow?: boolean; // ผู้ใช้กดขอเลื่อนในรอบนี้
}

export interface WeeklySchedule {
  date: string; // ISO format YYYY-MM-DD
  thaiDateFormatted: string; // e.g. วันจันทร์ที่ 31 สิงหาคม 2569
  questions: ScheduledQuestion[];
  capacity: number; // default 3 or 3 + postponedCount
  baseCapacity?: number; // 3
  postponedCount?: number; // จำนวนกระทู้ที่เลื่อนมาจัดในสัปดาห์นี้
  isHoliday?: boolean;
  holidayName?: string;
  isCancelledMeeting?: boolean;
  cancelledReason?: string;
}

export interface HolidayItem {
  date: string;
  name: string;
  type?: 'holiday' | 'cancelled_meeting';
}

export interface SimulationConfig {
  startDate: string; // วันจันทร์แรกที่เริ่มบรรจุ (31 สิงหาคม 2569 / 2026-08-31)
  maxWeeks: number; // จำนวนสัปดาห์ที่ต้องการจัดล่วงหน้า
  questionsPerWeek: number; // 3
}
