'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, Assessment, CourseOutcome } from '@/lib/store/obe-store';
import { calculateCIACOAttainment } from '@/lib/calculations/cia';
import { calculateDirectAttainment, calculateWeightedDirect } from '@/lib/calculations/direct';
import { AttainmentChart } from '@/components/charts/AttainmentChart';
import { TrendingUp, Info } from 'lucide-react';

export default function DirectAttainmentPage() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [directData, setDirectData] = useState<any[]>([]);
  const [weights, setWeights] = useState({ ciaWeight: 0.40, eseWeight: 0.60, directWeight: 0.80 });

  const [currentConfig, setCurrentConfig] = useState<any>({ studentTargetPercentage: 50 });

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
      if (!subjectId) { setDirectData([]); return; }

      const cos = await OBEStore.getCourseOutcomes(subjectId);
      const ciaAssessments = await OBEStore.getAssessments(subjectId, 'CIA');
      const eseAssessments = await OBEStore.getAssessments(subjectId, 'ESE');
      const config = await OBEStore.getCalculationConfig(subjectId);
      setCurrentConfig(config);
      const ciaW = config.ciaWeight ?? 0.40;
      const eseW = config.eseWeight ?? 0.60;
      const directW = config.directWeight ?? 0.80;

      setWeights({ ciaWeight: ciaW, eseWeight: eseW, directWeight: directW });

      if (ciaAssessments.length === 0 && eseAssessments.length === 0) {
        setDirectData([]);
        return;
      }

      const latestCIA = ciaAssessments[ciaAssessments.length - 1];
      const latestESE = eseAssessments[eseAssessments.length - 1];

      let ciaResultsAll: any[] = [];
      let eseResultsAll: any[] = [];
      if (latestCIA) {
        ciaResultsAll = await OBEStore.getStudentCoResults(latestCIA.id);
      }
      if (latestESE) {
        eseResultsAll = await OBEStore.getStudentCoResults(latestESE.id);
      }

      const data = cos.map((co) => {
        let ciaAttainment = 0;
        let eseAttainment = 0;

        if (latestCIA) {
          const ciaResults = ciaResultsAll.filter((r) => r.coId === co.id);
          const attained = ciaResults.filter((r) => r.percentage >= config.studentTargetPercentage).length;
          ciaAttainment = calculateCIACOAttainment(attained, ciaResults.length);
        }

        if (latestESE) {
          const eseResults = eseResultsAll.filter((r) => r.coId === co.id);
          const attained = eseResults.filter((r) => r.percentage >= config.studentTargetPercentage).length;
          eseAttainment = calculateCIACOAttainment(attained, eseResults.length);
        }

        const average4060 = Number(((ciaAttainment * ciaW) + (eseAttainment * eseW)).toFixed(2));
        const ciaContrib = Number((ciaAttainment * ciaW).toFixed(2));
        const eseContrib = Number((eseAttainment * eseW).toFixed(2));
        const finalWeighted = Number((ciaContrib + eseContrib).toFixed(2));
        const isTargetMet = finalWeighted >= config.studentTargetPercentage;

        return {
          coCode: co.coCode,
          ciaAttainment,
          eseAttainment,
          average5050: average4060,
          ciaContrib,
          eseContrib,
          finalWeighted,
          isTargetMet,
          directAttainment: finalWeighted,
        };
      });

      setDirectData(data);
    };
    loadData();
  }, [subjectId]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Direct Attainment"
          subtitle="CO-wise Direct Attainment combining CIA (40%) and ESE (60%) assessments"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* Subject Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 flex-wrap">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <TrendingUp className="w-5 h-5" />
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
            {directData.length > 0 && (
              <div className="ml-auto bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Weighted Attainment = (CIA × {(weights.ciaWeight * 100).toFixed(0)}%) + (ESE × {(weights.eseWeight * 100).toFixed(0)}%) | Benchmark Target: {currentConfig.studentTargetPercentage}%</span>
              </div>
            )}
          </div>

          {directData.length === 0 ? (
            <EmptyState
              title="No Direct Attainment data available"
              description="Upload both CIA and ESE Excel files for the selected subject to calculate Direct Attainment."
              icon={TrendingUp}
            />
          ) : (
            <>
              {/* Direct Attainment Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Direct Attainment — CO-wise Breakdown</h3>
                    <p className="text-xs text-slate-500">Calculated using CIA ({weights.ciaWeight * 100}%) and ESE ({weights.eseWeight * 100}%) weighted components</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-semibold">
                      <tr>
                        <th className="p-4">CO</th>
                        <th className="p-4 text-center">CIA Attainment %</th>
                        <th className="p-4 text-center">ESE Attainment %</th>
                        <th className="p-4 text-center">Average (40/60)</th>
                        <th className="p-4 text-center">CIA × {(weights.ciaWeight * 100).toFixed(0)}%</th>
                        <th className="p-4 text-center">ESE × {(weights.eseWeight * 100).toFixed(0)}%</th>
                        <th className="p-4 text-center">Final Weighted Attainment %</th>
                        <th className="p-4 text-center">Target Status (≥ {currentConfig.studentTargetPercentage}%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {directData.map((row) => (
                        <tr key={row.coCode} className="hover:bg-slate-50">
                          <td className="p-4 font-mono font-bold text-blue-700">
                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded text-sm">{row.coCode}</span>
                          </td>
                          <td className="p-4 text-center font-mono font-semibold text-slate-700">{row.ciaAttainment}%</td>
                          <td className="p-4 text-center font-mono font-semibold text-slate-700">{row.eseAttainment}%</td>
                          <td className="p-4 text-center font-mono text-slate-500">{row.average5050}%</td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-700">{row.ciaContrib}%</td>
                          <td className="p-4 text-center font-mono font-bold text-blue-700">{row.eseContrib}%</td>
                          <td className="p-4 text-center font-mono font-black text-slate-900 text-base bg-slate-50">
                            <span className="inline-block px-3 py-1 bg-white border border-slate-300 rounded shadow-xs">{row.finalWeighted}%</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                              row.isTargetMet
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {row.isTargetMet ? 'Target Met' : 'Target Not Met'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chart */}
              <AttainmentChart
                title="CIA vs ESE Attainment Comparison"
                data={directData}
                type="cia_ese"
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
