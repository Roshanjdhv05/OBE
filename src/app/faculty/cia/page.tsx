'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { ExcelUploader } from '@/components/excel/ExcelUploader';
import { ExcelPreviewModal } from '@/components/excel/ExcelPreviewModal';
import { OBEStore, AcademicYear, Programme, Semester, Subject } from '@/lib/store/obe-store';
import { ExcelImportPreview } from '@/lib/excel/parser';
import { calculateStudentCOPercentage, evaluateStudentAttainment, calculateCIACOAttainment } from '@/lib/calculations/cia';
import { evaluateAttainmentLevel, DEFAULT_ATTAINMENT_LEVEL_CONFIG } from '@/lib/calculations/attainment-level';
import { FileCheck, CheckCircle2, Users } from 'lucide-react';

export default function CIAPage() {
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedProgId, setSelectedProgId] = useState('');
  const [selectedSemId, setSelectedSemId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');

  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [coSummary, setCoSummary] = useState<any[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>({ studentTargetPercentage: 50, level1Threshold: 60, level2Threshold: 70, level3Threshold: 80 });

  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      setActiveYear(year);
      if (year) {
        const progs = await OBEStore.getProgrammes(year.id);
        setProgrammes(progs);
        if (progs.length > 0) {
          setSelectedProgId(progs[0].id);
        }
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadSems = async () => {
      if (selectedProgId) {
        const sems = await OBEStore.getSemesters(selectedProgId);
        setSemesters(sems);
        if (sems.length > 0) setSelectedSemId(sems[0].id);
      }
    };
    loadSems();
  }, [selectedProgId]);

  useEffect(() => {
    const loadSubs = async () => {
      if (selectedSemId) {
        const subs = await OBEStore.getSubjects(selectedSemId);
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubId(subs[0].id);
      }
    };
    loadSubs();
  }, [selectedSemId]);

  const loadStoredSummary = async (subId: string) => {
    if (!subId) {
      setCoSummary([]);
      return;
    }
    const [config, assessments] = await Promise.all([
      OBEStore.getCalculationConfig(subId),
      OBEStore.getAssessments(subId, 'CIA')
    ]);
    setCurrentConfig(config);
    if (assessments.length === 0) {
      setCoSummary([]);
      return;
    }
    const latest = assessments[assessments.length - 1];
    const [results, cos] = await Promise.all([
      OBEStore.getStudentCoResults(latest.id),
      OBEStore.getCourseOutcomes(subId)
    ]);

    if (cos.length > 0 && results.length > 0) {
      const summary = cos.map((co) => {
        const coResults = results.filter((r) => r.coId === co.id);
        const totalStudents = coResults.length;
        const attainedCount = coResults.filter((r) => r.percentage >= config.studentTargetPercentage).length;
        const noCount = totalStudents - attainedCount;
        const yesPct = calculateCIACOAttainment(attainedCount, totalStudents);
        const noPct = Number(((noCount / Math.max(totalStudents, 1)) * 100).toFixed(2));
        const maxMarks = coResults[0]?.maximumMarks || 10;
        const targetMarks = Number(((config.studentTargetPercentage / 100) * maxMarks).toFixed(1));
        const level = evaluateAttainmentLevel(yesPct, {
          level1: config.level1Threshold,
          level2: config.level2Threshold,
          level3: config.level3Threshold,
        });

        return {
          coCode: co.coCode,
          maxMarks,
          targetMarks,
          totalStudents,
          attainedCount,
          noCount,
          yesPct,
          noPct,
          attainmentPct: yesPct,
          level,
        };
      });

      setCoSummary(summary);
    } else {
      setCoSummary([]);
    }
  };

  useEffect(() => {
    if (selectedSubId) {
      loadStoredSummary(selectedSubId);
    }
  }, [selectedSubId]);

  const handleImportConfirm = async () => {
    if (!preview || !previewFile || !activeYear || !selectedProgId || !selectedSemId || !selectedSubId || isUploading) return;

    try {
      setIsUploading(true);
      await OBEStore.saveAssessmentImport(
        activeYear.id,
        selectedProgId,
        selectedSemId,
        selectedSubId,
        'CIA',
        previewFile.name,
        preview.studentMarks || [],
        preview.detectedCOs
      );

      // Compute live summary directly from parsed preview
      const config = await OBEStore.getCalculationConfig(selectedSubId);
      setCurrentConfig(config);
      const summary = preview.detectedCOs.map((coCode) => {
        let maxMarks = 0;
        const studentResults = (preview.studentMarks || [])
          .map((std) => {
            const marks = std.coMarks[coCode];
            if (marks && marks.max > maxMarks) maxMarks = marks.max;
            if (!marks || marks.obtained === undefined || marks.obtained === null || isNaN(marks.obtained)) return null;
            const pct = calculateStudentCOPercentage(marks.obtained, marks.max);
            return { attained: evaluateStudentAttainment(pct, config.studentTargetPercentage) };
          })
          .filter((r): r is { attained: boolean } => r !== null);

        const attainedCount = studentResults.filter((r) => r.attained).length;
        const totalStudents = studentResults.length;
        const noCount = totalStudents - attainedCount;
        const yesPct = calculateCIACOAttainment(attainedCount, totalStudents);
        const noPct = Number(((noCount / Math.max(totalStudents, 1)) * 100).toFixed(2));
        const targetMarks = Number(((config.studentTargetPercentage / 100) * (maxMarks || 10)).toFixed(1));
        const level = evaluateAttainmentLevel(yesPct, {
          level1: config.level1Threshold,
          level2: config.level2Threshold,
          level3: config.level3Threshold,
        });

        return {
          coCode,
          maxMarks: maxMarks || 10,
          targetMarks,
          totalStudents,
          attainedCount,
          noCount,
          yesPct,
          noPct,
          attainmentPct: yesPct,
          level,
        };
      });

      setCoSummary(summary);
      setPreview(null);
      setPreviewFile(null);
      setImportSuccess(true);
    } catch (err) {
      console.error('Failed to import assessment:', err);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="CIA — Continuous Internal Assessment"
          subtitle="Upload CIA Excel spreadsheet to calculate student CO attainment"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Context Selectors */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Select Assessment Context
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Programme</label>
                <select
                  value={selectedProgId}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2"
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.programmeCode}] {p.programmeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Semester</label>
                <select
                  value={selectedSemId}
                  onChange={(e) => setSelectedSemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.semesterName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Subject</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.subjectCode}] {sub.subjectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          {selectedSubId ? (
            <ExcelUploader
              assessmentType="CIA"
              onParsedPreview={(p, f) => {
                setPreview(p);
                setPreviewFile(f);
                setImportSuccess(false);
                setCoSummary([]);
              }}
            />
          ) : (
            <EmptyState
              title="Select a Subject to Upload CIA Assessment"
              description="Please select an Academic Year, Programme, Semester, and Subject above to proceed with uploading a CIA Excel file."
              icon={FileCheck}
            />
          )}

          {/* Import Success Summary */}
          {coSummary.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CIA Attainment Table</h3>
                    <p className="text-xs text-slate-500">Student Target: {currentConfig.studentTargetPercentage}% marks threshold per CO</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3">CO</th>
                      <th className="p-3 text-center">Out of</th>
                      <th className="p-3 text-center">Target (≥ {currentConfig.studentTargetPercentage}%)</th>
                      <th className="p-3 text-center">Total Students</th>
                      <th className="p-3 text-center">YES (Scored ≥ Target)</th>
                      <th className="p-3 text-center">YES %</th>
                      <th className="p-3 text-center">NO (Scored &lt; Target)</th>
                      <th className="p-3 text-center">NO %</th>
                      <th className="p-3 text-center">CIA Attainment %</th>
                      <th className="p-3 text-center">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {coSummary.map((co) => (
                      <tr key={co.coCode} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                            {co.coCode}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">{co.maxMarks}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{co.targetMarks}</td>
                        <td className="p-3 text-center font-mono font-semibold">{co.totalStudents}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/50">{co.attainedCount}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700">{co.yesPct}%</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600 bg-rose-50/50">{co.noCount}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-700">{co.noPct}%</td>
                        <td className="p-3 text-center font-mono font-black text-slate-900 text-sm bg-slate-50">
                          {co.attainmentPct}%
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${co.level.colorClass}`}>
                            {co.level.levelLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Excel Preview Modal */}
      {preview && previewFile && (
        <ExcelPreviewModal
          preview={preview}
          fileName={previewFile.name}
          onConfirm={handleImportConfirm}
          onCancel={() => { setPreview(null); setPreviewFile(null); }}
          isSubmitting={isUploading}
        />
      )}
    </div>
  );
}
