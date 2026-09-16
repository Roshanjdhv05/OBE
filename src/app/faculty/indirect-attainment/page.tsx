'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore } from '@/lib/store/obe-store';
import {
  calculateSurveyWeightedAverage,
  calculateIndirectPercentage,
  ResponseBreakdown,
} from '@/lib/calculations/survey';
import { calculateWeightedIndirect } from '@/lib/calculations/indirect';
import { PieChart } from 'lucide-react';

export default function IndirectAttainmentPage() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [indirectData, setIndirectData] = useState<any[]>([]);
  const [indirectWeight, setIndirectWeight] = useState(0.20);

  useEffect(() => {
    const load = async () => {
      const year = await OBEStore.getActiveAcademicYear();
      if (!year) return;
      const allSubs: any[] = [];
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
      if (allSubs.length > 0) setSubjectId(allSubs[0].id);
    };
    load();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!subjectId) { setIndirectData([]); return; }

      const cos = await OBEStore.getCourseOutcomes(subjectId);
      const surveyAssessments = await OBEStore.getAssessments(subjectId, 'COURSE_EXIT_SURVEY');
      const config = await OBEStore.getCalculationConfig(subjectId);
      setIndirectWeight(config.indirectWeight);

      if (surveyAssessments.length === 0) { setIndirectData([]); return; }

      const latestSurvey = surveyAssessments[surveyAssessments.length - 1];
      const responses = await OBEStore.getSurveyResponses(latestSurvey.id);

      const data = cos.map((co) => {
        const coResponses = responses.filter((r) => r.coId === co.id);
        const breakdown: ResponseBreakdown = {
          verySatisfied: 0, satisfied: 0, unsure: 0, dissatisfied: 0, veryDissatisfied: 0
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
        const indirectPct = calculateIndirectPercentage(weightedAvg, config.surveyMaxScore);
        const weightedIndirect = calculateWeightedIndirect(indirectPct, config.indirectWeight);

        return {
          coCode: co.coCode,
          ...breakdown,
          total,
          weightedAvg,
          indirectPct,
          weightedIndirect,
        };
      });

      setIndirectData(data);
    };
    loadData();
  }, [subjectId]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Indirect Attainment"
          subtitle="Course Exit Survey-based Indirect CO Attainment Analysis"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Subject Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 flex-wrap">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Select Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold px-3 py-2 min-w-[280px]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>[{s.subjectCode}] {s.subjectName}</option>
                ))}
              </select>
            </div>
            {indirectData.length > 0 && (
              <div className="ml-auto bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold px-4 py-2 rounded-lg">
                Indirect Weight: {(indirectWeight * 100).toFixed(0)}%
              </div>
            )}
          </div>

          {indirectData.length === 0 ? (
            <EmptyState
              title="No Indirect Attainment data available"
              description="Upload a Course Exit Survey Excel file for the selected subject to calculate Indirect CO Attainment."
              icon={PieChart}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Indirect Attainment — Course Exit Survey Analysis</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formula: Weighted Avg = (Grade1×1 + Grade2×2 + Grade3×3 + Grade4×4 + Grade5×5) / Total &nbsp;|&nbsp; in Percentage = (Weighted Avg / Maximum count) × 100
                </p>
              </div>
              <div className="overflow-x-auto">
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
                      <th className="p-3 text-center">Weighted Avg.</th>
                      <th className="p-3 text-center">Maximum count</th>
                      <th className="p-3 text-center text-purple-300">in Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {indirectData.map((row) => (
                      <tr key={row.coCode} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-purple-700">
                          <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded">{row.coCode}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-emerald-700">{row.verySatisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-blue-700">{row.satisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-amber-700">{row.unsure}</td>
                        <td className="p-3 text-center font-mono font-semibold text-orange-700">{row.dissatisfied}</td>
                        <td className="p-3 text-center font-mono font-semibold text-rose-700">{row.veryDissatisfied}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{row.total}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">{row.weightedAvg}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">5</td>
                        <td className="p-3 text-center font-mono font-black text-purple-800 text-sm">
                          <span className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded">{row.indirectPct}%</span>
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
    </div>
  );
}
