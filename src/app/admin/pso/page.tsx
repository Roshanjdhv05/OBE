'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AcademicYearSelector } from '@/components/common/AcademicYearSelector';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, AcademicYear, Programme, PSO } from '@/lib/store/obe-store';
import { Award, Plus, Trash2 } from 'lucide-react';

export default function PSOManagementPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgId, setSelectedProgId] = useState('');
  const [psos, setPsos] = useState<PSO[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [psoCode, setPsoCode] = useState('PSO1');
  const [description, setDescription] = useState('');

  const reloadData = async (year?: AcademicYear | null) => {
    const targetYear = year !== undefined ? year : await OBEStore.getActiveAcademicYear();
    setActiveYear(targetYear);
    if (targetYear) {
      const progs = await OBEStore.getProgrammes(targetYear.id);
      setProgrammes(progs);
      if (progs.length > 0) {
        setSelectedProgId(progs[0].id);
        const list = await OBEStore.getPSOs(progs[0].id);
        setPsos(list);
      } else {
        setSelectedProgId('');
        setPsos([]);
      }
    } else {
      setProgrammes([]);
      setPsos([]);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  useEffect(() => {
    const loadPsos = async () => {
      if (selectedProgId) {
        const list = await OBEStore.getPSOs(selectedProgId);
        setPsos(list);
      } else {
        setPsos([]);
      }
    };
    loadPsos();
  }, [selectedProgId]);

  const handleAddPSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear || !selectedProgId || !psoCode || !description) return;
    await OBEStore.addPSO(activeYear.id, selectedProgId, psoCode.trim().toUpperCase(), description.trim());
    setDescription('');
    setPsoCode(`PSO${psos.length + 2}`);
    setIsModalOpen(false);
    await reloadData(activeYear);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Program Specific Outcomes (PSO) Management"
          subtitle="Configure PSOs per programme for Outcome Based Education mapping"
          role="super_admin"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          <AcademicYearSelector onYearChange={(y) => reloadData(y)} />

          {/* Action & Programme Filter */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Select Programme
                </label>
                <select
                  value={selectedProgId}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 px-3 py-1.5 min-w-[240px]"
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.programmeCode}] {p.programmeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProgId && (
              <button
                onClick={() => {
                  setPsoCode(`PSO${psos.length + 1}`);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Program Specific Outcome</span>
              </button>
            )}
          </div>

          {/* PSOs Data Table */}
          {psos.length === 0 ? (
            <EmptyState
              title="No Program Specific Outcomes (PSOs) configured yet"
              description="Click '+ Add Program Specific Outcome' above to create PSOs for this programme."
              actionLabel="Add PSO"
              onAction={() => {
                setPsoCode(`PSO${psos.length + 1}`);
                setIsModalOpen(true);
              }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-4">PSO Code</th>
                    <th className="p-4">PSO Statement / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {psos.map((pso) => (
                    <tr key={pso.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold text-purple-700 bg-purple-50/50 w-36">
                        {pso.psoCode}
                      </td>
                      <td className="p-4 font-medium text-slate-900">{pso.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add PSO Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add Program Specific Outcome</h3>
                <form onSubmit={handleAddPSO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PSO Code</label>
                    <input
                      type="text"
                      required
                      value={psoCode}
                      onChange={(e) => setPsoCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PSO Description Statement</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Apply standard principles to analyze economic trends and market structures."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save PSO
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
