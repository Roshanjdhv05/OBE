'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AcademicYearSelector } from '@/components/common/AcademicYearSelector';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, AcademicYear, Programme, Semester, Subject, CourseOutcome } from '@/lib/store/obe-store';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  BookOpen,
  FolderPlus,
  BookMarked,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function ProgrammeManagementPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  // Tree Expansion state
  const [expandedProgs, setExpandedProgs] = useState<Record<string, boolean>>({});
  const [expandedSems, setExpandedSems] = useState<Record<string, boolean>>({});
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  // Modals state
  const [progModalOpen, setProgModalOpen] = useState(false);
  const [semModalOpen, setSemModalOpen] = useState<string | null>(null); // progId
  const [subModalOpen, setSubModalOpen] = useState<string | null>(null); // semId
  const [coModalOpen, setCoModalOpen] = useState<string | null>(null); // subId

  // Form Fields
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');

  const [semName, setSemName] = useState('');
  const [semNum, setSemNum] = useState(1);

  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');

  const [coCode, setCoCode] = useState('CO1');
  const [coDesc, setCoDesc] = useState('');

  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>({}); // progId -> Semester[]
  const [subjectsMap, setSubjectsMap] = useState<Record<string, Subject[]>>({}); // semId -> Subject[]
  const [cosMap, setCosMap] = useState<Record<string, CourseOutcome[]>>({}); // subId -> CourseOutcome[]
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);

  const reloadData = async (year?: AcademicYear | null) => {
    const targetYear = year !== undefined ? year : await OBEStore.getActiveAcademicYear();
    setActiveYear(targetYear);
    if (targetYear) {
      const [list, sems, subs, cos] = await Promise.all([
        OBEStore.getProgrammes(targetYear.id),
        OBEStore.getSemesters(),
        OBEStore.getSubjects(),
        OBEStore.getCourseOutcomes(),
      ]);

      setProgrammes(list);
      setAllSemesters(sems);

      const semGroup: Record<string, Semester[]> = {};
      sems.forEach((s) => {
        if (!semGroup[s.programmeId]) semGroup[s.programmeId] = [];
        semGroup[s.programmeId].push(s);
      });
      setSemestersMap(semGroup);

      const subGroup: Record<string, Subject[]> = {};
      subs.forEach((sb) => {
        if (!subGroup[sb.semesterId]) subGroup[sb.semesterId] = [];
        subGroup[sb.semesterId].push(sb);
      });
      setSubjectsMap(subGroup);

      const coGroup: Record<string, CourseOutcome[]> = {};
      cos.forEach((c) => {
        if (!coGroup[c.subjectId]) coGroup[c.subjectId] = [];
        coGroup[c.subjectId].push(c);
      });
      setCosMap(coGroup);
    } else {
      setProgrammes([]);
      setSemestersMap({});
      setSubjectsMap({});
      setCosMap({});
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handlers
  const handleAddProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !progName || !progCode) return;
    await OBEStore.addProgramme(activeYear.id, progName.trim(), progCode.trim().toUpperCase());
    setProgName('');
    setProgCode('');
    setProgModalOpen(false);
    await reloadData(activeYear);
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !semModalOpen || !semName) return;
    await OBEStore.addSemester(activeYear.id, semModalOpen, semName.trim(), Number(semNum));
    setSemName('');
    setSemNum(1);
    setSemModalOpen(null);
    await reloadData(activeYear);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !subModalOpen || !subName || !subCode) return;
    const sem = allSemesters.find((s) => s.id === subModalOpen);
    if (sem) {
      await OBEStore.addSubject(activeYear.id, sem.programmeId, sem.id, subName.trim(), subCode.trim().toUpperCase());
    }
    setSubName('');
    setSubCode('');
    setSubModalOpen(null);
    await reloadData(activeYear);
  };

  const handleAddCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coModalOpen || !coCode || !coDesc) return;
    await OBEStore.addCourseOutcome(coModalOpen, coCode.trim().toUpperCase(), coDesc.trim());
    setCoDesc('');
    setCoModalOpen(null);
    await reloadData(activeYear);
  };

  const prepareNextCOCode = (subjectId: string) => {
    const existing = cosMap[subjectId] || [];
    setCoCode(`CO${existing.length + 1}`);
    setCoModalOpen(subjectId);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Programme Management"
          subtitle="Configure Academic Year -> Programme -> Semester -> Subject -> Course Outcome (CO) hierarchy"
          role="super_admin"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Control: Academic Year Selector */}
          <AcademicYearSelector onYearChange={(y) => reloadData(y)} />

          {!activeYear ? (
            <EmptyState
              title="No Academic Year Selected"
              description="Please create or select an Academic Year above to start configuring programmes, subjects, and course outcomes."
            />
          ) : (
            <div className="space-y-4">
              {/* Header Action */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Programmes for Academic Year: {activeYear.yearName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Expand programmes to configure semesters, subjects, and course outcomes.
                  </p>
                </div>
                <button
                  onClick={() => setProgModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Programme</span>
                </button>
              </div>

              {/* Programme Hierarchy Tree */}
              {programmes.length === 0 ? (
                <EmptyState
                  title="No programmes created yet"
                  description={`No degree programmes have been created for Academic Year ${activeYear.yearName}.`}
                  actionLabel="Add Programme"
                  onAction={() => setProgModalOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {programmes.map((prog) => {
                    const isProgExpanded = !!expandedProgs[prog.id];
                    const semesters = semestersMap[prog.id] || [];

                    return (
                      <div key={prog.id} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        {/* Programme Bar */}
                        <div
                          onClick={() =>
                            setExpandedProgs({ ...expandedProgs, [prog.id]: !isProgExpanded })
                          }
                          className="p-4 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isProgExpanded ? <ChevronDown className="w-5 h-5 text-blue-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            <div>
                              <div className="text-sm font-bold tracking-tight">
                                [{prog.programmeCode}] {prog.programmeName}
                              </div>
                              <div className="text-xs text-slate-400">
                                {semesters.length} Semesters Configured
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSemModalOpen(prog.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Semester</span>
                          </button>
                        </div>

                        {/* Semesters Expandable Content */}
                        {isProgExpanded && (
                          <div className="p-4 bg-slate-50/50 border-t border-slate-200 space-y-3">
                            {semesters.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-400 font-medium">
                                No semesters added to this programme yet. Click "+ Add Semester" above.
                              </div>
                            ) : (
                              semesters.map((sem) => {
                                const isSemExpanded = !!expandedSems[sem.id];
                                const subjects = subjectsMap[sem.id] || [];

                                return (
                                  <div key={sem.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                                    {/* Semester Bar */}
                                    <div
                                      onClick={() =>
                                        setExpandedSems({ ...expandedSems, [sem.id]: !isSemExpanded })
                                      }
                                      className="p-3 bg-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-200/70 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        {isSemExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-slate-600" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                        <FolderPlus className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold text-slate-900">
                                          {sem.semesterName} (Semester {sem.semesterNumber})
                                        </span>
                                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
                                          {subjects.length} Subjects
                                        </span>
                                      </div>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSubModalOpen(sem.id);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Subject</span>
                                      </button>
                                    </div>

                                    {/* Subjects & COs Content */}
                                    {isSemExpanded && (
                                      <div className="p-3 space-y-2 bg-white border-t border-slate-200">
                                        {subjects.length === 0 ? (
                                          <div className="text-center py-3 text-[11px] text-slate-400 font-medium">
                                            No subjects added to this semester yet.
                                          </div>
                                        ) : (
                                          subjects.map((sub) => {
                                            const isSubExpanded = !!expandedSubs[sub.id];
                                            const cos = cosMap[sub.id] || [];

                                            return (
                                              <div
                                                key={sub.id}
                                                className="border border-slate-200 rounded-md overflow-hidden bg-slate-50/30"
                                              >
                                                {/* Subject Header */}
                                                <div
                                                  onClick={() =>
                                                    setExpandedSubs({
                                                      ...expandedSubs,
                                                      [sub.id]: !isSubExpanded,
                                                    })
                                                  }
                                                  className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {isSubExpanded ? (
                                                      <ChevronDown className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    )}
                                                    <BookMarked className="w-4 h-4 text-sky-600" />
                                                    <span className="text-xs font-bold text-slate-800">
                                                      [{sub.subjectCode}] {sub.subjectName}
                                                    </span>
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100">
                                                      {cos.length} COs
                                                    </span>
                                                  </div>

                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      prepareNextCOCode(sub.id);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded border border-blue-200 transition-colors"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                    <span>Add CO</span>
                                                  </button>
                                                </div>

                                                {/* CO List */}
                                                {isSubExpanded && (
                                                  <div className="p-3 bg-white border-t border-slate-200 space-y-2">
                                                    {cos.length === 0 ? (
                                                      <div className="text-center py-2 text-[11px] text-slate-400 font-medium">
                                                        No Course Outcomes (COs) configured yet. Click "+ Add CO".
                                                      </div>
                                                    ) : (
                                                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                                                        {cos.map((co) => (
                                                          <div
                                                            key={co.id}
                                                            className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50"
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                                                                {co.coCode}
                                                              </span>
                                                              <span className="text-slate-700 font-medium">
                                                                {co.description}
                                                              </span>
                                                            </div>

                                                            <button
                                                              onClick={async () => {
                                                                await OBEStore.deleteCourseOutcome(co.id);
                                                                await reloadData(activeYear);
                                                              }}
                                                              className="text-slate-400 hover:text-rose-600 p-1"
                                                            >
                                                              <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add Programme Modal */}
          {progModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add New Programme</h3>
                <form onSubmit={handleAddProgramme} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Programme Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bachelor of Commerce (B.Com)"
                      value={progName}
                      onChange={(e) => setProgName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Programme Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BCOM"
                      value={progCode}
                      onChange={(e) => setProgCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setProgModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save Programme
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Semester Modal */}
          {semModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add Semester</h3>
                <form onSubmit={handleAddSemester} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Semester 1"
                      value={semName}
                      onChange={(e) => setSemName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Number</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      required
                      value={semNum}
                      onChange={(e) => setSemNum(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSemModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save Semester
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Subject Modal */}
          {subModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add Subject</h3>
                <form onSubmit={handleAddSubject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Macro Economics"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ECO101"
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSubModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save Subject
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Course Outcome (CO) Modal */}
          {coModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add Course Outcome (CO)</h3>
                <form onSubmit={handleAddCO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CO Code</label>
                    <input
                      type="text"
                      required
                      value={coCode}
                      onChange={(e) => setCoCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Explain the fundamental concepts of macro economics."
                      value={coDesc}
                      onChange={(e) => setCoDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCoModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save Course Outcome
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
