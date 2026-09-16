'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileSpreadsheet,
  Award,
  LogOut,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  role: 'super_admin' | 'faculty';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const pathname = usePathname();

  const adminNav = [
    { label: 'Overview Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Programme Management', href: '/admin/programmes', icon: BookOpen },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'PSO Management', href: '/admin/pso', icon: Award },
  ];

  const facultyNav = [
    { label: 'Overview', href: '/faculty', icon: LayoutDashboard },
    { label: 'Programmes & Subjects', href: '/faculty/programmes', icon: BookOpen },
  ];

  const navItems = role === 'super_admin' ? adminNav : facultyNav;

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Branding Header */}
      <div className="h-16 flex items-center gap-3 px-6 bg-slate-950 border-b border-slate-800">
        <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-slate-100">OBE System</h1>
          <p className="text-xs text-slate-400 font-medium">
            {role === 'super_admin' ? 'Super Admin Portal' : 'Faculty Workspace'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/faculty' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Role Switcher / Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Role: <span className="text-slate-200 font-semibold uppercase">{role.replace('_', ' ')}</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
