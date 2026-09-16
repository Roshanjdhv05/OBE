'use client';

import React, { useEffect, useState } from 'react';
import { OBEStore, AcademicYear } from '@/lib/store/obe-store';
import { ShieldCheck, UserCheck, Bell } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  role: 'super_admin' | 'faculty';
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, role }) => {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      setActiveYear(year);
    };
    load();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Active Academic Year Badge */}
        {activeYear ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Academic Year: {activeYear.yearName}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
            <span>No Active Year Selected</span>
          </div>
        )}

        {/* Role Indicator */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className={`p-1.5 rounded-full ${role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {role === 'super_admin' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-900">{role === 'super_admin' ? 'Administrator' : 'Faculty Member'}</div>
            <div className="text-slate-400 font-medium">{role === 'super_admin' ? 'Super Admin' : 'Academic Access'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
