'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore, Assessment, CourseOutcome } from '@/lib/store/obe-store';
import { calculateCIACOAttainment, calculateStudentCOPercentage, evaluateStudentAttainment } from '@/lib/calculations/cia';
import { evaluateAttainmentLevel, DEFAULT_ATTAINMENT_LEVEL_CONFIG } from '@/lib/calculations/attainment-level';
import { AttainmentChart } from '@/components/charts/AttainmentChart';
import { BarChart3, Users, Target } from 'lucide-react';

export default function COAttainmentAnalysisPage() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [coAnalysis, setCoAnalysis] = useState<any[]>([]);

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
      if (allSubs.length > 0) {
        setSubjectId(allSubs[0].id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!subjectId) { setCoAnalysis([]); return; }

      const cos = await OBEStore.getCourseOutcomes(subjectId);
      const ciaAssessments = await OBEStore.getAssessments(subjectId, 'CIA');

      if (ciaAssessments.length === 0) { setCoAnalysis([]); return; }

      const latestCIA = ciaAssessments[ciaAssessments.length - 1];
      const results = await OBEStore.getStudentCoResults(latestCIA.id);
      const config = await OBEStore.getCalculationConfig(subjectId);

      const analysis = cos.map((co) => {
        const coResults = results.filter((r) => r.coId === co.id);
        const totalStudents = coResults.length;
        const attainedCount = coResults.filter((r) => r.attained).length;
        const noCount = totalStudents - attainedCount;
        const attainmentPct = calculateCIACOAttainment(attainedCount, totalStudents);
        const noPct = Number(((noCount / Math.max(totalStudents, 1)) * 100).toFixed(2));
        const level = evaluateAttainmentLevel(attainmentPct, {
          level1: config.level1Threshold,
          level2: config.level2Threshold,
          level3: config.level3Threshold,
        });

        return {
          coCode: co.coCode,
          description: co.description,
          totalStudents,
          attainedCount,
          noCount,
          yesPct: attainmentPct,
          noPct,
          attainmentPercentage: attainmentPct,
          level,
        };
      });

      setCoAnalysis(analysis);
    };
    loadAnalysis();
  }, [subjectId]);

  const chartData = coAnalysis.map((c) => ({
    coCode: c.coCode,
    ciaAttainment: c.attainmentPercentage,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="CO Attainment Analysis"
          subtitle="Course Outcome wise student attainment breakdown, levels and percentage analysis"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Subject Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Select Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold px-3 py-2 min-w-[280px]"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects configured</option>
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

          {coAnalysis.length === 0 ? (
            <EmptyState
              title="No CO attainment data available"
              description="Upload a CIA Excel file for the selected subject to generate CO Attainment Analysis."
              icon={BarChart3}
            />
          ) : (
            <>
              {/* CO Analysis Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900">CO-wise Attainment Summary (CIA Assessment)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Based on latest uploaded CIA assessment data.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-semibold">
                      <tr>
                        <th className="p-4">Course Outcome</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-center">Total Students</th>
                        <th className="p-4 text-center">YES (≥ Target)</th>
                        <th className="p-4 text-center">YES %</th>
                        <th className="p-4 text-center">NO (&lt; Target)</th>
                        <th className="p-4 text-center">NO %</th>
                        <th className="p-4 text-center">CIA Attainment %</th>
                        <th className="p-4 text-center">Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {coAnalysis.map((row) => (
                        <tr key={row.coCode} className="hover:bg-slate-50">
                          <td className="p-4 font-mono font-bold text-blue-700">
                            <span className="inline-block px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
                              {row.coCode}
                            </span>
                          </td>
                          <td className="p-4 text-slate-700 max-w-xs">{row.description}</td>
                          <td className="p-4 text-center font-mono font-semibold text-slate-700">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {row.totalStudents}
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-700">{row.attainedCount}</td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-700">{row.yesPct}%</td>
                          <td className="p-4 text-center font-mono font-bold text-rose-600">{row.noCount}</td>
                          <td className="p-4 text-center font-mono font-bold text-rose-600">{row.noPct}%</td>
                          <td className="p-4 text-center font-mono font-black text-slate-900 text-sm">
                            {row.attainmentPercentage}%
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${row.level.colorClass}`}>
                              {row.level.levelLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <AttainmentChart
                  title="CIA CO Attainment Percentage by Course Outcome"
                  data={chartData}
                  type="cia_ese"
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
