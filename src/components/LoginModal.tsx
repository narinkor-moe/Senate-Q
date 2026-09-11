import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Info,
  KeyRound,
  LogIn
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  pendingMessage?: string | null;
  initialTab?: 'user' | 'admin';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
  pendingMessage,
  initialTab = 'user',
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>(initialTab);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(pendingMessage ? 'admin' : (initialTab || 'user'));
      setAdminPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, pendingMessage, initialTab]);

  if (!isOpen) return null;

  const handleGeneralUserLogin = () => {
    setErrorMessage(null);
    setSuccessMessage('เข้าสู่ระบบในฐานะ ผู้ใช้งานทั่วไป เรียบร้อย');
    setTimeout(() => {
      onSelectRole('user');
      onClose();
    }, 400);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Hardcoded password verification required: admin1234
    if (adminPassword.trim() === 'admin1234') {
      setSuccessMessage('ยืนยันรหัสผ่านถูกต้อง ยินดีต้อนรับ ผู้ดูแลระบบ (Admin)');
      setTimeout(() => {
        onSelectRole('admin');
        onClose();
      }, 500);
    } else {
      setErrorMessage('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (รหัสผ่านคือ admin1234)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#1e293b] text-white p-5 border-b-2 border-[#0369a1] relative">
          {currentRole && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0369a1] text-white flex items-center justify-center font-bold text-sm shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-snug">
                ลงชื่อเข้าใช้งานระบบ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ระบบบริหารจัดการวาระกระทู้ถามวุฒิสภา
              </p>
            </div>
          </div>
        </div>

        {/* Pending Action Alert (if opened due to restricted action) */}
        {pendingMessage && (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 block">
                จำเป็นต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin)
              </span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                {pendingMessage}
              </p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('user');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'user'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>1. ผู้ใช้งานทั่วไป</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white text-[#0369a1] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#0369a1]" />
            <span>2. Admin (ผู้ดูแลระบบ)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'user' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-600" />
                    สิทธิ์การใช้งานสำหรับผู้ใช้งานทั่วไป
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ไม่ต้องใช้รหัสผ่าน
                  </span>
                </div>

                <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ดูข้อมูลระเบียบวาระกระทู้ถามได้ครบทุกสัปดาห์</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ค้นหากระทู้ถาม และดูสถิติผู้ตั้งถาม</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>สั่งพิมพ์รายงานราชการ (A4 สารบรรณ)</span>
                  </li>
                  <li className="flex items-start gap-2 text-rose-700 font-medium">
                    <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>ไม่สามารถใช้งานปุ่มเลื่อนตอบที่บันทึกข้อมูลไปยัง Google Sheet ได้</span>
                  </li>
                </ul>
              </div>

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="button"
                id="btn-login-as-general-user"
                onClick={handleGeneralUserLogin}
                className="w-full py-3 px-4 rounded-xl bg-[#0369a1] hover:bg-[#075985] active:scale-[0.99] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบในฐานะ ผู้ใช้งานทั่วไป (ไม่ต้องใส่รหัสผ่าน)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-sky-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-900">
                  <Sparkles className="w-4 h-4 text-[#0369a1]" />
                  <span>สิทธิ์การใช้งานระดับผู้ดูแลระบบ (Admin)</span>
                </div>
                <p className="text-sky-800 text-[11px] leading-relaxed">
                  สามารถใช้งานได้ทุกฟังก์ชัน รวมถึงการกำหนดวันขอเลื่อนตอบ และบันทึกข้อมูลซิงค์ตรงไปยัง Google Sheet
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0369a1]" />
                    รหัสผ่านเข้าระบบ Admin *
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (admin1234)
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="ใส่รหัสผ่าน admin1234"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/20 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-submit-admin-login"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ยืนยันรหัสผ่านและเข้าสู่ระบบ Admin</span>
              </button>
            </form>
          )}

          {/* Quick Notice */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              <span>คุณสามารถสลับโหมดการใช้งานได้ตลอดเวลาที่แถบด้านบนของระบบ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
