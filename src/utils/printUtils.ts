import { WeeklySchedule, QuestionItem, HolidayItem } from '../types';
import { formatThaiDateWithDayOfWeek } from '../scheduler';
import { computeAskerStats } from './askerStats';

export interface PrintReportOptions {
  reportType: 'all_weeks' | 'selected_week' | 'all_questions_table' | 'postponed_only' | 'asker_statistics';
  selectedWeekDate?: string;
  includeSignature: boolean;
  includeHolidayNotice: boolean;
  includeSummary: boolean;
  orientation?: 'landscape' | 'portrait';
  tableFontSize?: number;
  customTitle?: string;
  customDepartment?: string;
  signatory1Title?: string;
  signatory2Title?: string;
  signatory3Title?: string;
}

/**
 * Format current date/time in Thai format
 */
export function getCurrentThaiDateTimeString(): string {
  const now = new Date();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = now.getFullYear() + 543;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `วันที่ ${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
}

/**
 * Generate official Thai parliamentary report HTML for printing
 */
export function generateReportHtml(
  schedules: WeeklySchedule[],
  allQuestions: QuestionItem[],
  skippedHolidays: HolidayItem[],
  options: PrintReportOptions
): string {
  const currentDateTime = getCurrentThaiDateTimeString();
  const title = options.customTitle || 'รายงานการจัดระเบียบวาระกระทู้ถามในการประชุมวุฒิสภา';
  const department = options.customDepartment || 'กลุ่มการเมือง สำนักงานรัฐมนตรี กระทรวงศึกษาธิการ';
  const tableFontSize = options.tableFontSize || 16;
  const orientation = options.orientation || 'landscape';
  const isLandscape = orientation === 'landscape';

  // Filter schedules based on reportType
  let targetSchedules = schedules;
  if (options.reportType === 'selected_week' && options.selectedWeekDate) {
    targetSchedules = schedules.filter((s) => s.date === options.selectedWeekDate);
  }

  // If postponed only, filter questions inside schedules
  if (options.reportType === 'postponed_only') {
    targetSchedules = schedules.map((s) => ({
      ...s,
      questions: s.questions.filter((q) => q.isPostponedNow || q.isPostponedFromPrevious || !!q.question.postponedDate)
    })).filter((s) => s.questions.length > 0);
  }

  // Calculate statistics
  const totalScheduled = schedules.reduce((sum, s) => sum + s.questions.length, 0);
  const totalPostponed = allQuestions.filter((q) => q.status === 'postponed' || !!q.postponedDate).length;
  const totalQuestions = allQuestions.length;

  let bodyContent = '';

  if (options.reportType === 'asker_statistics') {
    const postponedIdSet = new Set(allQuestions.filter((q) => q.postponedDate).map((q) => q.id));
    const askerStats = computeAskerStats(allQuestions, schedules, postponedIdSet);

    bodyContent = `
      <div class="report-section">
        <h3 class="section-title">รายงานสถิติผู้ตั้งกระทู้ถาม (วุฒิสภา) - รวมสมาชิกวุฒิสภา ${askerStats.totalUniqueAskers} ท่าน (${totalQuestions} กระทู้)</h3>
        
        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">ผู้ตั้งถามทั้งหมด</div>
            <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 2px;">${askerStats.totalUniqueAskers} ท่าน</div>
          </div>
          <div style="flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">เฉลี่ยกระทู้ต่อท่าน</div>
            <div style="font-size: 20px; font-weight: bold; color: #047857; margin-top: 2px;">${askerStats.avgQuestionsPerAsker} เรื่อง</div>
          </div>
          <div style="flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">มีวาระทางการแล้ว</div>
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8; margin-top: 2px;">${askerStats.askersWithOfficial} ท่าน</div>
          </div>
          <div style="flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">มีกระทู้ขอเลื่อนตอบ</div>
            <div style="font-size: 20px; font-weight: bold; color: #b45309; margin-top: 2px;">${askerStats.askersWithPostponed} ท่าน</div>
          </div>
          ${askerStats.askersWithWithdrawn > 0 ? `
          <div style="flex: 1; min-width: 140px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 11px; color: #9f1239; font-weight: bold;">มีกระทู้ขอถอน</div>
            <div style="font-size: 20px; font-weight: bold; color: #e11d48; margin-top: 2px;">${askerStats.askersWithWithdrawn} ท่าน</div>
          </div>
          ` : ''}
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 55px; text-align: center;">ลำดับที่</th>
              <th>ชื่อผู้ตั้งกระทู้ถาม (สมาชิกวุฒิสภา)</th>
              <th style="width: 90px; text-align: center;">รวมยื่น</th>
              <th style="width: 95px; text-align: center;">วาระทางการ</th>
              <th style="width: 85px; text-align: center;">คาดการณ์</th>
              <th style="width: 85px; text-align: center;">ขอเลื่อน</th>
              <th style="width: 80px; text-align: center;">ตอบแล้ว</th>
              <th style="width: 80px; text-align: center;">ขอถอน</th>
              <th style="width: 75px; text-align: center;">รอคิว</th>
              <th style="${isLandscape ? 'width: 220px;' : 'width: 160px;'}">กระทรวงหลักที่ตั้งถาม</th>
              <th style="width: 70px; text-align: center;">สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            ${askerStats.allAskers.map((a) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${a.rank}</td>
                <td><strong>${escapeHtml(a.asker)}</strong></td>
                <td style="text-align: center; font-weight: bold; color: #0369a1;">${a.totalQuestions}</td>
                <td style="text-align: center; font-weight: bold; color: #1d4ed8;">${a.officialCount || '-'}</td>
                <td style="text-align: center; color: #7e22ce;">${a.projectedCount || '-'}</td>
                <td style="text-align: center; color: #b45309; font-weight: bold;">${a.postponedCount || '-'}</td>
                <td style="text-align: center; color: #047857;">${a.answeredCount || '-'}</td>
                <td style="text-align: center; color: #e11d48; font-weight: bold;">${a.withdrawnCount || '-'}</td>
                <td style="text-align: center; color: #64748b;">${a.pendingCount || '-'}</td>
                <td>${escapeHtml(a.topMinisters.slice(0, 2).map((m) => `${m.minister} (${m.count})`).join(', ') || '-')}</td>
                <td style="text-align: center;">${a.percentageOfTotal}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (options.reportType === 'all_questions_table') {
    // Render full questions directory table
    bodyContent = `
      <div class="report-section">
        <h3 class="section-title">บัญชีทะเบียนกระทู้ถามทั้งหมด (รวม ${totalQuestions} เรื่อง)</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 75px; text-align: center;">ลำดับที่</th>
              <th>ชื่อเรื่องกระทู้ถาม</th>
              <th style="${isLandscape ? 'width: 220px;' : 'width: 180px;'}">ผู้ตั้งกระทู้ถาม</th>
              <th style="${isLandscape ? 'width: 220px;' : 'width: 180px;'}">ถามรัฐมนตรี</th>
              <th style="${isLandscape ? 'width: 145px;' : 'width: 130px;'} text-align: center;">สถานะ</th>
              <th style="${isLandscape ? 'width: 180px;' : 'width: 140px;'}">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${allQuestions.map((q, idx) => {
              let statusText = 'รอดำเนินการ';
              let statusClass = 'status-pending';
              if (q.status === 'withdrawn' || q.isWithdrawn || (q.rawStatus && (q.rawStatus.includes('ถอน') || q.rawStatus.toLowerCase().includes('withdrawn')))) {
                statusText = 'ขอถอน (ไม่นำมาจัดวาระ)';
                statusClass = 'status-withdrawn';
              } else if (q.status === 'completed' || q.status === 'answered' || q.isAnswered || (q.rawStatus && q.rawStatus.includes('ตอบแล้ว'))) {
                statusText = 'ตอบแล้ว (ไม่นำมาจัดวาระ)';
                statusClass = 'status-completed';
              } else if (q.status === 'postponed' || q.postponedDate) {
                statusText = `ขอเลื่อนตอบ (${q.postponedDate || ''})`;
                statusClass = 'status-postponed';
              } else if (q.status === 'scheduled') {
                statusText = 'บรรจุวาระแล้ว';
                statusClass = 'status-scheduled';
              }
              return `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${q.submittedOrder || idx + 1}</td>
                  <td>${escapeHtml(q.topic)}</td>
                  <td>${escapeHtml(q.asker)}</td>
                  <td>${escapeHtml(q.minister)}</td>
                  <td style="text-align: center;"><span class="${statusClass}">${statusText}</span></td>
                  <td>${escapeHtml(q.notes || '-')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Render weekly schedules
    bodyContent = targetSchedules.map((schedule, weekIdx) => {
      const isOfficial = schedule.scheduleType === 'official';
      const scheduleTypeBadge = isOfficial 
        ? '<span style="background: #1e40af; color: #ffffff; padding: 2px 8px; border-radius: 3px; font-size: 11pt; font-weight: bold; margin-left: 8px;">ระเบียบวาระทางการ</span>' 
        : '<span style="background: #475569; color: #ffffff; padding: 2px 8px; border-radius: 3px; font-size: 11pt; font-weight: bold; margin-left: 8px;">คาดการณ์ล่วงหน้า</span>';

      return `
        <div class="week-card">
          <div class="week-header">
            <div>
              <span class="week-badge">สัปดาห์ที่ ${weekIdx + 1}</span>
              <strong class="week-date">ระเบียบวาระการประชุม: ${schedule.thaiDateFormatted}</strong>
              ${scheduleTypeBadge}
            </div>
            <span class="week-stat">บรรจุกระทู้: ${schedule.questions.length} / ${schedule.capacity} เรื่อง</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="${isLandscape ? 'width: 70px;' : 'width: 60px;'} text-align: center;">วาระที่</th>
                <th>ชื่อเรื่องกระทู้ถาม</th>
                <th style="${isLandscape ? 'width: 220px;' : 'width: 175px;'}">ผู้ตั้งกระทู้ถาม</th>
                <th style="${isLandscape ? 'width: 220px;' : 'width: 175px;'}">ถามรัฐมนตรี</th>
                <th style="${isLandscape ? 'width: 195px;' : 'width: 155px;'}">สถานะ / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.questions.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; color: #64748b; padding: 14px;">
                    - ไม่มีการบรรจุกระทู้ถามในสัปดาห์นี้ -
                  </td>
                </tr>
              ` : schedule.questions.map((item, slotIdx) => {
                let noteHtml = isOfficial 
                  ? '<span class="status-badge status-official">บรรจุในระเบียบวาระ</span>' 
                  : '<span class="status-badge status-projected">คาดการณ์ตามลำดับ</span>';
                
                const isAnswered = item.question.isAnswered === true || item.question.status === 'completed' || item.question.status === 'answered' || (item.question.rawStatus && item.question.rawStatus.includes('ตอบแล้ว'));

                if (isAnswered) {
                  noteHtml = '<span class="status-badge status-answered">ตอบแล้วในที่ประชุม (เสร็จสิ้น)</span>';
                } else if (item.isPostponedFromPrevious) {
                  noteHtml = '<span class="status-badge status-previous-postponed">กระทู้เลื่อนมาจากสัปดาห์ก่อนหน้า (บรรจุลำดับแรก)</span>';
                } else if (item.isPostponedNow) {
                  const pDate = item.question.postponedDate 
                    ? formatThaiDateWithDayOfWeek(item.question.postponedDate) 
                    : '';
                  noteHtml = `<span class="status-badge status-postponed">ขอเลื่อนไปตอบ${pDate ? ': ' + pDate : ''}</span>`;
                } else if (item.question.postponedDate) {
                  noteHtml = `<span class="status-badge status-postponed">ขอเลื่อนตอบ: ${item.question.postponedDate}</span>`;
                } else if (item.projectionType === 'projected_regular') {
                  noteHtml = '<span class="status-badge status-projected">คาดการณ์ตามลำดับปกติ</span>';
                }

                return `
                  <tr>
                    <td style="text-align: center; font-weight: 700; vertical-align: middle;">${item.slotNumber || slotIdx + 1}</td>
                    <td>
                      <div style="font-weight: 700; line-height: 1.45;">${escapeHtml(item.question.topic)}</div>
                    </td>
                    <td style="font-weight: 500;">${escapeHtml(item.question.asker)}</td>
                    <td style="color: #1e293b;">${escapeHtml(item.question.minister)}</td>
                    <td>${noteHtml}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  }

  // Summary Box HTML
  const summaryBox = options.includeSummary ? `
    <div class="summary-box">
      <div class="summary-item">
        <span class="summary-label">กระทู้ถามทั้งหมด:</span>
        <strong class="summary-val">${totalQuestions} เรื่อง</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">บรรจุในระเบียบวาระแล้ว:</span>
        <strong class="summary-val text-primary">${totalScheduled} เรื่อง</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">กระทู้ที่มีการขอเลื่อนตอบ:</span>
        <strong class="summary-val text-warning">${totalPostponed} เรื่อง</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">จำนวนสัปดาห์ที่จัดวาระ:</span>
        <strong class="summary-val">${targetSchedules.length} สัปดาห์</strong>
      </div>
    </div>
  ` : '';

  // Holidays Box HTML
  const holidaysBox = options.includeHolidayNotice && skippedHolidays.length > 0 ? `
    <div class="notice-box">
      <strong>หมายเหตุวันหยุดราชการนักขัตฤกษ์ที่งดการประชุมสภา (ระบบเลื่อนวาระไปวันจันทร์ถัดไปโดยอัตโนมัติ):</strong>
      <ul style="margin: 4px 0 0 16px; padding: 0;">
        ${skippedHolidays.map((h) => `
          <li>${formatThaiDateWithDayOfWeek(h.date)} : ${escapeHtml(h.name)}</li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  // Signature Block HTML
  const signatureBlock = options.includeSignature ? `
    <div class="signature-section">
      <div class="signature-col">
        <p class="sig-title">ผู้จัดทำรายงาน</p>
        <div class="sig-space"></div>
        <p class="sig-name">( ............................................................ )</p>
        <p class="sig-post">${options.signatory1Title || 'เจ้าหน้าที่กลุ่มการเมือง'}</p>
        <p class="sig-date">วันที่ ........ / ........ / ................</p>
      </div>

      <div class="signature-col">
        <p class="sig-title">ผู้ตรวจทาน</p>
        <div class="sig-space"></div>
        <p class="sig-name">( ............................................................ )</p>
        <p class="sig-post">${options.signatory2Title || 'หัวหน้ากลุ่มการเมือง'}</p>
        <p class="sig-date">วันที่ ........ / ........ / ................</p>
      </div>

      <div class="signature-col">
        <p class="sig-title">ผู้อนุมัติ / รับทราบ</p>
        <div class="sig-space"></div>
        <p class="sig-name">( ............................................................ )</p>
        <p class="sig-post">${options.signatory3Title || 'ผู้อำนวยการสำนักงานรัฐมนตรี'}</p>
        <p class="sig-date">วันที่ ........ / ........ / ................</p>
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 ${orientation};
      margin: ${isLandscape ? '10mm 12mm 10mm 12mm' : '12mm 15mm 12mm 15mm'};
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'TH Sarabun New', 'Sarabun', 'TH Sarabun PSK', sans-serif;
      font-size: ${tableFontSize}pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .report-container {
      width: 100%;
      max-width: ${isLandscape ? '1080px' : '860px'};
      margin: 0 auto;
    }

    /* Header */
    .report-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .emblem-placeholder {
      font-size: 15pt;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .report-main-title {
      font-size: 19pt;
      font-weight: 700;
      color: #0f172a;
      margin: 2px 0 3px 0;
      line-height: 1.3;
    }

    .report-sub-title {
      font-size: 15pt;
      font-weight: 500;
      color: #334155;
      margin: 0 0 3px 0;
    }

    .report-meta {
      font-size: 13pt;
      color: #475569;
      margin-top: 2px;
    }

    /* Summary Bar */
    .summary-box {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #64748b;
      border-radius: 4px;
      padding: 8px 14px;
      margin-bottom: 14px;
      font-size: 14pt;
    }

    .summary-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .summary-label {
      color: #334155;
    }

    .summary-val {
      font-weight: 700;
    }

    /* Notice Box */
    .notice-box {
      background: #fff8f8;
      border: 1px solid #fca5a5;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 13.5pt;
      color: #991b1b;
    }

    /* Week Card */
    .week-card {
      margin-bottom: 18px;
      page-break-inside: avoid;
      border: 1.5px solid #475569;
      border-radius: 4px;
      overflow: hidden;
    }

    .week-header {
      background: #f8fafc;
      border-bottom: 1.5px solid #475569;
      padding: 7px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .week-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 12pt;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      margin-right: 8px;
    }

    .week-date {
      font-size: 15.5pt;
      color: #0f172a;
      font-weight: 700;
    }

    .week-stat {
      font-size: 13.5pt;
      color: #334155;
      font-weight: 600;
    }

    /* Table */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${tableFontSize}pt;
    }

    .report-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      border: 1px solid #475569;
      padding: 8px 10px;
      text-align: left;
      font-size: ${tableFontSize}pt;
      vertical-align: middle;
    }

    .report-table td {
      border: 1px solid #64748b;
      padding: 7px 10px;
      vertical-align: top;
      color: #0f172a;
      font-size: ${tableFontSize}pt;
      line-height: 1.45;
    }

    .report-table strong {
      font-size: ${tableFontSize}pt;
    }

    .report-table tr:nth-child(even) {
      background: #fafbfc;
    }

    .text-primary {
      color: #0369a1;
    }

    .text-warning {
      color: #b45309;
    }

    .text-success {
      color: #15803d;
    }

    .font-bold {
      font-weight: 700;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: ${Math.max(12, tableFontSize - 2)}pt;
      font-weight: 600;
      line-height: 1.35;
    }

    .status-official {
      color: #1e3a8a;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }

    .status-projected {
      color: #334155;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
    }

    .status-postponed {
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
    }

    .status-answered {
      color: #166534;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .status-previous-postponed {
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
    }

    .status-pending {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: ${Math.max(12, tableFontSize - 2)}pt;
    }

    .status-scheduled {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: ${Math.max(12, tableFontSize - 2)}pt;
      font-weight: 600;
    }

    .status-completed {
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: ${Math.max(12, tableFontSize - 2)}pt;
      font-weight: 600;
    }

    .status-withdrawn {
      display: inline-block;
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: ${Math.max(12, tableFontSize - 2)}pt;
      font-weight: 600;
    }

    /* Signature Section */
    .signature-section {
      margin-top: 26px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      page-break-inside: avoid;
    }

    .signature-col {
      flex: 1;
      text-align: center;
      font-size: 14pt;
      color: #1e293b;
    }

    .sig-title {
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
      font-size: 14pt;
    }

    .sig-space {
      height: 44px;
    }

    .sig-name {
      margin: 0 0 2px 0;
      font-size: 14pt;
    }

    .sig-post {
      font-size: 13pt;
      color: #475569;
      margin: 0 0 2px 0;
    }

    .sig-date {
      font-size: 12.5pt;
      color: #64748b;
      margin: 0;
    }

    /* Print media specifics */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .week-card {
        page-break-inside: avoid;
      }

      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div class="emblem-placeholder">กลุ่มการเมือง สำนักงานรัฐมนตรี กระทรวงศึกษาธิการ</div>
      <h1 class="report-main-title">${escapeHtml(title)}</h1>
      <div class="report-sub-title">ระเบียบวาระกระทู้ถามตามข้อบังคับการประชุมวุฒิสภา (ทุกวันจันทร์)</div>
      <div class="report-meta">
        <span>หน่วยงาน: ${escapeHtml(department)}</span> &nbsp;|&nbsp; 
        <span>พิมพ์เมื่อ: ${currentDateTime}</span>
      </div>
    </div>

    <!-- Summary Box -->
    ${summaryBox}

    <!-- Holidays Box -->
    ${holidaysBox}

    <!-- Content Schedules or Table -->
    ${bodyContent}

    <!-- Signature Section -->
    ${signatureBlock}
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Execute real print action via a hidden iframe to ensure 100% clean paper output
 * bypassing host UI, scrollbars, sidebars, and dark themes.
 */
export function executePrintReport(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Remove any previously created print iframe
      const oldFrame = document.getElementById('parliamentary-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'parliamentary-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.warn('Could not access print iframe document, falling back to window.print()');
        window.print();
        resolve(true);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        window.print();
        resolve(true);
        return;
      }

      // Allow fonts and stylesheets to render
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          resolve(true);
        } catch (printErr) {
          console.error('Error invoking iframe.print():', printErr);
          window.print();
          resolve(false);
        } finally {
          // Remove iframe after sufficient time for the print dialog
          setTimeout(() => {
            try {
              iframe.remove();
            } catch (e) {
              // ignore
            }
          }, 3000);
        }
      }, 400);
    } catch (err) {
      console.error('Failed to initialize print iframe, falling back to window.print()', err);
      window.print();
      resolve(false);
    }
  });
}
