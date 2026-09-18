'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AcademicYearSelector } from '@/components/common/AcademicYearSelector';
import { EmptyState } from '@/components/common/EmptyState';
import {
  OBEStore,
  AcademicYear,
  Programme,
  Semester,
  Subject,
  CourseOutcome,
} from '@/lib/store/obe-store';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  BookOpen,
  FolderPlus,
  BookMarked,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  GraduationCap,
  Calendar,
  Layers,
  Target,
  Search,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react';

export default function ProgrammeManagementPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  // View Mode: 'boxes' (4-Column Layout as shown in design image) or 'tree' (Hierarchical List)
  const [viewMode, setViewMode] = useState<'boxes' | 'tree'>('boxes');

  // Box View Selection States
  const [selectedProgId, setSelectedProgId] = useState<string | null>(null);
  const [selectedSemId, setSelectedSemId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Search Filters per Column
  const [searchProg, setSearchProg] = useState('');
  const [searchSem, setSearchSem] = useState('');
  const [searchSub, setSearchSub] = useState('');
  const [searchCO, setSearchCO] = useState('');

  // Tree Expansion state (for 'tree' view)
  const [expandedProgs, setExpandedProgs] = useState<Record<string, boolean>>({});
  const [expandedSems, setExpandedSems] = useState<Record<string, boolean>>({});
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  // Add / Edit Modals State
  const [progModalOpen, setProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<Programme | null>(null);

  const [semModalOpen, setSemModalOpen] = useState<string | null>(null); // progId
  const [editingSem, setEditingSem] = useState<Semester | null>(null);

  const [subModalOpen, setSubModalOpen] = useState<string | null>(null); // semId
  const [editingSub, setEditingSub] = useState<Subject | null>(null);

  const [coModalOpen, setCoModalOpen] = useState<string | null>(null); // subId
  const [editingCO, setEditingCO] = useState<CourseOutcome | null>(null);

  // Form Fields
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');

  const [semName, setSemName] = useState('');
  const [semNum, setSemNum] = useState(1);

  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');

  const [coCode, setCoCode] = useState('CO1');
  const [coDesc, setCoDesc] = useState('');

  // Data Maps
  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, Subject[]>>({});
  const [cosMap, setCosMap] = useState<Record<string, CourseOutcome[]>>({});
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

      // Auto-select first programme if none selected in box view
      if (list.length > 0) {
        setSelectedProgId((prev) => {
          const currentValid = list.some((p) => p.id === prev);
          const nextProgId = currentValid ? prev : list[0].id;
          
          const progSems = semGroup[nextProgId || ''] || [];
          if (progSems.length > 0) {
            setSelectedSemId((prevSem) => {
              const semValid = progSems.some((s) => s.id === prevSem);
              const nextSemId = semValid ? prevSem : progSems[0].id;

              const semSubs = subGroup[nextSemId || ''] || [];
              if (semSubs.length > 0) {
                setSelectedSubId((prevSub) => (semSubs.some((sb) => sb.id === prevSub) ? prevSub : semSubs[0].id));
              } else {
                setSelectedSubId(null);
              }
              return nextSemId;
            });
          } else {
            setSelectedSemId(null);
            setSelectedSubId(null);
          }
          return nextProgId;
        });
      }
    } else {
      setProgrammes([]);
      setSemestersMap({});
      setSubjectsMap({});
      setCosMap({});
      setSelectedProgId(null);
      setSelectedSemId(null);
      setSelectedSubId(null);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handlers for Add & Edit
  const handleSaveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !progName || !progCode) return;
    if (editingProg) {
      await OBEStore.updateProgramme(editingProg.id, progName.trim(), progCode.trim().toUpperCase());
    } else {
      await OBEStore.addProgramme(activeYear.id, progName.trim(), progCode.trim().toUpperCase());
    }
    setProgName('');
    setProgCode('');
    setProgModalOpen(false);
    setEditingProg(null);
    await reloadData(activeYear);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !semName) return;
    if (editingSem) {
      await OBEStore.updateSemester(editingSem.id, semName.trim(), Number(semNum));
    } else if (semModalOpen) {
      await OBEStore.addSemester(activeYear.id, semModalOpen, semName.trim(), Number(semNum));
    }
    setSemName('');
    setSemNum(1);
    setSemModalOpen(null);
    setEditingSem(null);
    await reloadData(activeYear);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !subName || !subCode) return;
    if (editingSub) {
      await OBEStore.updateSubject(editingSub.id, subName.trim(), subCode.trim().toUpperCase());
    } else if (subModalOpen) {
      const sem = allSemesters.find((s) => s.id === subModalOpen);
      if (sem) {
        await OBEStore.addSubject(activeYear.id, sem.programmeId, sem.id, subName.trim(), subCode.trim().toUpperCase());
      }
    }
    setSubName('');
    setSubCode('');
    setSubModalOpen(null);
    setEditingSub(null);
    await reloadData(activeYear);
  };

  const handleSaveCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coCode || !coDesc) return;
    if (editingCO) {
      await OBEStore.updateCourseOutcome(editingCO.id, coCode.trim().toUpperCase(), coDesc.trim());
    } else if (coModalOpen) {
      await OBEStore.addCourseOutcome(coModalOpen, coCode.trim().toUpperCase(), coDesc.trim());
    }
    setCoDesc('');
    setCoModalOpen(null);
    setEditingCO(null);
    await reloadData(activeYear);
  };

  const prepareNextCOCode = (subjectId: string) => {
    const existing = cosMap[subjectId] || [];
    setCoCode(`CO${existing.length + 1}`);
    setCoDesc('');
    setEditingCO(null);
    setCoModalOpen(subjectId);
  };

  // Selected Objects for Column View
  const selectedProg = useMemo(
    () => programmes.find((p) => p.id === selectedProgId) || null,
    [programmes, selectedProgId]
  );

  const currentSemesters = useMemo(
    () => (selectedProgId ? semestersMap[selectedProgId] || [] : []),
    [semestersMap, selectedProgId]
  );

  const selectedSem = useMemo(
    () => currentSemesters.find((s) => s.id === selectedSemId) || null,
    [currentSemesters, selectedSemId]
  );

  const currentSubjects = useMemo(
    () => (selectedSemId ? subjectsMap[selectedSemId] || [] : []),
    [subjectsMap, selectedSemId]
  );

  const selectedSub = useMemo(
    () => currentSubjects.find((s) => s.id === selectedSubId) || null,
    [currentSubjects, selectedSubId]
  );

  const currentCOs = useMemo(
    () => (selectedSubId ? cosMap[selectedSubId] || [] : []),
    [cosMap, selectedSubId]
  );

  // Filtered lists for Columns
  const filteredProgrammes = useMemo(() => {
    if (!searchProg.trim()) return programmes;
    const q = searchProg.toLowerCase();
    return programmes.filter(
      (p) => p.programmeName.toLowerCase().includes(q) || p.programmeCode.toLowerCase().includes(q)
    );
  }, [programmes, searchProg]);

  const filteredSemesters = useMemo(() => {
    if (!searchSem.trim()) return currentSemesters;
    const q = searchSem.toLowerCase();
    return currentSemesters.filter((s) => s.semesterName.toLowerCase().includes(q));
  }, [currentSemesters, searchSem]);

  const filteredSubjects = useMemo(() => {
    if (!searchSub.trim()) return currentSubjects;
    const q = searchSub.toLowerCase();
    return currentSubjects.filter(
      (s) => s.subjectName.toLowerCase().includes(q) || s.subjectCode.toLowerCase().includes(q)
    );
  }, [currentSubjects, searchSub]);

  const filteredCOs = useMemo(() => {
    if (!searchCO.trim()) return currentCOs;
    const q = searchCO.toLowerCase();
    return currentCOs.filter(
      (c) => c.coCode.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [currentCOs, searchCO]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Programme Management"
          subtitle="Configure Academic Year -> Programme -> Semester -> Subject -> Course Outcome (CO) hierarchy"
          role="super_admin"
        />

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Control Bar: Academic Year Selector + View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex-1 min-w-[280px]">
              <AcademicYearSelector onYearChange={(y) => reloadData(y)} />
            </div>

            {/* View Mode Switcher Toggle Icon (Identical to User Image 1) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                View Layout:
              </span>
              <div className="bg-slate-100 border border-slate-200 p-1 rounded-2xl flex items-center gap-1 shadow-2xs">
                {/* Box Grid Layout Button */}
                <button
                  type="button"
                  onClick={() => setViewMode('boxes')}
                  title="4-Column Box View"
                  className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    viewMode === 'boxes'
                      ? 'bg-[#0B192C] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>

                {/* Tree List Layout Button */}
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  title="Hierarchical Tree View"
                  className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    viewMode === 'tree'
                      ? 'bg-[#0B192C] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {!activeYear ? (
            <EmptyState
              title="No Academic Year Selected"
              description="Please create or select an Academic Year above to start configuring programmes, subjects, and course outcomes."
            />
          ) : (
            <div className="space-y-6">
              {/* ========================================================================= */}
              {/* DESIGN 1: 4-COLUMN BOX LAYOUT (Image 2 style) */}
              {/* ========================================================================= */}
              {viewMode === 'boxes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                  {/* COLUMN 1: PROGRAMME */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 min-h-[580px] flex flex-col">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Programme</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Select a programme to manage its semesters, subjects and course outcomes (CO).
                      </p>
                    </div>

                    {/* Search & Add */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search Programme..."
                          value={searchProg}
                          onChange={(e) => setSearchProg(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditingProg(null);
                          setProgName('');
                          setProgCode('');
                          setProgModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Programme</span>
                      </button>
                    </div>

                    {/* Programme List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                      {filteredProgrammes.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-medium">
                          No programmes found.
                        </div>
                      ) : (
                        filteredProgrammes.map((prog) => {
                          const isSelected = selectedProgId === prog.id;
                          const semCount = (semestersMap[prog.id] || []).length;

                          return (
                            <div
                              key={prog.id}
                              onClick={() => {
                                setSelectedProgId(prog.id);
                                const sems = semestersMap[prog.id] || [];
                                if (sems.length > 0) {
                                  setSelectedSemId(sems[0].id);
                                  const subs = subjectsMap[sems[0].id] || [];
                                  setSelectedSubId(subs.length > 0 ? subs[0].id : null);
                                } else {
                                  setSelectedSemId(null);
                                  setSelectedSubId(null);
                                }
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-blue-50/60 border-blue-500 shadow-2xs text-blue-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-blue-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <BookOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-blue-500'}`} />
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">[{prog.programmeCode}] {prog.programmeName}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                                  {semCount} Sem{semCount !== 1 ? 's' : ''}
                                </span>
                                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <div className="hidden group-hover:flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      setEditingProg(prog);
                                      setProgName(prog.programmeName);
                                      setProgCode(prog.programmeCode);
                                      setProgModalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="Edit Programme"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Delete programme [${prog.programmeCode}] ${prog.programmeName}?`)) {
                                        await OBEStore.deleteProgramme(prog.id);
                                        await reloadData(activeYear);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete Programme"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2: SEMESTER */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 min-h-[580px] flex flex-col">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Semester</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Manage semesters for the selected programme.
                      </p>
                    </div>

                    {/* Breadcrumb Chip */}
                    {selectedProg && (
                      <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 p-2 rounded-xl text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 truncate">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">[{selectedProg.programmeCode}] {selectedProg.programmeName}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProgId(null);
                            setSelectedSemId(null);
                            setSelectedSubId(null);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-0.5 shrink-0 ml-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    )}

                    {/* Search & Add */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search Semester..."
                          disabled={!selectedProgId}
                          value={searchSem}
                          onChange={(e) => setSearchSem(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50"
                        />
                      </div>
                      <button
                        disabled={!selectedProgId}
                        onClick={() => {
                          if (!selectedProgId) return;
                          setEditingSem(null);
                          setSemName('');
                          setSemNum((currentSemesters.length || 0) + 1);
                          setSemModalOpen(selectedProgId);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Semester</span>
                      </button>
                    </div>

                    {/* Semester List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                      {!selectedProgId ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            1
                          </div>
                          <div>Select a programme from Column 1 to view semesters.</div>
                        </div>
                      ) : filteredSemesters.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-medium">
                          No semesters added to this programme yet.
                        </div>
                      ) : (
                        filteredSemesters.map((sem) => {
                          const isSelected = selectedSemId === sem.id;
                          const subCount = (subjectsMap[sem.id] || []).length;

                          return (
                            <div
                              key={sem.id}
                              onClick={() => {
                                setSelectedSemId(sem.id);
                                const subs = subjectsMap[sem.id] || [];
                                setSelectedSubId(subs.length > 0 ? subs[0].id : null);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-purple-50/60 border-purple-500 shadow-2xs text-purple-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-purple-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {sem.semesterNumber}
                                </span>
                                <span className="text-xs font-bold truncate">{sem.semesterName}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                  {subCount} Sub{subCount !== 1 ? 's' : ''}
                                </span>
                                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <div className="hidden group-hover:flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      setEditingSem(sem);
                                      setSemName(sem.semesterName);
                                      setSemNum(sem.semesterNumber);
                                      setSemModalOpen(sem.programmeId);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="Edit Semester"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Delete ${sem.semesterName}?`)) {
                                        await OBEStore.deleteSemester(sem.id);
                                        await reloadData(activeYear);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete Semester"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* COLUMN 3: SUBJECT */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 min-h-[580px] flex flex-col">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Subject</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Manage subjects for the selected semester.
                      </p>
                    </div>

                    {/* Breadcrumb Chips */}
                    {selectedSem && (
                      <div className="flex items-center justify-between bg-purple-50/60 border border-purple-200 p-2 rounded-xl text-xs">
                        <div className="flex items-center gap-1 font-bold text-purple-900 truncate">
                          <span className="truncate">{selectedSem.semesterName}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSemId(null);
                            setSelectedSubId(null);
                          }}
                          className="text-purple-600 hover:text-purple-800 text-[10px] font-bold flex items-center gap-0.5 shrink-0 ml-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    )}

                    {/* Search & Add */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search Subject..."
                          disabled={!selectedSemId}
                          value={searchSub}
                          onChange={(e) => setSearchSub(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50"
                        />
                      </div>
                      <button
                        disabled={!selectedSemId}
                        onClick={() => {
                          if (!selectedSemId) return;
                          setEditingSub(null);
                          setSubName('');
                          setSubCode('');
                          setSubModalOpen(selectedSemId);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subject</span>
                      </button>
                    </div>

                    {/* Subject List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                      {!selectedSemId ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            2
                          </div>
                          <div>Select a semester from Column 2 to view subjects.</div>
                        </div>
                      ) : filteredSubjects.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-medium">
                          No subjects added to this semester yet.
                        </div>
                      ) : (
                        filteredSubjects.map((sub) => {
                          const isSelected = selectedSubId === sub.id;
                          const coCount = (cosMap[sub.id] || []).length;

                          return (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedSubId(sub.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-sky-50/60 border-sky-500 shadow-2xs text-sky-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-sky-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <BookMarked className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-600' : 'text-sky-500'}`} />
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">[{sub.subjectCode}] {sub.subjectName}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 border border-sky-200 px-2 py-0.5 rounded-full">
                                  {coCount} CO{coCount !== 1 ? 's' : ''}
                                </span>
                                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <div className="hidden group-hover:flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      setEditingSub(sub);
                                      setSubName(sub.subjectName);
                                      setSubCode(sub.subjectCode);
                                      setSubModalOpen(sub.semesterId);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="Edit Subject"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Delete subject [${sub.subjectCode}] ${sub.subjectName}?`)) {
                                        await OBEStore.deleteSubject(sub.id);
                                        await reloadData(activeYear);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* COLUMN 4: COURSE OUTCOMES (CO) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 min-h-[580px] flex flex-col">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Course Outcomes (CO)</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Manage Course Outcomes for the selected subject.
                      </p>
                    </div>

                    {/* Breadcrumb Chips */}
                    {selectedSub && (
                      <div className="flex items-center justify-between bg-sky-50/60 border border-sky-200 p-2 rounded-xl text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-sky-900 truncate">
                          <BookMarked className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate">[{selectedSub.subjectCode}] {selectedSub.subjectName}</span>
                        </div>
                        <button
                          onClick={() => setSelectedSubId(null)}
                          className="text-sky-600 hover:text-sky-800 text-[10px] font-bold flex items-center gap-0.5 shrink-0 ml-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    )}

                    {/* Add CO Header Banner inside Column 4 (as shown in Image 2) */}
                    {selectedSub && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">{selectedSub.subjectName}</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                            {currentCOs.length} COs
                          </span>
                        </div>
                        <button
                          onClick={() => prepareNextCOCode(selectedSub.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add CO</span>
                        </button>
                      </div>
                    )}

                    {/* CO List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                      {!selectedSubId ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            3
                          </div>
                          <div>Select a subject from Column 3 to view & add course outcomes.</div>
                        </div>
                      ) : filteredCOs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-medium">
                          No Course Outcomes (COs) configured yet. Click "+ Add CO" above.
                        </div>
                      ) : (
                        filteredCOs.map((co) => (
                          <div
                            key={co.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 hover:border-indigo-300 transition-all shadow-2xs group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg shrink-0">
                                {co.coCode}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCO(co);
                                    setCoCode(co.coCode);
                                    setCoDesc(co.description);
                                    setCoModalOpen(co.subjectId);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                  title="Edit CO"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Delete ${co.coCode}?`)) {
                                      await OBEStore.deleteCourseOutcome(co.id);
                                      await reloadData(activeYear);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete CO"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              {co.description}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* DESIGN 2: HIERARCHICAL TREE VIEW (Current Design Style) */}
              {/* ========================================================================= */}
              {viewMode === 'tree' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Programmes Tree for Academic Year: {activeYear.yearName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Expand programmes to configure semesters, subjects, and course outcomes.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProg(null);
                        setProgName('');
                        setProgCode('');
                        setProgModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Programme</span>
                    </button>
                  </div>

                  {programmes.length === 0 ? (
                    <EmptyState
                      title="No programmes created yet"
                      description={`No degree programmes have been created for Academic Year ${activeYear.yearName}.`}
                      actionLabel="Add Programme"
                      onAction={() => {
                        setEditingProg(null);
                        setProgName('');
                        setProgCode('');
                        setProgModalOpen(true);
                      }}
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

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSem(null);
                                    setSemName('');
                                    setSemNum((semesters.length || 0) + 1);
                                    setSemModalOpen(prog.id);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Semester</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProg(prog);
                                    setProgName(prog.programmeName);
                                    setProgCode(prog.programmeCode);
                                    setProgModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white rounded"
                                  title="Edit Programme"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete programme [${prog.programmeCode}] ${prog.programmeName}?`)) {
                                      await OBEStore.deleteProgramme(prog.id);
                                      await reloadData(activeYear);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded"
                                  title="Delete Programme"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingSub(null);
                                                setSubName('');
                                                setSubCode('');
                                                setSubModalOpen(sem.id);
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span>Add Subject</span>
                                            </button>

                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingSem(sem);
                                                setSemName(sem.semesterName);
                                                setSemNum(sem.semesterNumber);
                                                setSemModalOpen(sem.programmeId);
                                              }}
                                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                              title="Edit Semester"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete ${sem.semesterName}?`)) {
                                                  await OBEStore.deleteSemester(sem.id);
                                                  await reloadData(activeYear);
                                                }
                                              }}
                                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                              title="Delete Semester"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
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

                                                      <div className="flex items-center gap-2">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            prepareNextCOCode(sub.id);
                                                          }}
                                                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded border border-blue-200 transition-colors cursor-pointer"
                                                        >
                                                          <Plus className="w-3 h-3" />
                                                          <span>Add CO</span>
                                                        </button>

                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSub(sub);
                                                            setSubName(sub.subjectName);
                                                            setSubCode(sub.subjectCode);
                                                            setSubModalOpen(sub.semesterId);
                                                          }}
                                                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                                          title="Edit Subject"
                                                        >
                                                          <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Delete subject [${sub.subjectCode}] ${sub.subjectName}?`)) {
                                                              await OBEStore.deleteSubject(sub.id);
                                                              await reloadData(activeYear);
                                                            }
                                                          }}
                                                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                          title="Delete Subject"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
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

                                                                <div className="flex items-center gap-1">
                                                                  <button
                                                                    onClick={() => {
                                                                      setEditingCO(co);
                                                                      setCoCode(co.coCode);
                                                                      setCoDesc(co.description);
                                                                      setCoModalOpen(co.subjectId);
                                                                    }}
                                                                    className="text-slate-400 hover:text-blue-600 p-1"
                                                                    title="Edit CO"
                                                                  >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                  </button>
                                                                  <button
                                                                    onClick={async () => {
                                                                      await OBEStore.deleteCourseOutcome(co.id);
                                                                      await reloadData(activeYear);
                                                                    }}
                                                                    className="text-slate-400 hover:text-rose-600 p-1"
                                                                    title="Delete CO"
                                                                  >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                  </button>
                                                                </div>
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
            </div>
          )}

          {/* Add / Edit Programme Modal */}
          {progModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingProg ? 'Edit Programme' : 'Add New Programme'}
                  </h3>
                  <button onClick={() => setProgModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveProgramme} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Programme Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bachelor of Commerce (B.Com)"
                      value={progName}
                      onChange={(e) => setProgName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setProgModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {editingProg ? 'Update Programme' : 'Save Programme'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add / Edit Semester Modal */}
          {semModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSem ? 'Edit Semester' : 'Add Semester'}
                  </h3>
                  <button onClick={() => setSemModalOpen(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveSemester} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Semester 1"
                      value={semName}
                      onChange={(e) => setSemName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSemModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {editingSem ? 'Update Semester' : 'Save Semester'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add / Edit Subject Modal */}
          {subModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSub ? 'Edit Subject' : 'Add Subject'}
                  </h3>
                  <button onClick={() => setSubModalOpen(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveSubject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Financial Accounting"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACC101"
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSubModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {editingSub ? 'Update Subject' : 'Save Subject'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add / Edit Course Outcome (CO) Modal */}
          {coModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCO ? 'Edit Course Outcome (CO)' : 'Add Course Outcome (CO)'}
                  </h3>
                  <button onClick={() => setCoModalOpen(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveCO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CO Code</label>
                    <input
                      type="text"
                      required
                      value={coCode}
                      onChange={(e) => setCoCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Explain the fundamentals of financial accounting."
                      value={coDesc}
                      onChange={(e) => setCoDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCoModalOpen(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {editingCO ? 'Update CO' : 'Save Course Outcome'}
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
