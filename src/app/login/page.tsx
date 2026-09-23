'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, ShieldCheck, User, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'super_admin' : 'faculty';

  const [role, setRole] = useState<'super_admin' | 'faculty'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      document.cookie = `obe_user_role=${role}; path=/; max-age=86400`;

      if (role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/faculty');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#e6f0fa] via-[#f0f7ff] to-[#e8f1fd] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Soft Wave Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Sky Glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-sky-200/50 rounded-full blur-3xl" />

        {/* Birds Flying in Distance */}
        <svg className="absolute top-24 left-[35%] w-32 h-16 opacity-40 text-sky-600" viewBox="0 0 100 50">
          <path d="M10 20 Q 20 10 30 20 Q 40 10 50 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M55 28 Q 62 20 70 28 Q 78 20 85 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M30 38 Q 35 32 40 38 Q 45 32 50 38" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>

        {/* Soft Bottom Landscape Waves */}
        <svg className="absolute bottom-0 left-0 right-0 w-full h-48 md:h-64 preserve-3d" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="rgba(191, 219, 254, 0.35)" d="M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,218.7C840,213,960,171,1080,165.3C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
          <path fill="rgba(219, 234, 254, 0.45)" d="M0,256L80,240C160,224,320,192,480,197.3C640,203,800,245,960,245.3C1120,245,1280,203,1360,181.3L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
        </svg>

        {/* Top Right Green Leaves Frame */}
        <svg className="absolute top-0 right-0 w-72 md:w-96 h-72 md:h-96 text-emerald-600/80 pointer-events-none drop-shadow-md z-10" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
          </defs>
          {/* Main Stem */}
          <path d="M 200,0 C 150,40 120,90 100,160" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M 180,15 C 160,10 140,25 145,45 C 165,40 175,25 180,15 Z" fill="url(#leafGrad1)" />
          <path d="M 165,35 C 145,35 130,55 140,75 C 155,65 165,50 165,35 Z" fill="url(#leafGrad2)" />
          <path d="M 145,70 C 125,65 110,85 120,105 C 135,95 145,80 145,70 Z" fill="url(#leafGrad1)" />
          <path d="M 125,105 C 105,105 95,125 105,145 C 120,135 125,120 125,105 Z" fill="url(#leafGrad2)" />
          <path d="M 195,40 C 175,50 170,70 185,80 C 195,65 195,50 195,40 Z" fill="url(#leafGrad2)" />
          <path d="M 175,75 C 155,85 150,105 165,115 C 175,100 175,85 175,75 Z" fill="url(#leafGrad1)" />
        </svg>

        {/* Bottom Right Foliage */}
        <svg className="absolute bottom-0 right-0 w-64 md:w-80 h-64 md:h-80 text-emerald-600 pointer-events-none drop-shadow-lg z-10" viewBox="0 0 200 200">
          <path d="M 200,200 L 120,200 C 130,160 150,130 200,100 Z" fill="url(#leafGrad1)" opacity="0.9" />
          <path d="M 200,200 L 150,200 C 155,170 175,145 200,135 Z" fill="url(#leafGrad2)" />
          <path d="M 200,200 L 100,200 C 115,175 135,150 180,140 Z" fill="url(#leafGrad1)" opacity="0.7" />
        </svg>

        {/* Bottom Left Green Bush / Leaves */}
        <svg className="absolute bottom-0 left-0 w-72 md:w-96 h-72 md:h-96 pointer-events-none z-10" viewBox="0 0 250 250">
          <path d="M 0,250 C 30,190 70,160 120,180 C 100,220 60,240 0,250 Z" fill="url(#leafGrad1)" />
          <path d="M 0,250 C 10,170 50,130 90,150 C 70,200 30,230 0,250 Z" fill="url(#leafGrad2)" />
          <path d="M 0,250 C 50,220 90,200 140,220 C 100,245 40,250 0,250 Z" fill="url(#leafGrad1)" opacity="0.85" />
        </svg>
      </div>

      {/* Main Container Grid */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-20 my-auto">
        
        {/* Left Side Branding & Hero Illustration (Visible on lg screens) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col justify-between h-full space-y-8 pr-4">
          
          {/* Header Typography */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              <span>Learn</span>
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span>Grow</span>
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span>Build Your Future</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black text-slate-900 leading-[1.15] tracking-tight">
              Education <br />
              <span className="text-blue-900">Creates Opportunities</span> <br />
              <span className="text-slate-700 font-bold">for a Brighter Tomorrow</span>
            </h1>

            <div className="w-12 h-1 bg-blue-600 rounded-full" />

            <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium max-w-sm">
              Your journey towards knowledge, success and a better future starts here.
            </p>
          </div>
        </div>

        {/* Center: Main Floating Login Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.1)] border border-slate-100 p-8 md:p-10 z-20 relative">
            
            {/* Header Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <GraduationCap className="w-8 h-8" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1 mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">OBE Management System</h2>
              <p className="text-xs text-slate-500 font-medium">Outcome Based Education Platform for Institutions</p>
            </div>

            {/* Role Switcher Pill Container */}
            <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80 mb-6">
              <button
                type="button"
                onClick={() => setRole('super_admin')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  role === 'super_admin'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('faculty')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  role === 'faculty'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Faculty Member</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Username Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  EMAIL ADDRESS / USERNAME
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder={role === 'super_admin' ? 'admin@institution.edu' : 'Enter your email or username'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 mt-2"
              >
                <span>{loading ? 'Authenticating...' : `SIGN IN AS ${role === 'super_admin' ? 'SUPER ADMIN' : 'FACULTY'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <span className="relative px-3 bg-white text-[11px] text-slate-400 font-medium">
                Or choose another role
              </span>
            </div>

            {/* Route helper text */}
            <div className="text-center text-[11px] text-slate-400">
              Super Admin Route: <span className="font-mono text-slate-600 font-bold">/admin</span> &nbsp;|&nbsp; Faculty Route:{' '}
              <span className="font-mono text-slate-600 font-bold">/faculty</span>
            </div>
          </div>
        </div>

        {/* Right Side Decorative Elements (Visible on lg screens) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col items-center justify-center space-y-12 pl-4 relative">
          
          {/* Handwritten Script Quote */}
          <div className="relative text-center transform -rotate-3">
            <p className="font-serif italic text-2xl text-blue-400/90 leading-tight font-semibold tracking-wide">
              Better <br />
              Learning <br />
              Better <br />
              Tomorrow
            </p>
            <svg className="w-36 h-4 text-blue-300/80 mx-auto mt-1" viewBox="0 0 100 15">
              <path d="M 5,10 Q 50,0 95,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">Loading OBE Portal...</div>}>
      <LoginContent />
    </Suspense>
  );
}

