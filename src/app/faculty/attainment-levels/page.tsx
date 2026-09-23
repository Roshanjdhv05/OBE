'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OBEStore, CourseOutcome, Subject } from '@/lib/store/obe-store';
import { calculateCIACOAttainment } from '@/lib/calculations/cia';
import { calculateDirectAttainment } from '@/lib/calculations/direct';
import { evaluateAttainmentLevel, evaluateCOTargetAchievement } from '@/lib/calculations/attainment-level';
import { Sliders, Save, Info, Target, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

const DEFAULT_CONFIG = {
  id: '',
  academicYearId: '',
  studentTargetPercentage: 50,
  level1Threshold: 50,
  level2Threshold: 60,
  level3Threshold: 70,
  ciaWeight: 0.40,
  eseWeight: 0.60,
  directWeight: 0.80,
  indirectWeight: 0.20,
  surveyMaxScore: 5,
  ciaMaxMarks: 50,
  eseMaxMarks: 50,
  coTargetLevels: {} as Record<string, number>,
};

export default function AttainmentLevelsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [coTargetLevels, setCoTargetLevels] = useState<Record<string, number>>({});
  const [batchLevel, setBatchLevel] = useState<number>(1);
  const [saved, setSaved] = useState(false);

  const [ciaResultsMap, setCiaResultsMap] = useState<Record<string, any[]>>({});
  const [eseResultsMap, setEseResultsMap] = useState<Record<string, any[]>>({});

  // Load subjects for active academic year
  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      if (!year) return;
      const allSubs: Subject[] = [];
      const progs = await OBEStore.getProgrammes(year.id);
      const sems = await OBEStore.getSemesters();
      const subs = await OBEStore.getSubjects();

      progs.forEach((p) => {
        const progSems = sems.filter((s) => s.programmeId === p.id);
        progSems.forEach((s) => {
          const semSubs = subs.filter((sb) => sb.semesterId === s.id);
          semSubs.forEach((sub) => allSubs.push(sub));
        });
      });
      setSubjects(allSubs);
      if (allSubs.length > 0) {
        setSelectedSubjectId(allSubs[0].id);
      }
    };
    load();
  }, []);

  // Load config & COs when selected subject changes
  useEffect(() => {
    const loadSubjectData = async () => {
      if (!selectedSubjectId) {
        setCourseOutcomes([]);
        setCiaResultsMap({});
        setEseResultsMap({});
        return;
      }

      const cos = await OBEStore.getCourseOutcomes(selectedSubjectId);
      setCourseOutcomes(cos);

      const savedConfig = await OBEStore.getCalculationConfig(selectedSubjectId);
      setConfig({
        ...DEFAULT_CONFIG,
        ...savedConfig,
        coTargetLevels: savedConfig.coTargetLevels ?? {},
      });

      const initialTargets: Record<string, number> = {};
      cos.forEach((co) => {
        initialTargets[co.id] = savedConfig.coTargetLevels?.[co.id] ?? 1; // Default Target Level 1
      });
      setCoTargetLevels(initialTargets);

      const ciaAssessments = await OBEStore.getAssessments(selectedSubjectId, 'CIA');
      const eseAssessments = await OBEStore.getAssessments(selectedSubjectId, 'ESE');
      const latestCIA = ciaAssessments[ciaAssessments.length - 1];
      const latestESE = eseAssessments[eseAssessments.length - 1];

      let cRes: any[] = [];
      let eRes: any[] = [];
      if (latestCIA) cRes = await OBEStore.getStudentCoResults(latestCIA.id);
      if (latestESE) eRes = await OBEStore.getStudentCoResults(latestESE.id);

      const cMap: Record<string, any[]> = {};
      const eMap: Record<string, any[]> = {};
      cos.forEach((co) => {
        cMap[co.id] = cRes.filter((r) => r.coId === co.id);
        eMap[co.id] = eRes.filter((r) => r.coId === co.id);
      });
      setCiaResultsMap(cMap);
      setEseResultsMap(eMap);
    };
    loadSubjectData();
  }, [selectedSubjectId]);

  // Set target level for a specific CO
  const handleCOTargetChange = async (coId: string, level: number) => {
    const updated = { ...coTargetLevels, [coId]: level };
    setCoTargetLevels(updated);
    if (selectedSubjectId) {
      const updatedConfig = { ...config, subjectId: selectedSubjectId, coTargetLevels: updated };
      await OBEStore.updateCalculationConfig(updatedConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // Set target level for ALL COs at once and auto-save
  const handleApplyBatchTargetLevel = async () => {
    const updated: Record<string, number> = {};
    courseOutcomes.forEach((co) => {
      updated[co.id] = batchLevel;
    });
    setCoTargetLevels(updated);
    if (selectedSubjectId) {
      const updatedConfig = { ...config, subjectId: selectedSubjectId, coTargetLevels: updated };
      await OBEStore.updateCalculationConfig(updatedConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // Save config to store
  const handleSave = async () => {
    if (!selectedSubjectId) return;

    const updatedConfig = {
      ...config,
      id: config.id || 'cfg-' + selectedSubjectId,
      academicYearId: config.academicYearId || '',
      subjectId: selectedSubjectId,
      coTargetLevels,
    };

    await OBEStore.updateCalculationConfig(updatedConfig);
    setSaved(true);
    await OBEStore.addAuditLog(
      `Updated CO Attainment Thresholds & Target Levels for Subject ID: ${selectedSubjectId}`,
      'Attainment Config'
    );
    setTimeout(() => setSaved(false), 2500);
  };

  // Compute actual attainment per CO for the selected subject
  const computeCOAttainmentData = () => {
    if (!selectedSubjectId || courseOutcomes.length === 0) return [];

    return courseOutcomes.map((co) => {
      let ciaAttainment = 0;
      let eseAttainment = 0;

      const ciaResults = ciaResultsMap[co.id] || [];
      if (ciaResults.length > 0) {
        const attained = ciaResults.filter((r) => r.percentage >= config.studentTargetPercentage).length;
        ciaAttainment = calculateCIACOAttainment(attained, ciaResults.length);
      }

      const eseResults = eseResultsMap[co.id] || [];
      if (eseResults.length > 0) {
        const attained = eseResults.filter((r) => r.percentage >= config.studentTargetPercentage).length;
        eseAttainment = calculateCIACOAttainment(attained, eseResults.length);
      }

      const directAttainment = calculateDirectAttainment(
        ciaAttainment,
        eseAttainment,
        config.ciaWeight,
        config.eseWeight
      );

      const actualLevelResult = evaluateAttainmentLevel(directAttainment, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      const targetLevel = coTargetLevels[co.id] ?? 3;
      const targetAchievement = evaluateCOTargetAchievement(actualLevelResult.levelNumber, targetLevel);

      return {
        coId: co.id,
        coCode: co.coCode,
        description: co.description,
        targetLevel,
        directAttainment,
        actualLevelResult,
        targetAchievement,
      };
    });
  };

  const attainmentRows = computeCOAttainmentData();
  const metCount = attainmentRows.filter((r) => r.targetAchievement.isTargetMet).length;
  const achievementRate = attainmentRows.length > 0 ? ((metCount / attainmentRows.length) * 100).toFixed(0) : '0';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Attainment Levels of COs"
          subtitle="Configure target levels per CO, global level thresholds, and assessment weightages"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Information Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">CO Target Attainment & Level Evaluation</p>
              <p className="font-medium text-blue-800">
                Define the Target Attainment Level for all COs (individually or batch-applied). The system evaluates actual student performance against saved target levels to identify target achievement and gaps.
              </p>
            </div>
          </div>

          {/* Subject Selection Header */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 px-3 py-2 min-w-[280px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {subjects.length === 0 ? (
                    <option value="">No subjects found</option>
                  ) : (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.subjectCode}] {s.subjectName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Quick Metrics Summary */}
            {attainmentRows.length > 0 && (
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Total COs</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{attainmentRows.length}</span>
                </div>
                <div className="w-px h-7 bg-slate-200" />
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Target Met</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {metCount} / {attainmentRows.length}
                  </span>
                </div>
                <div className="w-px h-7 bg-slate-200" />
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Achievement Rate</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{achievementRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Per-CO Target Attainment Levels & Batch Setting */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>CO Target Attainment Levels</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Set target level for all COs at once or customize per individual outcome
                </p>
              </div>

              {/* Batch Target Control */}
              <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 p-2 rounded-xl">
                <span className="text-xs font-bold text-blue-900 ml-1">Set Target Level for ALL COs:</span>
                <select
                  value={batchLevel}
                  onChange={(e) => setBatchLevel(Number(e.target.value))}
                  className="bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 px-2.5 py-1.5 focus:outline-none"
                >
                  <option value={3}>Level 3 (≥ {config.level3Threshold}%)</option>
                  <option value={2}>Level 2 (≥ {config.level2Threshold}%)</option>
                  <option value={1}>Level 1 (≥ {config.level1Threshold}%)</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyBatchTargetLevel}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Apply to All COs
                </button>
              </div>
            </div>

            {/* CO Target Table */}
            {courseOutcomes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                No Course Outcomes found for the selected subject.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3.5 rounded-tl-lg">Course Outcome</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5 text-center">Target Attainment Level</th>
                      <th className="p-3.5 text-center">Actual Attainment %</th>
                      <th className="p-3.5 text-center">Attained Level</th>
                      <th className="p-3.5 text-center rounded-tr-lg">Target Achievement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attainmentRows.map((row) => (
                      <tr key={row.coId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-blue-700">
                          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
                            {row.coCode}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-xs leading-relaxed">{row.description}</td>
                        <td className="p-3.5 text-center">
                          <select
                            value={row.targetLevel}
                            onChange={(e) => handleCOTargetChange(row.coId, Number(e.target.value))}
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value={3}>Level 3 (≥ {config.level3Threshold}%)</option>
                            <option value={2}>Level 2 (≥ {config.level2Threshold}%)</option>
                            <option value={1}>Level 1 (≥ {config.level1Threshold}%)</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800 text-sm">
                          {row.directAttainment > 0 ? `${row.directAttainment}%` : 'N/A'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${row.actualLevelResult.colorClass}`}
                          >
                            {row.actualLevelResult.levelLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs ${row.targetAchievement.badgeColor}`}
                          >
                            {row.targetAchievement.isTargetMet ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            <span>{row.targetAchievement.statusLabel}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Target Threshold */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Student Attainment Target</h3>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum marks percentage a student must achieve for a CO to be counted as attained
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.studentTargetPercentage}
                  onChange={(e) => setConfig({ ...config, studentTargetPercentage: Number(e.target.value) })}
                  className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-sm font-bold text-slate-600">% (Default: 50%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                If a student scores ≥ {config.studentTargetPercentage}% in a CO, the student is counted as having attained that CO.
              </p>
            </div>
          </div>

          {/* Attainment Levels Thresholds */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              CO Attainment Level Thresholds
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure what percentage of students (out of total valid students) must attain the CO for each attainment level to be assigned.
            </p>

            {[
              {
                label: 'Level 1',
                color: 'text-amber-700 bg-amber-50 border-amber-200',
                key: 'level1Threshold' as const,
                desc: 'Minimum attainment level — lowest performance category',
              },
              {
                label: 'Level 2',
                color: 'text-blue-700 bg-blue-50 border-blue-200',
                key: 'level2Threshold' as const,
                desc: 'Moderate attainment — students partially achieving the outcome',
              },
              {
                label: 'Level 3',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                key: 'level3Threshold' as const,
                desc: 'Highest attainment — majority of students strongly achieving the outcome',
              },
            ].map((level) => (
              <div key={level.key} className={`p-4 rounded-xl border ${level.color} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm">{level.label}</span>
                    <p className="text-[11px] font-medium opacity-80 mt-0.5">{level.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">Required students achieving target:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={config[level.key]}
                      onChange={(e) => setConfig({ ...config, [level.key]: Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-sm font-bold">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Assessment Max Marks ("Out of") Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Assessment Maximum Marks ("Out of") Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
                <label className="block text-xs font-bold text-blue-900 mb-1.5">
                  CIA Assessment Max Marks (Out of)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={config.ciaMaxMarks ?? 50}
                    onChange={(e) => setConfig({ ...config, ciaMaxMarks: Number(e.target.value) })}
                    className="w-28 px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-800"
                  />
                  <span className="text-xs text-blue-700 font-semibold">Marks</span>
                </div>
                <p className="text-[10px] text-blue-700 mt-1">Default maximum marks threshold for CIA assessment calculations</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">
                <label className="block text-xs font-bold text-indigo-900 mb-1.5">
                  ESE Assessment Max Marks (Out of)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={config.eseMaxMarks ?? 50}
                    onChange={(e) => setConfig({ ...config, eseMaxMarks: Number(e.target.value) })}
                    className="w-28 px-3 py-2 border border-indigo-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-indigo-800"
                  />
                  <span className="text-xs text-indigo-700 font-semibold">Marks</span>
                </div>
                <p className="text-[10px] text-indigo-700 mt-1">Default maximum marks threshold for ESE assessment calculations</p>
              </div>
            </div>
          </div>

          {/* Weightage Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Assessment & Attainment Weightage Configuration
            </h3>

            {/* Level 1: Assessment Weightage (Direct Attainment components: CIA & ESE) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  1. Direct Attainment Components (CIA + ESE)
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  Enforce: CIA Weight + ESE Weight = 100%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
                  <label className="block text-xs font-bold text-blue-900 mb-1.5">
                    CIA Assessment Weight
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={config.ciaWeight}
                      onChange={(e) => {
                        const val = Math.min(1, Math.max(0, Number(e.target.value)));
                        setConfig({
                          ...config,
                          ciaWeight: Number(val.toFixed(2)),
                          eseWeight: Number((1 - val).toFixed(2)),
                        });
                      }}
                      className="w-24 px-3 py-2 border border-blue-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-sm text-blue-700 font-bold">
                      ({(config.ciaWeight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-700 mt-1">Continuous Internal Assessment share</p>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">
                  <label className="block text-xs font-bold text-indigo-900 mb-1.5">
                    ESE Assessment Weight
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={config.eseWeight}
                      onChange={(e) => {
                        const val = Math.min(1, Math.max(0, Number(e.target.value)));
                        setConfig({
                          ...config,
                          eseWeight: Number(val.toFixed(2)),
                          ciaWeight: Number((1 - val).toFixed(2)),
                        });
                      }}
                      className="w-24 px-3 py-2 border border-indigo-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-sm text-indigo-700 font-bold">
                      ({(config.eseWeight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-700 mt-1">End Semester Examination share</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg border border-slate-200 p-2.5 font-mono font-medium">
                Direct Attainment = (CIA × {(config.ciaWeight * 100).toFixed(0)}%) + (ESE × {(config.eseWeight * 100).toFixed(0)}%)
              </p>
            </div>

            {/* Level 2: Final Attainment Weightage (Direct vs Indirect) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  2. Final CO Attainment (Direct + Indirect)
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  Enforce: Direct Weight + Indirect Weight = 100%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-900 mb-1.5">
                    Direct Attainment Weight
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={config.directWeight}
                      onChange={(e) => {
                        const val = Math.min(1, Math.max(0, Number(e.target.value)));
                        setConfig({
                          ...config,
                          directWeight: Number(val.toFixed(2)),
                          indirectWeight: Number((1 - val).toFixed(2)),
                        });
                      }}
                      className="w-24 px-3 py-2 border border-emerald-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-sm text-emerald-700 font-bold">
                      ({(config.directWeight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1">Direct assessment combination share</p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 mb-1.5">
                    Indirect Attainment Weight (Exit Survey)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={config.indirectWeight}
                      onChange={(e) => {
                        const val = Math.min(1, Math.max(0, Number(e.target.value)));
                        setConfig({
                          ...config,
                          indirectWeight: Number(val.toFixed(2)),
                          directWeight: Number((1 - val).toFixed(2)),
                        });
                      }}
                      className="w-24 px-3 py-2 border border-purple-300 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <span className="text-sm text-purple-700 font-bold">
                      ({(config.indirectWeight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700 mt-1">Course Exit Survey feedback share</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg border border-slate-200 p-2.5 font-mono font-medium">
                Final CO Attainment = (Direct Attainment × {(config.directWeight * 100).toFixed(0)}%) + (Indirect Attainment × {(config.indirectWeight * 100).toFixed(0)}%)
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saved ? 'Target & Attainment Configuration Saved ✓' : 'Save Attainment Configuration'}</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
