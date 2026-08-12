import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface AccessGuardProps {
  children: React.ReactNode;
}

const PASSCODE = 'wenan';

export default function AccessGuard({ children }: AccessGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const sessionAuth = sessionStorage.getItem('advisor_access_granted');
      const localAuth = localStorage.getItem('advisor_access_granted');
      return sessionAuth === 'true' || localAuth === 'true';
    } catch (e) {
      return false;
    }
  });

  const [inputCode, setInputCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isShaking, setIsShaking] = useState(false);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const trimmed = inputCode.trim().toLowerCase();
    if (trimmed === PASSCODE.toLowerCase()) {
      try {
        if (rememberMe) {
          localStorage.setItem('advisor_access_granted', 'true');
        } else {
          sessionStorage.setItem('advisor_access_granted', 'true');
        }
      } catch (e) {}
      setIsAuthenticated(true);
    } else {
      setErrorMsg('访问口令错误，请重新输入');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`max-w-md w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-8 shadow-2xl relative z-10 text-white transition-transform ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950">
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-extrabold tracking-tight text-white mb-2">
            留学督办系统访问验证
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            受私有安全防护保护，请输入授权访问口令（Passcode）以解锁管理面板
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>访问口令 (Passcode)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="请输入授权访问口令"
                className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition pr-11 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 transition"
                title={showPassword ? '隐藏口令' : '显示口令'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1 animate-in fade-in">
                <span>⚠️ {errorMsg}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 accent-emerald-500"
              />
              <span>在此浏览器中记住授权</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer text-sm"
          >
            <span>验证并进入系统</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3 h-3" />
            <span>安全密码学算法保障 · 仅授权人员可访</span>
          </div>
        </div>
      </div>
    </div>
  );
}
