'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OBEStore } from '@/lib/store/obe-store';
import {
  Calendar,
  BookOpen,
  BookMarked,
  Users,
  FileCheck,
  GraduationCap,
  Sparkles,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    activeYears: 0,
    programmes: 0,
    subjects: 0,
    facultyUsers: 0,
    assessments: 0,
    students: 0,
    cos: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [years, progs, subs, users, assessments, students, cos, logs] = await Promise.all([
        OBEStore.getAcademicYears(),
        OBEStore.getProgrammes(),
        OBEStore.getSubjects(),
        OBEStore.getUsers(),
        OBEStore.getAssessments(),
        OBEStore.getStudents(),
        OBEStore.getCourseOutcomes(),
        OBEStore.getAuditLogs(),
      ]);
      setStats({
        activeYears: years.length,
        programmes: progs.length,
        subjects: subs.length,
        facultyUsers: users.filter((u) => u.role === 'faculty').length,
        assessments: assessments.length,
        students: students.length,
        cos: cos.length,
      });
      setRecentLogs(logs.slice(0, 5));
    };
    load();
  }, []);

  const metricCards = [
    { label: 'Active Academic Years', count: stats.activeYears, icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Programmes Configured', count: stats.programmes, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Total Subjects', count: stats.subjects, icon: BookMarked, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { label: 'Faculty Accounts', count: stats.facultyUsers, icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Enrolled Students', count: stats.students, icon: GraduationCap, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'Uploaded Assessments', count: stats.assessments, icon: FileCheck, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Course Outcomes (COs)', count: stats.cos, icon: Sparkles, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Super Admin Overview" subtitle="System-wide metrics & institutional configuration overview" role="super_admin" />

        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Outcome Based Education Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure academic years, programmes, faculty access, and view institutional attainment reports.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/programmes" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
                + Manage Programmes
              </Link>
              <Link href="/admin/users" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors">
                + Faculty Accounts
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{card.count}</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${card.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Recent System Activity</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Supabase Audit Log</span>
            </div>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">No activity yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400 ml-2">({log.module})</span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
