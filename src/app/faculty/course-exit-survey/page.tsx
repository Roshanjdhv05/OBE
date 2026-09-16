'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { ExcelUploader } from '@/components/excel/ExcelUploader';
import { ExcelPreviewModal } from '@/components/excel/ExcelPreviewModal';
import { OBEStore, AcademicYear, Programme, Semester, Subject } from '@/lib/store/obe-store';
import { ExcelImportPreview } from '@/lib/excel/parser';
import {
  normalizeSurveyResponse,
  calculateSurveyWeightedAverage,
  calculateIndirectPercentage,
  ResponseBreakdown,
} from '@/lib/calculations/survey';
import { CheckCircle2, MessageCircle } from 'lucide-react';

export default function CourseExitSurveyPage() {
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
  const [surveyCoSummary, setSurveyCoSummary] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      setActiveYear(year);
      if (year) {
        const progs = await OBEStore.getProgrammes(year.id);
        setProgrammes(progs);
        if (progs.length > 0) setSelectedProgId(progs[0].id);
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
      setSurveyCoSummary([]);
      return;
    }
    const assessments = await OBEStore.getAssessments(subId, 'COURSE_EXIT_SURVEY');
    if (assessments.length === 0) {
      setSurveyCoSummary([]);
      return;
    }
    const latest = assessments[assessments.length - 1];
    const responses = await OBEStore.getSurveyResponses(latest.id);
    const cos = await OBEStore.getCourseOutcomes(subId);

    if (cos.length > 0 && responses.length > 0) {
      const summary = cos.map((co) => {
        const coResponses = responses.filter((r) => r.coId === co.id);
        const breakdown: ResponseBreakdown = {
          verySatisfied: 0,
          satisfied: 0,
          unsure: 0,
          dissatisfied: 0,
          veryDissatisfied: 0,
        };

        coResponses.forEach((r) => {
          if (r.score === 1) breakdown.verySatisfied++;
          else if (r.score === 2) breakdown.satisfied++;
          else if (r.score === 3) breakdown.unsure++;
          else if (r.score === 4) breakdown.dissatisfied++;
          else if (r.score === 5) breakdown.veryDissatisfied++;
        });

        const total = coResponses.length;
        const weightedAvg = calculateSurveyWeightedAverage(breakdown);
        const indirectPct = calculateIndirectPercentage(weightedAvg);

        return {
          coCode: co.coCode,
          breakdown,
          total,
          weightedAvg,
          indirectPct,
        };
      });

      setSurveyCoSummary(summary);
    } else {
      setSurveyCoSummary([]);
    }
  };

  useEffect(() => {
    if (selectedSubId) {
      loadStoredSummary(selectedSubId);
    }
  }, [selectedSubId]);

  const handleImportConfirm = async () => {
    if (!preview || !previewFile || !activeYear || !selectedProgId || !selectedSemId || !selectedSubId) return;

    await OBEStore.saveAssessmentImport(
      activeYear.id,
      selectedProgId,
      selectedSemId,
      selectedSubId,
      'COURSE_EXIT_SURVEY',
      previewFile.name,
      preview.surveyRecords || [],
      preview.detectedCOs
    );

    const coSummary = preview.detectedCOs.map((coCode) => {
      const breakdown: ResponseBreakdown = {
        verySatisfied: 0,
        satisfied: 0,
        unsure: 0,
        dissatisfied: 0,
        veryDissatisfied: 0,
      };

      (preview.surveyRecords || []).forEach((rec) => {
        const resp = rec.coResponses[coCode];
        if (!resp) return;
        const score = resp.score;
        if (score === 1) breakdown.verySatisfied++;
        else if (score === 2) breakdown.satisfied++;
        else if (score === 3) breakdown.unsure++;
        else if (score === 4) breakdown.dissatisfied++;
        else if (score === 5) breakdown.veryDissatisfied++;
      });

      const total =
        breakdown.verySatisfied +
        breakdown.satisfied +
        breakdown.unsure +
        breakdown.dissatisfied +
        breakdown.veryDissatisfied;
      const weightedAvg = calculateSurveyWeightedAverage(breakdown);
      const indirectPct = calculateIndirectPercentage(weightedAvg);

      return {
        coCode,
        breakdown,
        total,
        weightedAvg,
        indirectPct,
      };
    });

    setSurveyCoSummary(coSummary);
    setPreview(null);
    setPreviewFile(null);
    setImportSuccess(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Course Exit Survey"
          subtitle="Upload student Course Exit Survey responses to calculate Indirect CO Attainment"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Context Selectors */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              Select Assessment Context
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Programme</label>
                <select value={selectedProgId} onChange={(e) => setSelectedProgId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2">
                  {programmes.map((p) => (<option key={p.id} value={p.id}>[{p.programmeCode}] {p.programmeName}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Semester</label>
                <select value={selectedSemId} onChange={(e) => setSelectedSemId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2">
                  {semesters.map((s) => (<option key={s.id} value={s.id}>{s.semesterName}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Subject</label>
                <select value={selectedSubId} onChange={(e) => setSelectedSubId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2">
                  {subjects.map((sub) => (<option key={sub.id} value={sub.id}>[{sub.subjectCode}] {sub.subjectName}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Survey Response Scale */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-bold text-purple-900 mb-2">Survey Response Scale Mapping:</p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              {[
                { label: 'Very Satisfied', score: 1, color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
                { label: 'Satisfied', score: 2, color: 'text-blue-700 bg-blue-100 border-blue-200' },
                { label: 'Unsure', score: 3, color: 'text-amber-700 bg-amber-100 border-amber-200' },
                { label: 'Dissatisfied', score: 4, color: 'text-orange-700 bg-orange-100 border-orange-200' },
                { label: 'Very Dissatisfied', score: 5, color: 'text-rose-700 bg-rose-100 border-rose-200' },
              ].map((item) => (
                <span key={item.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${item.color}`}>
                  {item.label} = {item.score}
                </span>
              ))}
            </div>
          </div>

          {selectedSubId ? (
            <ExcelUploader
              assessmentType="COURSE_EXIT_SURVEY"
              onParsedPreview={(p, f) => {
                setPreview(p);
                setPreviewFile(f);
                setImportSuccess(false);
                setSurveyCoSummary([]);
              }}
            />
          ) : (
            <EmptyState
              title="Select a Subject first"
              description="Please select Programme, Semester, and Subject context to upload the Course Exit Survey."
              icon={MessageCircle}
            />
          )}

          {surveyCoSummary.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Course Exit Survey — Response Summary</h3>
                    <p className="text-xs text-slate-500">Response counts per grade level per CO. Weighted averages and Indirect Attainment % are shown on the Indirect Attainment page.</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3">CO</th>
                      <th className="p-3 text-center text-emerald-300">No. of grade 1</th>
                      <th className="p-3 text-center text-blue-300">No. of grade 2</th>
                      <th className="p-3 text-center text-amber-300">No. of grade 3</th>
                      <th className="p-3 text-center text-orange-300">No. of grade 4</th>
                      <th className="p-3 text-center text-rose-300">No. of grade 5</th>
                      <th className="p-3 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {surveyCoSummary.map((co) => (
                      <tr key={co.coCode} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-purple-700">
                          <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded">
                            {co.coCode}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-emerald-700">{co.breakdown.verySatisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-blue-700">{co.breakdown.satisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-amber-700">{co.breakdown.unsure}</td>
                        <td className="p-3 text-center font-mono font-semibold text-orange-700">{co.breakdown.dissatisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-rose-700">{co.breakdown.veryDissatisfied}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{co.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {preview && previewFile && (
        <ExcelPreviewModal
          preview={preview}
          fileName={previewFile.name}
          onConfirm={handleImportConfirm}
          onCancel={() => { setPreview(null); setPreviewFile(null); }}
        />
      )}
    </div>
  );
}
