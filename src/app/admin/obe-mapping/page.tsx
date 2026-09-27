'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import {
  OBEStore,
  AcademicYear,
  Programme,
  Semester,
  Subject,
  CourseOutcome,
  GraduateAttribute,
  ProgrammeOutcome,
  PSO,
} from '@/lib/store/obe-store';
import {
  Network,
  Link as LinkIcon,
  Target,
  RotateCcw,
  Save,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

function OBEMappingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active Tab: 'ga_po' | 'po_co' | 'pso_co'
  const activeTab = searchParams.get('tab') || 'po_co';

  // Master Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAYId, setSelectedAYId] = useState<string>('');

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgId, setSelectedProgId] = useState<string>('');

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<string>('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  const [cos, setCos] = useState<CourseOutcome[]>([]);
  const [gas, setGas] = useState<GraduateAttribute[]>([]);
  const [pos, setPos] = useState<ProgrammeOutcome[]>([]);
  const [psos, setPsos] = useState<PSO[]>([]);

  // Mapping state maps:
  // GA->PO: `${gaId}_${poId}` -> level
  const [gaPoMatrix, setGaPoMatrix] = useState<Record<string, number>>({});

  // PO->CO: `${coId}_${poId}` -> level
  const [poCoMatrix, setPoCoMatrix] = useState<Record<string, number>>({});

  // PSO->CO: `${coId}_${psoId}` -> level
  const [psoCoMatrix, setPsoCoMatrix] = useState<Record<string, number>>({});

  // UI feedback & modals
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Management Modals State
  const [gaModalOpen, setGaModalOpen] = useState(false);
  const [editingGA, setEditingGA] = useState<GraduateAttribute | null>(null);
  const [gaCode, setGaCode] = useState('');
  const [gaDesc, setGaDesc] = useState('');

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<ProgrammeOutcome | null>(null);
  const [poCode, setPoCode] = useState('');
  const [poTitle, setPoTitle] = useState('');
  const [poDesc, setPoDesc] = useState('');

  const [psoModalOpen, setPsoModalOpen] = useState(false);
  const [editingPSO, setEditingPSO] = useState<PSO | null>(null);
  const [psoCode, setPsoCode] = useState('');
  const [psoDesc, setPsoDesc] = useState('');

  // 1. Initial Load: Academic Years & GAs
  useEffect(() => {
    const initData = async () => {
      const [ayList, gaList] = await Promise.all([
        OBEStore.getAcademicYears(),
        OBEStore.getGraduateAttributes(),
      ]);

      setAcademicYears(ayList);
      setGas(gaList);

      const activeAY = ayList.find((y) => y.isActive) || ayList[0];
      if (activeAY) {
        setSelectedAYId(activeAY.id);
      }
    };
    initData();
  }, []);

  // 2. Academic Year changed -> load Programmes
  useEffect(() => {
    if (!selectedAYId) {
      setProgrammes([]);
      setSelectedProgId('');
      return;
    }
    const loadProgs = async () => {
      const list = await OBEStore.getProgrammes(selectedAYId);
      setProgrammes(list);
      if (list.length > 0) {
        setSelectedProgId(list[0].id);
      } else {
        setSelectedProgId('');
      }
    };
    loadProgs();
  }, [selectedAYId]);

  // 3. Programme changed -> load Semesters, POs, PSOs, and GA->PO mappings
  useEffect(() => {
    if (!selectedProgId) {
      setSemesters([]);
      setSelectedSemId('');
      setPos([]);
      setPsos([]);
      setGaPoMatrix({});
      return;
    }
    const loadProgData = async () => {
      const [semList, poList, psoList, gaPoMappings] = await Promise.all([
        OBEStore.getSemesters(selectedProgId),
        OBEStore.getProgrammeOutcomes(selectedProgId),
        OBEStore.getPSOs(selectedProgId),
        OBEStore.getGAPOMappings(selectedProgId),
      ]);

      setSemesters(semList);
      setPos(poList);
      setPsos(psoList);

      if (semList.length > 0) {
        setSelectedSemId(semList[0].id);
      } else {
        setSelectedSemId('');
      }

      // Convert GA-PO mappings list to state object map
      const matrix: Record<string, number> = {};
      gaPoMappings.forEach((m) => {
        matrix[`${m.gaId}_${m.poId}`] = m.mappingLevel;
      });
      setGaPoMatrix(matrix);
    };
    loadProgData();
  }, [selectedProgId]);

  // 4. Semester changed -> load Subjects
  useEffect(() => {
    if (!selectedSemId) {
      setSubjects([]);
      setSelectedSubId('');
      return;
    }
    const loadSubs = async () => {
      const subList = await OBEStore.getSubjects(selectedSemId);
      setSubjects(subList);
      if (subList.length > 0) {
        setSelectedSubId(subList[0].id);
      } else {
        setSelectedSubId('');
      }
    };
    loadSubs();
  }, [selectedSemId]);

  // 5. Subject changed -> load COs, PO->CO mappings, and PSO->CO mappings
  useEffect(() => {
    if (!selectedSubId) {
      setCos([]);
      setPoCoMatrix({});
      setPsoCoMatrix({});
      return;
    }
    const loadSubData = async () => {
      const [coList, poCoMappings, psoCoMappings] = await Promise.all([
        OBEStore.getCourseOutcomes(selectedSubId),
        OBEStore.getCOPOMappings(selectedSubId),
        OBEStore.getCOPSOMappings(selectedSubId),
      ]);

      setCos(coList);

      // Convert PO-CO mappings list to state map
      const poMatrix: Record<string, number> = {};
      poCoMappings.forEach((m) => {
        poMatrix[`${m.coId}_${m.poId}`] = m.mappingLevel;
      });
      setPoCoMatrix(poMatrix);

      // Convert PSO-CO mappings list to state map
      const psoMatrix: Record<string, number> = {};
      psoCoMappings.forEach((m) => {
        psoMatrix[`${m.coId}_${m.psoId}`] = m.mappingLevel;
      });
      setPsoCoMatrix(psoMatrix);
    };
    loadSubData();
  }, [selectedSubId]);

  // Helper for Tab switching
  const handleTabChange = (tab: 'ga_po' | 'po_co' | 'pso_co') => {
    router.push(`/admin/obe-mapping?tab=${tab}`);
  };

  // Helper for Toast feedback
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Selected object lookups
  const selectedProg = useMemo(
    () => programmes.find((p) => p.id === selectedProgId) || null,
    [programmes, selectedProgId]
  );
  const selectedSem = useMemo(
    () => semesters.find((s) => s.id === selectedSemId) || null,
    [semesters, selectedSemId]
  );
  const selectedSub = useMemo(
    () => subjects.find((s) => s.id === selectedSubId) || null,
    [subjects, selectedSubId]
  );

  // Reset Filters to initial state
  const handleResetFilters = () => {
    if (academicYears.length > 0) {
      const activeAY = academicYears.find((y) => y.isActive) || academicYears[0];
      setSelectedAYId(activeAY.id);
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE HANDLERS
  // ---------------------------------------------------------------------------

  const handleSaveGAPOMappings = async () => {
    if (!selectedProgId) return;
    setSaving(true);
    try {
      const list: { gaId: string; poId: string; mappingLevel: number }[] = [];
      gas.forEach((g) => {
        pos.forEach((p) => {
          const key = `${g.id}_${p.id}`;
          const lvl = gaPoMatrix[key] ?? 0;
          list.push({ gaId: g.id, poId: p.id, mappingLevel: lvl });
        });
      });
      await OBEStore.saveGAPOMappings(selectedProgId, list);
      showToast('success', 'GA → PO Mappings saved successfully!');
    } catch (err: any) {
      showToast('error', 'Failed to save GA → PO mappings: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePOCOMappings = async () => {
    if (!selectedSubId || !selectedProgId || !selectedSemId) return;
    setSaving(true);
    try {
      const list: { coId: string; poId: string; mappingLevel: number }[] = [];
      cos.forEach((c) => {
        pos.forEach((p) => {
          const key = `${c.id}_${p.id}`;
          const lvl = poCoMatrix[key] ?? 0;
          list.push({ coId: c.id, poId: p.id, mappingLevel: lvl });
        });
      });
      await OBEStore.saveCOPOMappings(selectedSubId, selectedProgId, selectedSemId, list);
      showToast('success', `PO → CO Mappings for ${selectedSub?.subjectCode || 'subject'} saved successfully!`);
    } catch (err: any) {
      showToast('error', 'Failed to save PO → CO mappings: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePSOCOMappings = async () => {
    if (!selectedSubId || !selectedProgId || !selectedSemId) return;
    setSaving(true);
    try {
      const list: { coId: string; psoId: string; mappingLevel: number }[] = [];
      cos.forEach((c) => {
        psos.forEach((p) => {
          const key = `${c.id}_${p.id}`;
          const lvl = psoCoMatrix[key] ?? 0;
          list.push({ coId: c.id, psoId: p.id, mappingLevel: lvl });
        });
      });
      await OBEStore.saveCOPSOMappings(selectedSubId, selectedProgId, selectedSemId, list);
      showToast('success', `PSO → CO Mappings for ${selectedSub?.subjectCode || 'subject'} saved successfully!`);
    } catch (err: any) {
      showToast('error', 'Failed to save PSO → CO mappings: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MASTER DATA MODAL HANDLERS
  // ---------------------------------------------------------------------------

  // GA Add / Edit / Delete
  const handleSaveGA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gaCode || !gaDesc) return;
    if (editingGA) {
      await OBEStore.updateGraduateAttribute(editingGA.id, gaCode.trim().toUpperCase(), gaDesc.trim());
    } else {
      await OBEStore.addGraduateAttribute(gaCode.trim().toUpperCase(), gaDesc.trim());
    }
    setGaCode('');
    setGaDesc('');
    setEditingGA(null);
    setGaModalOpen(false);
    const updated = await OBEStore.getGraduateAttributes();
    setGas(updated);
    showToast('success', 'Graduate Attribute saved successfully.');
  };

  const handleDeleteGA = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete Graduate Attribute ${code}?`)) {
      await OBEStore.deleteGraduateAttribute(id);
      const updated = await OBEStore.getGraduateAttributes();
      setGas(updated);
      showToast('success', `Graduate Attribute ${code} deleted.`);
    }
  };

  // PO Add / Edit / Delete
  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgId || !poCode || !poDesc) return;
    if (editingPO) {
      await OBEStore.updateProgrammeOutcome(editingPO.id, selectedProgId, poCode.trim().toUpperCase(), poTitle.trim(), poDesc.trim());
    } else {
      await OBEStore.addProgrammeOutcome(selectedAYId, selectedProgId, poCode.trim().toUpperCase(), poTitle.trim(), poDesc.trim());
    }
    setPoCode('');
    setPoTitle('');
    setPoDesc('');
    setEditingPO(null);
    setPoModalOpen(false);
    const updated = await OBEStore.getProgrammeOutcomes(selectedProgId);
    setPos(updated);
    showToast('success', 'Programme Outcome saved successfully.');
  };

  const handleDeletePO = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete Programme Outcome ${code}?`)) {
      await OBEStore.deleteProgrammeOutcome(id, selectedProgId);
      const updated = await OBEStore.getProgrammeOutcomes(selectedProgId);
      setPos(updated);
      showToast('success', `Programme Outcome ${code} deleted.`);
    }
  };

  // PSO Add / Edit / Delete
  const handleSavePSO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgId || !psoCode || !psoDesc) return;
    if (editingPSO) {
      await OBEStore.updatePSO(editingPSO.id, selectedProgId, psoCode.trim().toUpperCase(), psoDesc.trim());
    } else {
      await OBEStore.addPSO(selectedAYId, selectedProgId, psoCode.trim().toUpperCase(), psoDesc.trim());
    }
    setPsoCode('');
    setPsoDesc('');
    setEditingPSO(null);
    setPsoModalOpen(false);
    const updated = await OBEStore.getPSOs(selectedProgId);
    setPsos(updated);
    showToast('success', 'Program Specific Outcome saved successfully.');
  };

  const handleDeletePSO = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete PSO ${code}?`)) {
      await OBEStore.deletePSO(id, selectedProgId);
      const updated = await OBEStore.getPSOs(selectedProgId);
      setPsos(updated);
      showToast('success', `PSO ${code} deleted.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="OBE Mapping"
          subtitle="Configure and manage GA, PO, PSO and CO mappings for your programmes."
          role="super_admin"
        />

        <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Toast Alert Banner */}
          {toastMessage && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* HEADER SELECTORS CARD */}
          {/* ========================================================================= */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Academic Year */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Academic Year</span>
                </label>
                <select
                  value={selectedAYId}
                  onChange={(e) => setSelectedAYId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.yearName} {ay.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programme */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Programme</span>
                </label>
                <select
                  value={selectedProgId}
                  disabled={programmes.length === 0}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {programmes.length === 0 ? (
                    <option value="">No Programmes Available</option>
                  ) : (
                    programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.programmeCode}] {p.programmeName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Semester (Not required for GA -> PO) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Semester</span>
                </label>
                <select
                  value={selectedSemId}
                  disabled={activeTab === 'ga_po' || semesters.length === 0}
                  onChange={(e) => setSelectedSemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {activeTab === 'ga_po' ? (
                    <option value="">Not Required (Programme Level)</option>
                  ) : semesters.length === 0 ? (
                    <option value="">No Semesters Available</option>
                  ) : (
                    semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.semesterName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Subject & Reset */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Subject</span>
                  </label>
                  <select
                    value={selectedSubId}
                    disabled={activeTab === 'ga_po' || subjects.length === 0}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {activeTab === 'ga_po' ? (
                      <option value="">Not Required (Programme Level)</option>
                    ) : subjects.length === 0 ? (
                      <option value="">No Subjects Available</option>
                    ) : (
                      subjects.map((sb) => (
                        <option key={sb.id} value={sb.id}>
                          [{sb.subjectCode}] {sb.subjectName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 mt-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-300 flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Reset Filter Selection"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABS NAVIGATION */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
            <button
              onClick={() => handleTabChange('ga_po')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ga_po'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>GA → PO</span>
            </button>

            <button
              onClick={() => handleTabChange('po_co')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'po_co'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>PO → CO</span>
            </button>

            <button
              onClick={() => handleTabChange('pso_co')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pso_co'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>PSO → CO</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: GA → PO MAPPING */}
          {/* ========================================================================= */}
          {activeTab === 'ga_po' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">GA → PO Mapping</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Map Graduate Attributes (GAs) to Programme Outcomes (POs) for the selected programme.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingGA(null);
                      setGaCode(`GA${gas.length + 1}`);
                      setGaDesc('');
                      setGaModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manage GAs</span>
                  </button>

                  <button
                    disabled={!selectedProgId}
                    onClick={() => {
                      setEditingPO(null);
                      setPoCode(`PO${pos.length + 1}`);
                      setPoTitle('');
                      setPoDesc('');
                      setPoModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Programme Outcome (PO)</span>
                  </button>
                </div>
              </div>

              {!selectedProgId ? (
                <EmptyState
                  title="No Programme Selected"
                  description="Please select a programme from the header dropdown above to view and configure GA to PO mappings."
                />
              ) : gas.length === 0 || pos.length === 0 ? (
                <EmptyState
                  title="Graduate Attributes (GA) or Programme Outcomes (PO) Missing"
                  description="To configure GA → PO mappings, please ensure both GAs and POs are created for this programme."
                  actionLabel="Add PO"
                  onAction={() => {
                    setEditingPO(null);
                    setPoCode(`PO${pos.length + 1}`);
                    setPoTitle('');
                    setPoDesc('');
                    setPoModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2/3: Matrix Table */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                      <div className="text-xs font-bold text-slate-800">
                        GA to PO Correlation Matrix
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Mapping Scale: <span className="font-semibold text-slate-700">0 - None | 1 - Low | 2 - Moderate | 3 - High</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-white text-xs font-semibold">
                          <tr>
                            <th className="p-3.5 w-24">GA Code</th>
                            <th className="p-3.5 min-w-[200px]">GA Statement</th>
                            {pos.map((p) => (
                              <th key={p.id} className="p-3.5 text-center min-w-[110px]">
                                <div className="font-bold text-sm">{p.poCode}</div>
                                {p.title && <div className="text-[10px] text-slate-300 font-normal truncate max-w-[100px]">{p.title}</div>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-medium">
                          {gas.map((ga) => (
                            <tr key={ga.id} className="hover:bg-slate-50/70">
                              <td className="p-3.5 font-bold font-mono text-blue-700 bg-blue-50/40">
                                {ga.code}
                              </td>
                              <td className="p-3.5 text-slate-700 text-xs font-medium">
                                {ga.description}
                              </td>
                              {pos.map((p) => {
                                const key = `${ga.id}_${p.id}`;
                                const currentVal = gaPoMatrix[key] ?? 0;

                                return (
                                  <td key={p.id} className="p-3 text-center">
                                    <select
                                      value={currentVal}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setGaPoMatrix((prev) => ({ ...prev, [key]: val }));
                                      }}
                                      className={`w-16 px-2 py-1.5 rounded-lg text-xs font-bold text-center border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer ${
                                        currentVal > 0
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                      }`}
                                    >
                                      <option value={0} className="bg-white text-slate-900">0</option>
                                      <option value={1} className="bg-white text-slate-900">1</option>
                                      <option value={2} className="bg-white text-slate-900">2</option>
                                      <option value={3} className="bg-white text-slate-900">3</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right 1/3: Programme Details & Actions */}
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Programme Details</h3>
                          <p className="text-[11px] text-slate-500 font-medium">Selected programme statistics</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs font-medium">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Programme:</span>
                          <span className="font-bold text-slate-900">[{selectedProg?.programmeCode}] {selectedProg?.programmeName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total GAs:</span>
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{gas.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total POs:</span>
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">{pos.length}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-500">
                          Quick Actions
                        </label>
                        <button
                          disabled={saving}
                          onClick={handleSaveGAPOMappings}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Saving...' : 'Save Mapping'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProgId) {
                              OBEStore.getGAPOMappings(selectedProgId).then((mappings) => {
                                const matrix: Record<string, number> = {};
                                mappings.forEach((m) => { matrix[`${m.gaId}_${m.poId}`] = m.mappingLevel; });
                                setGaPoMatrix(matrix);
                              });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Changes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PO → CO MAPPINGS (Identical layout to uploaded user image!) */}
          {/* ========================================================================= */}
          {activeTab === 'po_co' && (
            <div className="space-y-6">
              {/* Header Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>PO → CO Mapping</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Map Course Outcomes (COs) to Programme Outcomes (POs) for the selected subject.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mapping scale: <strong className="text-slate-800">0 - No Correlation | 1 - Low | 2 - Moderate | 3 - High</strong></span>
                </div>
              </div>

              {!selectedSubId ? (
                <EmptyState
                  title="No Subject Selected"
                  description="Please select Academic Year, Programme, Semester, and Subject from the header filter to configure PO → CO mappings."
                />
              ) : cos.length === 0 ? (
                <EmptyState
                  title="No Course Outcomes (COs) Found for this Subject"
                  description="Please add Course Outcomes to this subject in Programme Management before configuring PO → CO mappings."
                />
              ) : pos.length === 0 ? (
                <EmptyState
                  title="No Programme Outcomes (POs) Configured"
                  description="Please create Programme Outcomes (POs) for this programme in Tab 1 (GA → PO) or click below to add POs."
                  actionLabel="Add PO"
                  onAction={() => {
                    setEditingPO(null);
                    setPoCode(`PO${pos.length + 1}`);
                    setPoTitle('');
                    setPoDesc('');
                    setPoModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2/3: Matrix Table (Exactly matching user image) */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 text-xs border-b border-slate-200 font-bold">
                          <tr>
                            <th className="p-3.5 w-20 text-slate-900 uppercase tracking-wider">CO</th>
                            <th className="p-3.5 min-w-[220px] text-slate-900 uppercase tracking-wider">COdescription</th>
                            {pos.map((p) => (
                              <th key={p.id} className="p-3 text-center min-w-[120px] bg-slate-50 border-l border-slate-200/60">
                                <div className="font-extrabold text-slate-900 text-xs">{p.poCode}</div>
                                {p.title && <div className="text-[10px] text-slate-500 font-normal truncate max-w-[110px] mx-auto">{p.title}</div>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-medium">
                          {cos.map((co) => (
                            <tr key={co.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* CO Code Pill */}
                              <td className="p-3.5 font-bold align-top">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {co.coCode}
                                </span>
                              </td>

                              {/* CO Description */}
                              <td className="p-3.5 text-slate-800 text-xs font-normal align-top leading-relaxed">
                                {co.description}
                              </td>

                              {/* PO Column Dropdowns */}
                              {pos.map((p) => {
                                const key = `${co.id}_${p.id}`;
                                const currentVal = poCoMatrix[key] ?? 0;

                                return (
                                  <td key={p.id} className="p-3 text-center align-middle border-l border-slate-200/40">
                                    <select
                                      value={currentVal}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPoCoMatrix((prev) => ({ ...prev, [key]: val }));
                                      }}
                                      className={`w-16 px-2.5 py-1.5 rounded-xl text-xs font-bold text-center border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer ${
                                        currentVal > 0
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-extrabold'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                      }`}
                                    >
                                      <option value={0} className="bg-white text-slate-900">0</option>
                                      <option value={1} className="bg-white text-slate-900">1</option>
                                      <option value={2} className="bg-white text-slate-900">2</option>
                                      <option value={3} className="bg-white text-slate-900">3</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right 1/3: Subject Details & Quick Actions Card (Exactly matching image) */}
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      {/* Card Header */}
                      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Subject Details</h3>
                        </div>
                      </div>

                      {/* Detail Key-Value Pairs */}
                      <div className="space-y-2.5 text-xs font-medium">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Programme</span>
                          <span className="font-bold text-slate-900">{selectedProg?.programmeName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Semester</span>
                          <span className="font-bold text-slate-900">{selectedSem?.semesterName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subject</span>
                          <span className="font-bold text-slate-900">{selectedSub?.subjectName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total COs</span>
                          <span className="font-bold text-slate-900">{cos.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total POs</span>
                          <span className="font-bold text-slate-900">{pos.length}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Quick Actions</span>
                        </label>
                        <button
                          disabled={saving}
                          onClick={handleSavePOCOMappings}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Saving...' : 'Save Mapping'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSubId) {
                              OBEStore.getCOPOMappings(selectedSubId).then((mappings) => {
                                const matrix: Record<string, number> = {};
                                mappings.forEach((m) => { matrix[`${m.coId}_${m.poId}`] = m.mappingLevel; });
                                setPoCoMatrix(matrix);
                              });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Changes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Info Card: "How it works?" (Matching image) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  <span>How it works?</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-1">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 mb-0.5">CO Attainment</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        Calculated from CIA, ESE and Course Exit Survey (80% + 20%).
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-auto self-center hidden md:block" />
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 mb-0.5">Apply PO–CO Mapping</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        Use the mapping values (0–3) to calculate PO contribution from each CO.
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-auto self-center hidden md:block" />
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 mb-0.5">Calculate PO Attainment</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        Combine contributions from all subjects to get programme-level PO attainment.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PSO → CO MAPPINGS */}
          {/* ========================================================================= */}
          {activeTab === 'pso_co' && (
            <div className="space-y-6">
              {/* Header Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>PSO → CO Mapping</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Map Course Outcomes (COs) to Program Specific Outcomes (PSOs) for the selected subject.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mapping scale: <strong className="text-slate-800">0 - None | 1 - Low | 2 - Moderate | 3 - High</strong></span>
                  </div>

                  <button
                    disabled={!selectedProgId}
                    onClick={() => {
                      setEditingPSO(null);
                      setPsoCode(`PSO${psos.length + 1}`);
                      setPsoDesc('');
                      setPsoModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add PSO</span>
                  </button>
                </div>
              </div>

              {!selectedSubId ? (
                <EmptyState
                  title="No Subject Selected"
                  description="Please select Academic Year, Programme, Semester, and Subject from the header filter to configure PSO → CO mappings."
                />
              ) : cos.length === 0 ? (
                <EmptyState
                  title="No Course Outcomes (COs) Found for this Subject"
                  description="Please add Course Outcomes to this subject in Programme Management before configuring PSO → CO mappings."
                />
              ) : psos.length === 0 ? (
                <EmptyState
                  title="No Program Specific Outcomes (PSOs) Configured"
                  description="Please create PSOs for this programme by clicking '+ Add PSO' above."
                  actionLabel="Add PSO"
                  onAction={() => {
                    setEditingPSO(null);
                    setPsoCode(`PSO${psos.length + 1}`);
                    setPsoDesc('');
                    setPsoModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2/3: Matrix Table */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 text-xs border-b border-slate-200 font-bold">
                          <tr>
                            <th className="p-3.5 w-20 text-slate-900 uppercase tracking-wider">CO</th>
                            <th className="p-3.5 min-w-[220px] text-slate-900 uppercase tracking-wider">COdescription</th>
                            {psos.map((p) => (
                              <th key={p.id} className="p-3 text-center min-w-[120px] bg-slate-50 border-l border-slate-200/60">
                                <div className="font-extrabold text-slate-900 text-xs">{p.psoCode}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-medium">
                          {cos.map((co) => (
                            <tr key={co.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* CO Code Pill */}
                              <td className="p-3.5 font-bold align-top">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {co.coCode}
                                </span>
                              </td>

                              {/* CO Description */}
                              <td className="p-3.5 text-slate-800 text-xs font-normal align-top leading-relaxed">
                                {co.description}
                              </td>

                              {/* PSO Column Dropdowns */}
                              {psos.map((p) => {
                                const key = `${co.id}_${p.id}`;
                                const currentVal = psoCoMatrix[key] ?? 0;

                                return (
                                  <td key={p.id} className="p-3 text-center align-middle border-l border-slate-200/40">
                                    <select
                                      value={currentVal}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPsoCoMatrix((prev) => ({ ...prev, [key]: val }));
                                      }}
                                      className={`w-16 px-2.5 py-1.5 rounded-xl text-xs font-bold text-center border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer ${
                                        currentVal > 0
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-extrabold'
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                      }`}
                                    >
                                      <option value={0} className="bg-white text-slate-900">0</option>
                                      <option value={1} className="bg-white text-slate-900">1</option>
                                      <option value={2} className="bg-white text-slate-900">2</option>
                                      <option value={3} className="bg-white text-slate-900">3</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right 1/3: Subject Details & Quick Actions */}
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      {/* Card Header */}
                      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Subject Details</h3>
                        </div>
                      </div>

                      {/* Detail Key-Value Pairs */}
                      <div className="space-y-2.5 text-xs font-medium">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Programme</span>
                          <span className="font-bold text-slate-900">{selectedProg?.programmeName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Semester</span>
                          <span className="font-bold text-slate-900">{selectedSem?.semesterName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subject</span>
                          <span className="font-bold text-slate-900">{selectedSub?.subjectName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total COs</span>
                          <span className="font-bold text-slate-900">{cos.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total PSOs</span>
                          <span className="font-bold text-slate-900">{psos.length}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Quick Actions</span>
                        </label>
                        <button
                          disabled={saving}
                          onClick={handleSavePSOCOMappings}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Saving...' : 'Save Mapping'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSubId) {
                              OBEStore.getCOPSOMappings(selectedSubId).then((mappings) => {
                                const matrix: Record<string, number> = {};
                                mappings.forEach((m) => { matrix[`${m.coId}_${m.psoId}`] = m.mappingLevel; });
                                setPsoCoMatrix(matrix);
                              });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Changes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODALS: GA, PO, PSO MANAGERS */}
          {/* ========================================================================= */}

          {/* Add/Edit GA Modal */}
          {gaModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingGA ? 'Edit Graduate Attribute' : 'Add Graduate Attribute'}
                  </h3>
                  <button
                    onClick={() => setGaModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveGA} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GA Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GA1"
                      value={gaCode}
                      onChange={(e) => setGaCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GA Statement / Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Knowledge of discipline and its practical application."
                      value={gaDesc}
                      onChange={(e) => setGaDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* List of existing GAs inside modal */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold uppercase text-slate-500">Existing Graduate Attributes</div>
                    {gas.length === 0 ? (
                      <div className="text-xs text-slate-400">No GAs added yet.</div>
                    ) : (
                      gas.map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <span className="font-bold text-blue-700 font-mono mr-2">{g.code}</span>
                            <span className="text-slate-700">{g.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGA(g);
                                setGaCode(g.code);
                                setGaDesc(g.description);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGA(g.id, g.code)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGaModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Save GA
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add/Edit PO Modal */}
          {poModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPO ? 'Edit Programme Outcome' : 'Add Programme Outcome (PO)'}
                  </h3>
                  <button
                    onClick={() => setPoModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSavePO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PO Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PO1"
                      value={poCode}
                      onChange={(e) => setPoCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PO Short Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Knowledge / Skills / Ethics"
                      value={poTitle}
                      onChange={(e) => setPoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PO Description Statement</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Apply domain knowledge to analyze complex financial and business problems."
                      value={poDesc}
                      onChange={(e) => setPoDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* List of existing POs for selected programme inside modal */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Existing POs for [{selectedProg?.programmeCode}]
                    </div>
                    {pos.length === 0 ? (
                      <div className="text-xs text-slate-400">No POs added yet for this programme.</div>
                    ) : (
                      pos.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <span className="font-bold text-purple-700 font-mono mr-2">{p.poCode}</span>
                            {p.title && <span className="font-semibold text-slate-800 mr-2">({p.title})</span>}
                            <span className="text-slate-600">{p.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPO(p);
                                setPoCode(p.poCode);
                                setPoTitle(p.title || '');
                                setPoDesc(p.description);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePO(p.id, p.poCode)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPoModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Save PO
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add/Edit PSO Modal */}
          {psoModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPSO ? 'Edit Program Specific Outcome' : 'Add Program Specific Outcome (PSO)'}
                  </h3>
                  <button
                    onClick={() => setPsoModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSavePSO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PSO Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PSO1"
                      value={psoCode}
                      onChange={(e) => setPsoCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PSO Statement / Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Apply standard accounting and financial principles to evaluate corporate financial statements."
                      value={psoDesc}
                      onChange={(e) => setPsoDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* List of existing PSOs for selected programme inside modal */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Existing PSOs for [{selectedProg?.programmeCode}]
                    </div>
                    {psos.length === 0 ? (
                      <div className="text-xs text-slate-400">No PSOs added yet for this programme.</div>
                    ) : (
                      psos.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <span className="font-bold text-purple-700 font-mono mr-2">{p.psoCode}</span>
                            <span className="text-slate-700">{p.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPSO(p);
                                setPsoCode(p.psoCode);
                                setPsoDesc(p.description);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePSO(p.id, p.psoCode)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPsoModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
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

export default function OBEMappingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm font-medium">Loading OBE Mapping...</div>}>
      <OBEMappingContent />
    </Suspense>
  );
}
