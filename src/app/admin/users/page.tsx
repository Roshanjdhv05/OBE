'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OBEStore, UserProfile, Programme, Semester, Subject, ProgrammeAllocation } from '@/lib/store/obe-store';
import {
  Users,
  Plus,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  BookOpen,
  Check,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers,
  FileText,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface SemesterSubjectAllocation {
  semesterId: string;
  subjectIds: string[]; // empty array means all subjects
}

interface ProgAllocationUI {
  programmeId: string;
  semesters: SemesterSubjectAllocation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AllocationPanel — the redesigned Programme & Semester-Wise Allocation UI
// ─────────────────────────────────────────────────────────────────────────────
interface AllocationPanelProps {
  programmes: Programme[];
  semestersMap: Record<string, Semester[]>;
  subjectsMap: Record<string, Subject[]>; // semesterId -> Subject[]
  allocations: ProgAllocationUI[];
  onAllocationsChange: (updated: ProgAllocationUI[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

function AllocationPanel({
  programmes,
  semestersMap,
  subjectsMap,
  allocations,
  onAllocationsChange,
  onSelectAll,
  onClearAll,
}: AllocationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProg, setSelectedProg] = useState<string | null>(null);
  const [expandedSems, setExpandedSems] = useState<Set<string>>(new Set());

  // Filter programmes by search
  const filteredProgrammes = useMemo(() => {
    if (!searchQuery.trim()) return programmes;
    const q = searchQuery.toLowerCase();
    return programmes.filter(
      (p) => p.programmeName.toLowerCase().includes(q) || p.programmeCode.toLowerCase().includes(q)
    );
  }, [programmes, searchQuery]);

  const getProgAlloc = (progId: string): ProgAllocationUI => {
    return allocations.find((a) => a.programmeId === progId) || { programmeId: progId, semesters: [] };
  };

  const getSemAlloc = (progId: string, semId: string): SemesterSubjectAllocation => {
    const progAlloc = getProgAlloc(progId);
    return progAlloc.semesters.find((s) => s.semesterId === semId) || { semesterId: semId, subjectIds: [] };
  };

  const isSemesterSelected = (progId: string, semId: string): boolean => {
    const progAlloc = getProgAlloc(progId);
    return progAlloc.semesters.some((s) => s.semesterId === semId);
  };

  const isSubjectSelected = (progId: string, semId: string, subId: string): boolean => {
    const semAlloc = getSemAlloc(progId, semId);
    return semAlloc.subjectIds.length === 0 || semAlloc.subjectIds.includes(subId);
  };

  const updateAllocations = (progId: string, newSemesters: SemesterSubjectAllocation[]) => {
    const existing = allocations.filter((a) => a.programmeId !== progId);
    if (newSemesters.length > 0) {
      onAllocationsChange([...existing, { programmeId: progId, semesters: newSemesters }]);
    } else {
      onAllocationsChange(existing);
    }
  };

  const toggleSemester = (progId: string, semId: string) => {
    const progAlloc = getProgAlloc(progId);
    const already = progAlloc.semesters.some((s) => s.semesterId === semId);
    if (already) {
      updateAllocations(progId, progAlloc.semesters.filter((s) => s.semesterId !== semId));
      setExpandedSems((prev) => { const n = new Set(prev); n.delete(semId); return n; });
    } else {
      updateAllocations(progId, [...progAlloc.semesters, { semesterId: semId, subjectIds: [] }]);
      setExpandedSems((prev) => new Set([...prev, semId]));
    }
  };

  const toggleSubject = (progId: string, semId: string, subId: string) => {
    const progAlloc = getProgAlloc(progId);
    const semAlloc = getSemAlloc(progId, semId);
    const subjects = subjectsMap[semId] || [];

    let newSubjectIds: string[];
    if (semAlloc.subjectIds.length === 0) {
      // Currently "all subjects" — switch to specific
      newSubjectIds = subjects.map((s) => s.id).filter((id) => id !== subId);
    } else if (semAlloc.subjectIds.includes(subId)) {
      newSubjectIds = semAlloc.subjectIds.filter((id) => id !== subId);
      if (newSubjectIds.length === subjects.length) newSubjectIds = []; // back to "all"
    } else {
      newSubjectIds = [...semAlloc.subjectIds, subId];
      if (newSubjectIds.length === subjects.length) newSubjectIds = []; // all selected = "all"
    }

    const newSemesters = progAlloc.semesters.map((s) =>
      s.semesterId === semId ? { ...s, subjectIds: newSubjectIds } : s
    );
    updateAllocations(progId, newSemesters);
  };

  const toggleAllSubjectsForSem = (progId: string, semId: string) => {
    const progAlloc = getProgAlloc(progId);
    const semAlloc = getSemAlloc(progId, semId);
    const newSubjectIds = semAlloc.subjectIds.length === 0 ? [] : []; // toggle to all
    const newSemesters = progAlloc.semesters.map((s) =>
      s.semesterId === semId ? { ...s, subjectIds: newSubjectIds } : s
    );
    updateAllocations(progId, newSemesters);
  };

  const getTotalSemCount = () => allocations.reduce((acc, a) => acc + a.semesters.length, 0);
  const getTotalSubCount = () =>
    allocations.reduce((acc, a) => {
      a.semesters.forEach((s) => {
        const subs = subjectsMap[s.semesterId] || [];
        acc += s.subjectIds.length === 0 ? subs.length : s.subjectIds.length;
      });
      return acc;
    }, 0);

  const activeProgSems = selectedProg ? (semestersMap[selectedProg] || []) : [];

  return (
    <div className="space-y-3">
      {/* Header + counters + search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Programme &amp; Semester-Wise Allocation</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Select a programme, then choose semesters and subjects to grant access.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {getTotalSemCount()} Sem · {getTotalSubCount()} Subject(s)
          </span>
          <button type="button" onClick={onSelectAll} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer">Select All</button>
          <span className="text-slate-300">|</span>
          <button type="button" onClick={onClearAll} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer">Clear All</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search programmes or subjects…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {programmes.length === 0 ? (
        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          No degree programmes have been created yet.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Programme Boxes - side by side */}
          <div className="flex flex-wrap gap-2">
            {filteredProgrammes.map((prog) => {
              const progAlloc = getProgAlloc(prog.id);
              const isActive = selectedProg === prog.id;
              const hasAlloc = progAlloc.semesters.length > 0;

              return (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => setSelectedProg(isActive ? null : prog.id)}
                  className={`relative flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 text-center transition-all cursor-pointer min-w-[90px] gap-1 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]'
                      : hasAlloc
                      ? 'bg-blue-50 border-blue-300 text-blue-800 hover:border-blue-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className={`w-5 h-5 ${isActive ? 'text-white' : hasAlloc ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-[11px] font-bold tracking-wide">{prog.programmeCode}</span>
                  {hasAlloc && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-800'
                    }`}>
                      {progAlloc.semesters.length} sem
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Programme Panel */}
          {selectedProg && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              {/* Programme Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-200" />
                  <span className="text-sm font-bold text-white">
                    {programmes.find((p) => p.id === selectedProg)?.programmeName}
                  </span>
                  <span className="text-xs text-blue-300 font-mono">
                    [{programmes.find((p) => p.id === selectedProg)?.programmeCode}]
                  </span>
                </div>
                <button type="button" onClick={() => setSelectedProg(null)} className="text-blue-200 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeProgSems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No semesters configured for this programme.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeProgSems.map((sem) => {
                    const semSelected = isSemesterSelected(selectedProg, sem.id);
                    const subjects = subjectsMap[sem.id] || [];
                    const isExpanded = expandedSems.has(sem.id);
                    const semAlloc = getSemAlloc(selectedProg, sem.id);
                    const selectedSubCount = semAlloc.subjectIds.length === 0 ? subjects.length : semAlloc.subjectIds.length;

                    // Filter subjects by search
                    const filteredSubjects = searchQuery
                      ? subjects.filter(
                          (s) =>
                            s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : subjects;

                    return (
                      <div key={sem.id}>
                        {/* Semester Row */}
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          {/* Semester Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSemester(selectedProg, sem.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              semSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-300 hover:border-blue-400 bg-white'
                            }`}
                          >
                            {semSelected && <Check className="w-3 h-3 text-white" />}
                          </button>

                          {/* Semester Name */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className={`text-xs font-semibold ${semSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                              {sem.semesterName}
                            </span>
                            {semSelected && subjects.length > 0 && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                                {selectedSubCount}/{subjects.length} subjects
                              </span>
                            )}
                          </div>

                          {/* Expand subjects button */}
                          {semSelected && subjects.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSems((prev) => {
                                  const n = new Set(prev);
                                  if (n.has(sem.id)) n.delete(sem.id);
                                  else n.add(sem.id);
                                  return n;
                                })
                              }
                              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span>Subjects</span>
                            </button>
                          )}
                        </div>

                        {/* Subject List (expanded) */}
                        {semSelected && isExpanded && subjects.length > 0 && (
                          <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                            <div className="flex items-center justify-between py-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Subjects in {sem.semesterName}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleAllSubjectsForSem(selectedProg, sem.id)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                {semAlloc.subjectIds.length === 0 ? 'Select Specific' : 'Select All'}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {filteredSubjects.map((sub) => {
                                const isSubSelected = isSubjectSelected(selectedProg, sem.id, sub.id);
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => toggleSubject(selectedProg, sem.id, sub.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                      isSubSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                  >
                                    {isSubSelected && <Check className="w-3 h-3 shrink-0" />}
                                    <span className="font-mono text-[10px] opacity-70">{sub.subjectCode}</span>
                                    <span className="max-w-[120px] truncate">{sub.subjectName}</span>
                                  </button>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <span className="text-[11px] text-slate-400 italic">No subjects match your search.</span>
                              )}
                            </div>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, Subject[]>>({});

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form Fields for Create
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'faculty'>('faculty');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Allocations State (new structured format)
  const [uiAllocations, setUiAllocations] = useState<ProgAllocationUI[]>([]);

  const reloadData = async () => {
    const [fetchedUsers, allProgs, allSems, allSubs] = await Promise.all([
      OBEStore.getUsers(),
      OBEStore.getProgrammes(),
      OBEStore.getSemesters(),
      OBEStore.getSubjects(),
    ]);

    setUsers(fetchedUsers);
    setProgrammes(allProgs);

    const sMap: Record<string, Semester[]> = {};
    allProgs.forEach((p) => {
      sMap[p.id] = allSems.filter((s) => s.programmeId === p.id);
    });
    setSemestersMap(sMap);

    const subMap: Record<string, Subject[]> = {};
    allSems.forEach((sem) => {
      subMap[sem.id] = allSubs.filter((s) => s.semesterId === sem.id);
    });
    setSubjectsMap(subMap);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const resetCreateForm = () => {
    setUsername('');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('faculty');
    setUiAllocations([]);
    setErrorMsg(null);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    // Convert existing ProgrammeAllocation[] to ProgAllocationUI[]
    const uiAllocs: ProgAllocationUI[] = (user.allocations || []).map((alloc) => ({
      programmeId: alloc.programmeId,
      semesters: alloc.semesterIds.map((semId) => ({ semesterId: semId, subjectIds: [] })),
    }));
    setUiAllocations(uiAllocs);
  };

  const convertUIToStoreAllocations = (): ProgrammeAllocation[] => {
    return uiAllocations.map((a) => ({
      programmeId: a.programmeId,
      semesterIds: a.semesters.map((s) => s.semesterId),
    }));
  };

  const handleSelectAll = () => {
    const all: ProgAllocationUI[] = programmes.map((p) => ({
      programmeId: p.id,
      semesters: (semestersMap[p.id] || []).map((s) => ({ semesterId: s.id, subjectIds: [] })),
    }));
    setUiAllocations(all);
  };

  const handleClearAll = () => {
    setUiAllocations([]);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const allocationsArray = role === 'faculty' ? convertUIToStoreAllocations() : [];

    try {
      await OBEStore.addUser(username.trim(), displayName.trim(), email.trim(), role, allocationsArray, password);
      setIsCreateModalOpen(false);
      resetCreateForm();
      await reloadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create user. Please check all fields and try again.');
    }
  };

  const handleSaveEditAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const allocationsArray = editingUser.role === 'faculty' ? convertUIToStoreAllocations() : [];
    await OBEStore.updateUserAllocations(editingUser.id, allocationsArray);
    setEditingUser(null);
    setUiAllocations([]);
    await reloadData();
  };

  const handleToggleStatus = async (userId: string) => {
    await OBEStore.toggleUserStatus(userId);
    await reloadData();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="User Access Management"
          subtitle="Create & manage Institutional accounts with Programme and Semester-wise access control"
          role="super_admin"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Institutional User Accounts &amp; Allocations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign faculty users specific degree programmes, semesters, and subjects to manage course outcome attainments.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Faculty Access</span>
            </button>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Programme &amp; Semester Allocation</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                {users.map((u) => {
                  const hasAllocations = u.allocations && u.allocations.length > 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{u.displayName}</div>
                        <div className="text-[11px] text-slate-400">
                          Created: {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-700">{u.username}</td>
                      <td className="p-4 text-slate-700">{u.email}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            u.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {u.role === 'super_admin' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          <span>{u.role.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Allocations Column */}
                      <td className="p-4">
                        {u.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Full System Access
                          </span>
                        ) : hasAllocations ? (
                          <div className="space-y-1.5 max-w-xs">
                            {u.allocations!.map((alloc) => {
                              const prog = programmes.find((p) => p.id === alloc.programmeId);
                              const progSemesters = semestersMap[alloc.programmeId] || [];
                              const semNames = alloc.semesterIds
                                .map((sId) => {
                                  const sem = progSemesters.find((s) => s.id === sId);
                                  return sem ? sem.semesterName : null;
                                })
                                .filter(Boolean);

                              return (
                                <div
                                  key={alloc.programmeId}
                                  className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]"
                                >
                                  <div className="font-bold text-blue-900 flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 text-blue-600" />
                                    <span>[{prog?.programmeCode || 'PROG'}]</span>
                                    <span className="truncate text-slate-700 font-medium">
                                      {prog?.programmeName}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {semNames.map((sName, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-700 shadow-2xs"
                                      >
                                        {sName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            All Programmes (Unrestricted)
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                            <XCircle className="w-4 h-4 text-rose-600" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {u.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit Access
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                u.active
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── CREATE FACULTY ACCESS MODAL ─────────────────────────────────────── */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Create User Access Account</span>
                  </h3>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                    New User Creation
                  </span>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-5 overflow-y-auto pr-1 flex-1">
                  {/* Account Information */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Account Credentials &amp; Details
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. dr_smith"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dr. John Smith"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="jsmith@institution.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">User Role</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as 'super_admin' | 'faculty')}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                        >
                          <option value="faculty">Faculty Member</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Programme & Semester Allocation Section */}
                  {role === 'faculty' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <AllocationPanel
                        programmes={programmes}
                        semestersMap={semestersMap}
                        subjectsMap={subjectsMap}
                        allocations={uiAllocations}
                        onAllocationsChange={setUiAllocations}
                        onSelectAll={handleSelectAll}
                        onClearAll={handleClearAll}
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── EDIT ACCESS ALLOCATIONS MODAL ───────────────────────────────────── */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-blue-600" />
                      <span>Manage Access: {editingUser.displayName}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Username: {editingUser.username} | Email: {editingUser.email}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                    Edit Allocations
                  </span>
                </div>

                <form onSubmit={handleSaveEditAllocations} className="space-y-5 overflow-y-auto pr-1 flex-1">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <AllocationPanel
                      programmes={programmes}
                      semestersMap={semestersMap}
                      subjectsMap={subjectsMap}
                      allocations={uiAllocations}
                      onAllocationsChange={setUiAllocations}
                      onSelectAll={handleSelectAll}
                      onClearAll={handleClearAll}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setEditingUser(null); setUiAllocations([]); }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Allocations
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
