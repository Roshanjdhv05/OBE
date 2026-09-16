'use client';

import React, { useState, useEffect } from 'react';
import { OBEStore, AcademicYear } from '@/lib/store/obe-store';
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react';

interface AcademicYearSelectorProps {
  onYearChange?: (selectedYear: AcademicYear | null) => void;
  allowManagement?: boolean;
}

export const AcademicYearSelector: React.FC<AcademicYearSelectorProps> = ({
  onYearChange,
  allowManagement = true,
}) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearName, setYearName] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reloadYears = async () => {
    const list = await OBEStore.getAcademicYears();
    setYears(list);
    const active = await OBEStore.getActiveAcademicYear();
    setActiveYear(active);
    if (onYearChange) onYearChange(active);
  };

  useEffect(() => {
    reloadYears();
  }, []);

  const handleSelectYear = async (id: string) => {
    await OBEStore.setActiveAcademicYear(id);
    await reloadYears();
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await OBEStore.updateAcademicYear(editingId, yearName.trim(), Number(startYear), Number(endYear));
      } else {
        await OBEStore.addAcademicYear(yearName.trim(), Number(startYear), Number(endYear));
      }
      setYearName('');
      setEditingId(null);
      setIsModalOpen(false);
      await reloadYears();
    } catch (err) {
      console.error('Save year error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingId(year.id);
    setYearName(year.yearName);
    setStartYear(year.startYear);
    setEndYear(year.endYear);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this Academic Year? Associated programmes will also be removed.')) {
      await OBEStore.deleteAcademicYear(id);
      await reloadYears();
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Academic Year Context
          </label>
          <div className="flex items-center gap-2 mt-0.5">
            <select
              value={activeYear?.id || ''}
              onChange={(e) => handleSelectYear(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 font-semibold px-3 py-1.5 cursor-pointer"
            >
              {years.length === 0 ? (
                <option value="">No Academic Year Created</option>
              ) : (
                years.map((y) => (
                  <option key={y.id} value={y.id}>
                    Academic Year: {y.yearName}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {allowManagement && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingId(null);
              setYearName('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Year</span>
          </button>

          {activeYear && (
            <>
              <button
                onClick={() => handleEdit(activeYear)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => handleDelete(activeYear.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Academic Year' : 'Create New Academic Year'}
            </h3>

            <form onSubmit={handleSaveYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year Name (e.g. 2025-26)
                </label>
                <input
                  type="text"
                  required
                  placeholder="2025-26"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    required
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Year</label>
                  <input
                    type="number"
                    required
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
