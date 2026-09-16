'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, AcademicYear, Programme, Semester, Subject } from '@/lib/store/obe-store';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
} from 'lucide-react';

interface SubjectWithMeta {
  subject: Subject;
  semester: Semester;
  programme: Programme;
  ciaCount: number;
  eseCount: number;
  surveyCount: number;
}

export default function FacultyProgrammesPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [subjectMetaList, setSubjectMetaList] = useState<SubjectWithMeta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const year = await OBEStore.getActiveAcademicYear();
        setActiveYear(year);

        if (year) {
          const progs = await OBEStore.getProgrammes(year.id);
          setProgrammes(progs);

          const sems = await OBEStore.getSemesters();
          const subs = await OBEStore.getSubjects();
          const assessments = await OBEStore.getAssessments();

          const metaList: SubjectWithMeta[] = [];

          progs.forEach((prog) => {
            const progSems = sems.filter((s) => s.programmeId === prog.id);
            progSems.forEach((sem) => {
              const semSubs = subs.filter((sb) => sb.semesterId === sem.id);
              semSubs.forEach((sub) => {
                const subAssessments = assessments.filter((a) => a.subjectId === sub.id);
                const ciaCount = subAssessments.filter((a) => a.assessmentType === 'CIA').length;
                const eseCount = subAssessments.filter((a) => a.assessmentType === 'ESE').length;
                const surveyCount = subAssessments.filter((a) => a.assessmentType === 'COURSE_EXIT_SURVEY').length;

                metaList.push({
                  subject: sub,
                  semester: sem,
                  programme: prog,
                  ciaCount,
                  eseCount,
                  surveyCount,
                });
              });
            });
          });

          setSubjectMetaList(metaList);
        }
      } catch (err) {
        console.error('Failed to load programmes data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter subject boxes by search term
  const filteredList = subjectMetaList.filter((item) => {
    const query = searchTerm.toLowerCase();
    return (
      item.subject.subjectName.toLowerCase().includes(query) ||
      item.subject.subjectCode.toLowerCase().includes(query) ||
      item.programme.programmeName.toLowerCase().includes(query) ||
      item.programme.programmeCode.toLowerCase().includes(query) ||
      item.semester.semesterName.toLowerCase().includes(query)
    );
  });

  // Group filtered list by Programme ID
  const groupedByProgramme = programmes.map((prog) => {
    const items = filteredList.filter((item) => item.programme.id === prog.id);
    return {
      programme: prog,
      items,
    };
  }).filter((group) => group.items.length > 0 || !searchTerm);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Assigned Programmes & Subjects"
          subtitle="Select a subject box to manage target levels, uploads, and outcome attainment analysis"
          role="faculty"
        />

        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Search and Header Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Programmes & Subject Allocations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeYear ? `Active Academic Year: ${activeYear.yearName}` : 'No active academic year'}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search subject or programme..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4" />
              <p className="text-sm font-medium">Loading programmes and subject boxes...</p>
            </div>
          ) : groupedByProgramme.length === 0 ? (
            <EmptyState
              title="No Programmes or Subjects Found"
              description="No subjects are configured or match your search query."
              icon={BookOpen}
            />
          ) : (
            <div className="space-y-10">
              {groupedByProgramme.map((group) => {
                const { programme, items } = group;
                if (items.length === 0) return null;

                return (
                  <section key={programme.id} className="space-y-4">
                    {/* Programme Section Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-blue-900 text-white font-black text-xs rounded-lg uppercase tracking-wider shadow-xs">
                          {programme.programmeCode}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{programme.programmeName}</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {items.length} Subject{items.length > 1 ? 's' : ''} available
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subject Boxes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map(({ subject, semester, programme: prog, ciaCount, eseCount, surveyCount }) => (
                        <Link
                          key={subject.id}
                          href={`/faculty/programmes/subject?id=${subject.id}`}
                          className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-500 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md uppercase tracking-wider">
                                {semester.semesterName}
                              </span>
                              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                {subject.subjectCode}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                                {prog.programmeCode} {semester.semesterName}: {subject.subjectName}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium mt-1">
                                Subject Code: <span className="font-mono text-slate-700">{subject.subjectCode}</span>
                              </p>
                            </div>
                          </div>

                          {/* Upload Status Indicators */}
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Assessment Modules Status
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div
                                className={`px-2 py-1.5 rounded-lg border text-center text-[10px] font-bold flex flex-col items-center gap-1 ${
                                  ciaCount > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {ciaCount > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                                <span>CIA ({ciaCount})</span>
                              </div>

                              <div
                                className={`px-2 py-1.5 rounded-lg border text-center text-[10px] font-bold flex flex-col items-center gap-1 ${
                                  eseCount > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {eseCount > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                                <span>ESE ({eseCount})</span>
                              </div>

                              <div
                                className={`px-2 py-1.5 rounded-lg border text-center text-[10px] font-bold flex flex-col items-center gap-1 ${
                                  surveyCount > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {surveyCount > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                                <span>Exit Survey</span>
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                              <span>Open Subject Dashboard</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
