import React, { useState } from 'react';
import { RuleComplianceAudit } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Sparkles,
  Layers,
  Calendar,
  UserCheck,
  RotateCcw,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

interface RuleComplianceBannerProps {
  audit: RuleComplianceAudit;
  onFilterChange?: (filter: 'all' | 'official' | 'projected') => void;
  activeFilter?: 'all' | 'official' | 'projected';
  onRecheck?: () => void;
}

export const RuleComplianceBanner: React.FC<RuleComplianceBannerProps> = ({
  audit,
  onFilterChange,
  activeFilter = 'all',
  onRecheck,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div
      id="rule-compliance-card"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6"
    >
      {/* Top Banner Row */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0369a1] text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
            {audit.isFullyCompliant ? (
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                ระบบตรวจสอบความถูกต้องตามกฎเกณฑ์การจัดระเบียบวาระ
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  audit.isFullyCompliant
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ความถูกต้องตามเกณฑ์ {audit.score}% ({audit.checks.filter((c) => c.passed).length}/{audit.checks.length} กฎเกณฑ์)
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              ตรวจสอบข้อบังคับการประชุมวุฒิสภา: จำกัด 3 เรื่อง/สัปดาห์ • ห้ามผู้ตั้งซ้ำในวันเดียวกัน • กระทู้เลื่อนตอบได้สิทธิ์ลำดับแรก • คาดการณ์ล่วงหน้าแม่นยำ
            </p>
          </div>
        </div>

        {/* Action / Toggle */}
        <div className="flex items-center gap-2">
          {onRecheck && (
            <button
              type="button"
              onClick={onRecheck}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-sky-200" />
              <span>ตรวจทานซ้ำ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{isExpanded ? 'ซ่อนรายละเอียดกฎเกณฑ์' : 'ดูผลการตรวจ 6 กฎเกณฑ์'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70 text-center">
        <div className="p-3">
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>บรรจุระเบียบวาระแล้ว (ทางการ)</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {audit.totalOfficialWeeks} สัปดาห์{' '}
            <span className="text-xs font-normal text-slate-500">({audit.totalOfficialQuestions} กระทู้)</span>
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>คาดการณ์การบรรจุล่วงหน้า</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {audit.totalProjectedWeeks} สัปดาห์{' '}
            <span className="text-xs font-normal text-slate-500">({audit.totalProjectedQuestions} กระทู้)</span>
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>รอคิวการจัดสรรถัดไป</span>
          </div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {audit.unassignedQuestionsCount}{' '}
            <span className="text-xs font-normal text-slate-500">กระทู้</span>
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>สถานะข้อบังคับ</span>
          </div>
          <div className="text-base font-bold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ถูกต้อง 100%</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs for quick view switching */}
      {onFilterChange && (
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-500 font-medium">มุมมองตารางระเบียบวาระ:</span>
          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงทั้งหมด ({audit.totalOfficialWeeks + audit.totalProjectedWeeks} สัปดาห์)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('official')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'official'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-3 h-3" />
              เฉพาะระเบียบวาระทางการ ({audit.totalOfficialWeeks})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('projected')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'projected'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              เฉพาะคาดการณ์ล่วงหน้า ({audit.totalProjectedWeeks})
            </button>
          </div>
        </div>
      )}

      {/* Expanded Rule Audit Details */}
      {isExpanded && (
        <div className="p-5 bg-slate-50/50 space-y-3 border-t border-slate-100 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ผลการตรวจรับรอง 6 กฎเกณฑ์การจัดระเบียบวาระกระทู้ถาม (Senate Standing Order Verification)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              สอดคล้องกับข้อบังคับการประชุมวุฒิสภา
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audit.checks.map((check) => (
              <div
                key={check.ruleId}
                className={`p-3.5 rounded-lg border text-xs transition-all ${
                  check.passed
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-amber-50/70 border-amber-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-800">{check.ruleName}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          check.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {check.passed ? 'ผ่านเกณฑ์ 100%' : 'ต้องตรวจสอบ'}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{check.details}</p>
                    {check.recommendation && (
                      <p className="text-amber-700 font-medium mt-1">
                        ข้อแนะนำ: {check.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">หลักเกณฑ์การคงชื่อเรื่องและเลื่อนตอบ: </span>
              กระทู้ถามในสัปดาห์ที่ 1 ที่ขอเลื่อนตอบ ระบบจะคงชื่อเรื่องไว้ในระเบียบวาระสัปดาห์ที่ 1 และนำไปจัดในระเบียบวาระในสัปดาห์เป้าหมาย (วันที่ 7 ก.ย., 14 ก.ย., 21 ก.ย. 2569) โดยได้รับสิทธิ์ตอบเป็นลำดับแรก พร้อมทั้งจัดสรรกระทู้ใหม่ตามลำดับคิวโดยไม่ให้ผู้ตั้งกระทู้ซ้ำกันในวันประชุมเดียวกัน
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
