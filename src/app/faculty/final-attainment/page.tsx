'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { OBEStore } from '@/lib/store/obe-store';
import { calculateCIACOAttainment } from '@/lib/calculations/cia';
import { calculateDirectAttainment, calculateWeightedDirect } from '@/lib/calculations/direct';
import { calculateSurveyWeightedAverage, calculateIndirectPercentage, ResponseBreakdown } from '@/lib/calculations/survey';
import { calculateWeightedIndirect } from '@/lib/calculations/indirect';
import { calculateFinalAttainment, calculateCOAttainmentScore } from '@/lib/calculations/final';
import { evaluateAttainmentLevel, evaluateCOTargetAchievement } from '@/lib/calculations/attainment-level';
import { generateCOInterpretation } from '@/lib/calculations/interpretation';
import { AttainmentChart } from '@/components/charts/AttainmentChart';
import { Sparkles, RefreshCcw, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export default function FinalAttainmentPage() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [finalData, setFinalData] = useState<any[]>([]);
  const [weights, setWeights] = useState({ ciaWeight: 0.50, eseWeight: 0.50, directWeight: 0.80, indirectWeight: 0.20 });
  const [recalculating, setRecalculating] = useState(false);
  const [subjectInfo, setSubjectInfo] = useState<any>(null);

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
          semSubs.forEach((sub) => allSubs.push({ ...sub, semName: s.semesterName, progName: p.programmeName }));
        });
      });
      setSubjects(allSubs);
      if (allSubs.length > 0) setSubjectId(allSubs[0].id);
    };
    load();
  }, []);

  const computeFinalData = async (subId: string) => {
    if (!subId) { setFinalData([]); return; }

    const cos = await OBEStore.getCourseOutcomes(subId);
    const ciaAssessments = await OBEStore.getAssessments(subId, 'CIA');
    const eseAssessments = await OBEStore.getAssessments(subId, 'ESE');
    const surveyAssessments = await OBEStore.getAssessments(subId, 'COURSE_EXIT_SURVEY');
    const config = await OBEStore.getCalculationConfig(subId);
    const ciaW = config.ciaWeight ?? 0.50;
    const eseW = config.eseWeight ?? 0.50;
    const directW = config.directWeight ?? 0.80;
    const indirectW = config.indirectWeight ?? 0.20;

    setWeights({ ciaWeight: ciaW, eseWeight: eseW, directWeight: directW, indirectWeight: indirectW });

    const latestCIA = ciaAssessments[ciaAssessments.length - 1];
    const latestESE = eseAssessments[eseAssessments.length - 1];
    const latestSurvey = surveyAssessments[surveyAssessments.length - 1];

    if (!latestCIA && !latestESE) { setFinalData([]); return; }

    let ciaResultsAll: any[] = [];
    let eseResultsAll: any[] = [];
    let surveyResponsesAll: any[] = [];

    if (latestCIA) ciaResultsAll = await OBEStore.getStudentCoResults(latestCIA.id);
    if (latestESE) eseResultsAll = await OBEStore.getStudentCoResults(latestESE.id);
    if (latestSurvey) surveyResponsesAll = await OBEStore.getSurveyResponses(latestSurvey.id);

    const data = cos.map((co) => {
      let ciaAttainment = 0;
      let eseAttainment = 0;
      let indirectPct = 0;

      // CIA — full precision
      if (latestCIA) {
        const ciaResults = ciaResultsAll.filter((r) => r.coId === co.id);
        const attained = ciaResults.filter((r) => r.attained).length;
        ciaAttainment = calculateCIACOAttainment(attained, ciaResults.length);
      }

      // ESE — full precision
      if (latestESE) {
        const eseResults = eseResultsAll.filter((r) => r.coId === co.id);
        const attained = eseResults.filter((r) => r.attained).length;
        eseAttainment = calculateCIACOAttainment(attained, eseResults.length);
      }

      // Indirect — full precision
      if (latestSurvey) {
        const responses = surveyResponsesAll.filter((r) => r.coId === co.id);
        const breakdown: ResponseBreakdown = { verySatisfied: 0, satisfied: 0, unsure: 0, dissatisfied: 0, veryDissatisfied: 0 };
        responses.forEach((r) => {
          if (r.score === 1) breakdown.verySatisfied++;
          else if (r.score === 2) breakdown.satisfied++;
          else if (r.score === 3) breakdown.unsure++;
          else if (r.score === 4) breakdown.dissatisfied++;
          else if (r.score === 5) breakdown.veryDissatisfied++;
        });
        const wavg = calculateSurveyWeightedAverage(breakdown);
        indirectPct = calculateIndirectPercentage(wavg, config.surveyMaxScore);
      }

      // All intermediate values are full-precision floats — only round at the final step
      const directRaw = calculateDirectAttainment(ciaAttainment, eseAttainment, ciaW, eseW);
      const weightedDirectRaw = calculateWeightedDirect(directRaw, directW);
      const weightedIndirectRaw = calculateWeightedIndirect(indirectPct, indirectW);
      const finalAttainment = calculateFinalAttainment(weightedDirectRaw, weightedIndirectRaw);

      const attainmentScore = calculateCOAttainmentScore(finalAttainment);
      const level = evaluateAttainmentLevel(finalAttainment, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });
      const interpretation = generateCOInterpretation(finalAttainment, co.coCode);
      const targetLevel = config.coTargetLevels?.[co.id] ?? 1;
      const targetAchievement = evaluateCOTargetAchievement(level.levelNumber, targetLevel);

      return {
        coCode: co.coCode,
        description: co.description,
        // Display-rounded values (2dp)
        ciaAttainment: Number(ciaAttainment.toFixed(2)),
        eseAttainment: Number(eseAttainment.toFixed(2)),
        directAttainment: Number(directRaw.toFixed(2)),
        indirectAttainment: Number(indirectPct.toFixed(2)),
        weightedDirect: Number(weightedDirectRaw.toFixed(2)),
        weightedIndirect: Number(weightedIndirectRaw.toFixed(2)),
        finalAttainment,   // already rounded in calculateFinalAttainment
        attainmentScore,
        level,
        interpretation,
        targetLevel,
        targetAchievement,
      };
    });

    setFinalData(data);
  };

  useEffect(() => {
    const sub = subjects.find((s) => s.id === subjectId);
    setSubjectInfo(sub ?? null);
    computeFinalData(subjectId);
  }, [subjectId]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    await OBEStore.addAuditLog(`Recalculated Final Attainment for Subject ID: ${subjectId}`, 'Final Attainment');
    await computeFinalData(subjectId);
    setTimeout(() => setRecalculating(false), 600);
  };

  const [downloading, setDownloading] = useState(false);

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error('Failed to load PDF library'));
      document.body.appendChild(script);
    });
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const html2pdf = await loadHtml2Pdf();

      const year = await OBEStore.getActiveAcademicYear();
      const users = await OBEStore.getUsers();
      const faculty = users.find((u) => u.role === 'faculty');
      const facultyName = faculty?.displayName ?? 'Prof. ABC';


      const container = document.createElement('div');
      container.style.width = '794px';
      container.style.padding = '0';
      container.style.background = '#ffffff';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';
      container.style.fontSize = '11px';
      container.style.color = '#1e293b';

      container.innerHTML = `
        <div style="background: #0b1528; color: #ffffff; padding: 24px 32px;">
          <h1 style="font-size: 20px; font-weight: 900; letter-spacing: 0.6px; margin: 0 0 8px 0; text-transform: uppercase; color: #ffffff; line-height: 1.2;">OUTCOME BASED EDUCATION (OBE) REPORT</h1>
          <p style="font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 0; text-transform: uppercase; color: #f59e0b;">NATIONAL ASSESSMENT AND ACCREDITATION COUNCIL (NAAC) COMPLIANT</p>
        </div>

        <div style="padding: 28px 32px;">
          <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 14px; padding-bottom: 5px; border-bottom: 2px solid #1e40af;">1. COURSE DETAILS</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 11px;">
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a; width: 140px;">Course Name:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600; width: 210px;">${subjectInfo?.subjectName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a; width: 140px;">Subject Code:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${subjectInfo?.subjectCode ?? 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Programme:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${subjectInfo?.progName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Semester:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${subjectInfo?.semName ?? 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Academic Year:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${year?.yearName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Faculty Assigned:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${facultyName}</td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 14px; padding-bottom: 5px; border-bottom: 2px solid #1e40af;">2. FINAL COURSE OUTCOME ATTAINMENT SUMMARY</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 60px;">
            <thead>
              <tr style="background: #2563eb; color: #ffffff;">
                <th style="width: 7%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">CO</th>
                <th style="width: 10%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Direct</th>
                <th style="width: 12%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Direct 80%</th>
                <th style="width: 10%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Indirect</th>
                <th style="width: 12%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Indirect 20%</th>
                <th style="width: 11%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Final %</th>
                <th style="width: 38%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              ${finalData.map((row, idx) => `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.coCode}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">${row.directAttainment.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.weightedDirect.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">${row.indirectAttainment.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.weightedIndirect.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.finalAttainment.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569; font-size: 10px; line-height: 1.5;">${row.interpretation.narrative}</td>
              </tr>`).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 80px; padding: 0 10px;">
            <div style="min-width: 200px;">
              <div style="border-top: 1.5px solid #64748b; width: 200px; margin-bottom: 8px;"></div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Course Faculty Signature</div>
            </div>
            <div style="min-width: 200px;">
              <div style="border-top: 1.5px solid #64748b; width: 200px; margin-bottom: 8px;"></div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">HOD / Dean Signature</div>
            </div>
          </div>
        </div>
      `;

      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const filename = `OBE_Report_${subjectInfo?.subjectCode ?? 'Summary'}.pdf`;
      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const worker = html2pdf().set(opt).from(container);
      const pdfBlob = await worker.output('blob');
      
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const chartData = finalData.map((d) => ({
    coCode: d.coCode,
    finalAttainment: d.finalAttainment,
    directAttainment: d.weightedDirect,
    indirectAttainment: d.weightedIndirect,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Final CO Attainment"
          subtitle="Combined Direct (80%) + Indirect (20%) Attainment with CO-level interpretation and scores"
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Subject Selector & Actions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Sparkles className="w-5 h-5" />
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
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono">
                Direct: CIA×{(weights.ciaWeight * 100).toFixed(0)}% + ESE×{(weights.eseWeight * 100).toFixed(0)}% | Final: Direct×{(weights.directWeight * 100).toFixed(0)}% + Indirect×{(weights.indirectWeight * 100).toFixed(0)}%
              </div>
              <button
                onClick={handleRecalculate}
                disabled={recalculating || finalData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <RefreshCcw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                <span>Recalculate</span>
              </button>
              {finalData.length > 0 && (
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>{downloading ? 'Downloading PDF...' : 'Download Report'}</span>
                </button>
              )}
            </div>
          </div>

          {finalData.length === 0 ? (
            <EmptyState
              title="No Final Attainment data available"
              description="Upload CIA, ESE, and Course Exit Survey files for the selected subject to calculate Final CO Attainment."
              icon={Sparkles}
            />
          ) : (
            <>
              {/* Formula Legend */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs font-medium text-indigo-900">
                <span className="font-bold">Formula: </span>
                Direct Attainment = (CIA% × {(weights.ciaWeight * 100).toFixed(0)}%) + (ESE% × {(weights.eseWeight * 100).toFixed(0)}%)
                &nbsp;→&nbsp;
                <span className="font-bold">
                  Final CO Attainment = (Direct × {(weights.directWeight * 100).toFixed(0)}%) + (Indirect% × {(weights.indirectWeight * 100).toFixed(0)}%)
                </span>
                &nbsp;— rounding applied only at final step.
              </div>

              {/* Final Attainment Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-900 text-white">
                  <h3 className="text-sm font-bold">Final CO Attainment — Complete Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-white font-semibold">
                      <tr>
                        <th className="p-3.5">CO</th>
                        <th className="p-3.5 text-center">CIA %</th>
                        <th className="p-3.5 text-center">ESE %</th>
                        <th className="p-3.5 text-center">Direct %</th>
                        <th className="p-3.5 text-center text-purple-300">Indirect %</th>
                        <th className="p-3.5 text-center text-blue-300">
                          <div>Wtd Direct</div>
                          <div className="font-normal text-[10px] text-blue-400">× {(weights.directWeight * 100).toFixed(0)}%</div>
                        </th>
                        <th className="p-3.5 text-center text-purple-300">
                          <div>Wtd Indirect</div>
                          <div className="font-normal text-[10px] text-purple-400">× {(weights.indirectWeight * 100).toFixed(0)}%</div>
                        </th>
                        <th className="p-3.5 text-center text-amber-300">Final Attainment %</th>
                        <th className="p-3.5 text-center text-emerald-300">CO Score</th>
                        <th className="p-3.5 text-center">Level</th>
                        <th className="p-3.5 text-center text-rose-300">Target Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {finalData.map((row) => (
                        <tr key={row.coCode} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono font-bold text-blue-700">
                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">{row.coCode}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-semibold text-slate-600">{row.ciaAttainment}%</td>
                          <td className="p-3.5 text-center font-mono font-semibold text-slate-600">{row.eseAttainment}%</td>
                          <td className="p-3.5 text-center font-mono font-bold text-blue-700">{row.directAttainment}%</td>
                          <td className="p-3.5 text-center font-mono font-bold text-purple-700">{row.indirectAttainment}%</td>
                          <td className="p-3.5 text-center font-mono font-bold text-blue-800 bg-blue-50/50">{row.weightedDirect}%</td>
                          <td className="p-3.5 text-center font-mono font-bold text-purple-800 bg-purple-50/50">{row.weightedIndirect}%</td>
                          <td className="p-3.5 text-center">
                            <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded font-mono font-black text-amber-800 text-sm">
                              {row.finalAttainment}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-emerald-700 text-sm">
                            {row.attainmentScore}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${row.level.colorClass}`}>
                              {row.level.levelLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${row.targetAchievement.badgeColor}`}>
                              {row.targetAchievement.isTargetMet
                                ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                : <AlertTriangle className="w-3 h-3 text-rose-600" />
                              }
                              <span>{row.targetAchievement.statusLabel}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interpretation Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">CO Attainment Interpretation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {finalData.map((row) => (
                    <div key={row.coCode} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-blue-700 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
                          {row.coCode}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{row.finalAttainment}%</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.interpretation.badgeColor}`}>
                            {row.interpretation.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {row.interpretation.narrative}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <AttainmentChart
                title="Final CO Attainment — Direct vs Indirect Weighted Contributions"
                data={chartData}
                type="direct_indirect"
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
