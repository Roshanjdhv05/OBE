'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OBEStore, UserProfile, Programme, Semester, ProgrammeAllocation } from '@/lib/store/obe-store';
import {
  Users,
  Plus,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  BookOpen,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>({});

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

  // Allocations State: map of programmeId -> array of semesterIds
  const [selectedAllocations, setSelectedAllocations] = useState<Record<string, string[]>>({});

  const reloadData = async () => {
    const [fetchedUsers, allProgs, allSems] = await Promise.all([
      OBEStore.getUsers(),
      OBEStore.getProgrammes(),
      OBEStore.getSemesters(),
    ]);

    setUsers(fetchedUsers);
    setProgrammes(allProgs);

    const sMap: Record<string, Semester[]> = {};
    allProgs.forEach((p) => {
      sMap[p.id] = allSems.filter((s) => s.programmeId === p.id);
    });
    setSemestersMap(sMap);
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
    setSelectedAllocations({});
    setErrorMsg(null);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    // Populate existing allocations into selectedAllocations map
    const allocMap: Record<string, string[]> = {};
    if (user.allocations) {
      user.allocations.forEach((alloc) => {
        allocMap[alloc.programmeId] = [...alloc.semesterIds];
      });
    }
    setSelectedAllocations(allocMap);
  };

  // Helper toggle handlers for allocation matrix
  const toggleSemesterAllocation = (progId: string, semId: string) => {
    setSelectedAllocations((prev) => {
      const currentSems = prev[progId] || [];
      const updatedSems = currentSems.includes(semId)
        ? currentSems.filter((id) => id !== semId)
        : [...currentSems, semId];

      const copy = { ...prev };
      if (updatedSems.length > 0) {
        copy[progId] = updatedSems;
      } else {
        delete copy[progId];
      }
      return copy;
    });
  };

  const toggleAllSemestersForProg = (progId: string) => {
    const progSemesters = semestersMap[progId] || [];
    const allSemIds = progSemesters.map((s) => s.id);
    const currentSems = selectedAllocations[progId] || [];

    setSelectedAllocations((prev) => {
      const copy = { ...prev };
      if (currentSems.length === allSemIds.length) {
        delete copy[progId];
      } else {
        copy[progId] = allSemIds;
      }
      return copy;
    });
  };

  const handleSelectAllAllocations = () => {
    const newAlloc: Record<string, string[]> = {};
    programmes.forEach((p) => {
      const sems = semestersMap[p.id] || [];
      if (sems.length > 0) {
        newAlloc[p.id] = sems.map((s) => s.id);
      }
    });
    setSelectedAllocations(newAlloc);
  };

  const handleClearAllAllocations = () => {
    setSelectedAllocations({});
  };

  const convertMapToAllocationArray = (): ProgrammeAllocation[] => {
    return Object.entries(selectedAllocations)
      .filter(([_, semIds]) => semIds.length > 0)
      .map(([progId, semIds]) => ({
        programmeId: progId,
        semesterIds: semIds,
      }));
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

    const allocationsArray = role === 'faculty' ? convertMapToAllocationArray() : [];

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

    const allocationsArray = editingUser.role === 'faculty' ? convertMapToAllocationArray() : [];
    await OBEStore.updateUserAllocations(editingUser.id, allocationsArray);
    setEditingUser(null);
    await reloadData();
  };

  const handleToggleStatus = async (userId: string) => {
    await OBEStore.toggleUserStatus(userId);
    await reloadData();
  };

  const getTotalAllocatedSemestersCount = () => {
    return Object.values(selectedAllocations).reduce((acc, curr) => acc + curr.length, 0);
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
                <span>Institutional User Accounts & Allocations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign faculty users specific degree programmes and semester-wise access to manage course outcome attainments.
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
                  <th className="p-4">Programme & Semester Allocation</th>
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

          {/* CREATE FACULTY ACCESS MODAL */}
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
                      Account Credentials & Details
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Username
                        </label>
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Display Name
                        </label>
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          User Role
                        </label>
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Password
                        </label>
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
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
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span>Programme & Semester-Wise Allocation</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Select programmes and specific semesters to grant access for this faculty account.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {getTotalAllocatedSemestersCount()} Semester(s) Selected
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllAllocations}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleClearAllAllocations}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {programmes.length === 0 ? (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                          No degree programmes have been created yet. You can create user access now and allocate programmes later in Programme Management.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {programmes.map((prog) => {
                            const progSemesters = semestersMap[prog.id] || [];
                            const allocatedSems = selectedAllocations[prog.id] || [];
                            const isAllSelected =
                              progSemesters.length > 0 &&
                              allocatedSems.length === progSemesters.length;

                            return (
                              <div
                                key={prog.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                      {prog.programmeCode}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {prog.programmeName}
                                    </span>
                                  </div>

                                  {progSemesters.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleAllSemestersForProg(prog.id)}
                                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      {isAllSelected ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                      <span>All Semesters</span>
                                    </button>
                                  )}
                                </div>

                                {progSemesters.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic">
                                    No semesters configured for this programme yet.
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {progSemesters.map((sem) => {
                                      const isSelected = allocatedSems.includes(sem.id);

                                      return (
                                        <button
                                          key={sem.id}
                                          type="button"
                                          onClick={() => toggleSemesterAllocation(prog.id, sem.id)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                                              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                          }`}
                                        >
                                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                          <span>{sem.semesterName}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
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

          {/* EDIT ACCESS ALLOCATIONS MODAL */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-blue-600" />
                      <span>Manage Access Allocations: {editingUser.displayName}</span>
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
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span>Programme & Semester-Wise Allocation</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Update the programmes and semesters this user is allowed to access.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {getTotalAllocatedSemestersCount()} Semester(s) Selected
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllAllocations}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllAllocations}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {programmes.length === 0 ? (
                      <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                        No degree programmes configured.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {programmes.map((prog) => {
                          const progSemesters = semestersMap[prog.id] || [];
                          const allocatedSems = selectedAllocations[prog.id] || [];
                          const isAllSelected =
                            progSemesters.length > 0 &&
                            allocatedSems.length === progSemesters.length;

                          return (
                            <div
                              key={prog.id}
                              className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                    {prog.programmeCode}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    {prog.programmeName}
                                  </span>
                                </div>

                                {progSemesters.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleAllSemestersForProg(prog.id)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    {isAllSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    <span>All Semesters</span>
                                  </button>
                                )}
                              </div>

                              {progSemesters.length === 0 ? (
                                <div className="text-[11px] text-slate-400 italic">
                                  No semesters configured for this programme yet.
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {progSemesters.map((sem) => {
                                    const isSelected = allocatedSems.includes(sem.id);

                                    return (
                                      <button
                                        key={sem.id}
                                        type="button"
                                        onClick={() => toggleSemesterAllocation(prog.id, sem.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                        <span>{sem.semesterName}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
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
