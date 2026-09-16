'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AcademicYearSelector } from '@/components/common/AcademicYearSelector';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, AcademicYear, Programme, Semester, Subject, Assessment } from '@/lib/store/obe-store';
import {
  FileCheck,
  Upload,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  BarChart3,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyOverviewPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      setActiveYear(year);

      if (year) {
        const progs = await OBEStore.getProgrammes(year.id);
        setProgrammes(progs);

        const allSubs: Subject[] = [];
        const sems = await OBEStore.getSemesters();
        const subs = await OBEStore.getSubjects();

        progs.forEach((p) => {
          const progSems = sems.filter((s) => s.programmeId === p.id);
          progSems.forEach((s) => {
            const semSubs = subs.filter((sb) => sb.semesterId === s.id);
            allSubs.push(...semSubs);
          });
        });
        setSubjects(allSubs);

        const stds = await OBEStore.getStudents();
        setStudents(stds);

        const ass = await OBEStore.getAssessments();
        setAssessments(ass);
      }
    };
    load();
  }, []);

  const ciaCount = assessments.filter((a) => a.assessmentType === 'CIA').length;
  const eseCount = assessments.filter((a) => a.assessmentType === 'ESE').length;
  const surveyCount = assessments.filter((a) => a.assessmentType === 'COURSE_EXIT_SURVEY').length;

  const statusItems = [
    {
      label: 'CIA Assessments Uploaded',
      count: ciaCount,
      href: '/faculty/cia',
      ok: ciaCount > 0,
      description: ciaCount > 0 ? `${ciaCount} file(s) processed` : 'No CIA files uploaded yet',
    },
    {
      label: 'ESE Assessments Uploaded',
      count: eseCount,
      href: '/faculty/ese',
      ok: eseCount > 0,
      description: eseCount > 0 ? `${eseCount} file(s) processed` : 'No ESE files uploaded yet',
    },
    {
      label: 'Course Exit Survey Uploaded',
      count: surveyCount,
      href: '/faculty/course-exit-survey',
      ok: surveyCount > 0,
      description: surveyCount > 0 ? `${surveyCount} file(s) processed` : 'No exit survey uploaded yet',
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Faculty Workspace"
          subtitle="Upload assessments, view CO attainment calculations and generate outcome reports"
          role="faculty"
        />

        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Outcome Based Education Portal</h2>
              <p className="text-xs text-blue-200 mt-1">
                Upload CIA, ESE, and Course Exit Survey Excel files to automatically calculate CO attainment levels.
              </p>
              {activeYear && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-700/40 px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-blue-600/40">
                  Active Year: {activeYear.yearName}
                </div>
              )}
            </div>
            <Link
              href="/faculty/cia"
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Upload CIA Assessment →
            </Link>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Programmes Available', value: programmes.length, icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-100' },
              { label: 'Subjects Configured', value: subjects.length, icon: BarChart3, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
              { label: 'Students Enrolled', value: students.length, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'Total Assessments', value: assessments.length, icon: FileCheck, color: 'text-amber-600 bg-amber-50 border-amber-100' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{stat.value}</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assessment Upload Status Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Assessment Upload Status
            </h3>

            <div className="space-y-3">
              {statusItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.ok ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.label}</div>
                      <div className={`text-[11px] font-medium mt-0.5 ${item.ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    item.ok
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  } group-hover:border-blue-300 transition-colors`}>
                    {item.ok ? 'Uploaded ✓' : 'Upload Now →'}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Programmes & Subjects', href: '/faculty/programmes', desc: 'Browse available programmes and subject boxes to manage target levels and modules.', color: 'border-blue-300 hover:border-blue-500 bg-blue-50/20' },
              { label: 'CO Attainment Analysis', href: '/faculty/co-attainment', desc: 'View CO-wise analysis including attainment % and level evaluations.', color: 'border-blue-200 hover:border-blue-400' },
              { label: 'Direct Attainment', href: '/faculty/direct-attainment', desc: 'View combined CIA + ESE Direct Attainment calculations for each CO.', color: 'border-indigo-200 hover:border-indigo-400' },
              { label: 'Final Attainment', href: '/faculty/final-attainment', desc: 'View Final CO Attainment (Direct + Indirect weighted combination) and interpretations.', color: 'border-purple-200 hover:border-purple-400' },
            ].map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={`bg-white p-5 rounded-xl border ${nav.color} shadow-xs hover:shadow-sm transition-all group space-y-2`}
              >
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{nav.label}</div>
                <p className="text-xs text-slate-500 font-medium">{nav.desc}</p>
                <div className="text-[11px] text-blue-600 font-bold group-hover:translate-x-1 transition-transform inline-block">
                  View →
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
