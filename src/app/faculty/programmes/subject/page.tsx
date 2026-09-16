'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { EmptyState } from '@/components/common/EmptyState';
import { ExcelUploader } from '@/components/excel/ExcelUploader';
import { ExcelPreviewModal } from '@/components/excel/ExcelPreviewModal';
import { OBEStore, AcademicYear, Programme, Semester, Subject, CourseOutcome, Assessment, StudentCOResult, SurveyResponseRecord } from '@/lib/store/obe-store';
import { ExcelImportPreview } from '@/lib/excel/parser';
import { calculateCIACOAttainment } from '@/lib/calculations/cia';
import { calculateDirectAttainment } from '@/lib/calculations/direct';
import { calculateIndirectPercentage } from '@/lib/calculations/survey';
import { calculateFinalAttainment } from '@/lib/calculations/final';
import { evaluateAttainmentLevel, evaluateCOTargetAchievement } from '@/lib/calculations/attainment-level';
import { generateCOInterpretation } from '@/lib/calculations/interpretation';
import {
  BookOpen,
  ArrowLeft,
  Sliders,
  BarChart3,
  FileCheck,
  TrendingUp,
  MessageSquare,
  PieChart,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Info,
  Target,
  Layers,
  Calculator,
} from 'lucide-react';

function SubjectDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subjectId = searchParams.get('id') || searchParams.get('subjectId');

  const [activeTab, setActiveTab] = useState<string>('attainment-levels');
  const [loading, setLoading] = useState(true);

  // Subject Meta
  const [subject, setSubject] = useState<Subject | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

  // Shared Data for this Subject
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [config, setConfig] = useState<any>({
    studentTargetPercentage: 50,
    level1Threshold: 50,
    level2Threshold: 60,
    level3Threshold: 70,
    ciaWeight: 0.5,
    eseWeight: 0.5,
    directWeight: 0.8,
    indirectWeight: 0.2,
    surveyMaxScore: 5,
    ciaMaxMarks: 50,
    eseMaxMarks: 50,
    coTargetLevels: {},
  });

  // Attainment Levels Tab State
  const [coTargetLevels, setCoTargetLevels] = useState<Record<string, number>>({});
  const [batchLevel, setBatchLevel] = useState<number>(1);
  const [savedConfig, setSavedConfig] = useState(false);

  // Assessment Upload States
  const [ciaAssessments, setCiaAssessments] = useState<Assessment[]>([]);
  const [eseAssessments, setEseAssessments] = useState<Assessment[]>([]);
  const [surveyAssessments, setSurveyAssessments] = useState<Assessment[]>([]);

  // Results Maps
  const [ciaResultsMap, setCiaResultsMap] = useState<Record<string, StudentCOResult[]>>({});
  const [eseResultsMap, setEseResultsMap] = useState<Record<string, StudentCOResult[]>>({});
  const [surveyResponsesMap, setSurveyResponsesMap] = useState<Record<string, SurveyResponseRecord[]>>({});

  // Excel Preview Modals
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY'>('CIA');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 1. Initial Load of Subject Metadata
  useEffect(() => {
    const loadSubjectInfo = async () => {
      if (!subjectId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const year = await OBEStore.getActiveAcademicYear();
        setActiveYear(year);

        const subs = await OBEStore.getSubjects();
        const sub = subs.find((s) => s.id === subjectId);
        if (sub) {
          setSubject(sub);
          const sems = await OBEStore.getSemesters();
          const sem = sems.find((s) => s.id === sub.semesterId);
          setSemester(sem || null);

          const progs = await OBEStore.getProgrammes();
          const prog = progs.find((p) => p.id === sub.programmeId);
          setProgramme(prog || null);
        }

        await refreshSubjectData(subjectId);
      } catch (err) {
        console.error('Error loading subject details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubjectInfo();
  }, [subjectId]);

  // Refresh all dataset associated strictly with subjectId
  const refreshSubjectData = async (subId: string) => {
    const cos = await OBEStore.getCourseOutcomes(subId);
    setCourseOutcomes(cos);

    const cfg = await OBEStore.getCalculationConfig(subId);
    setConfig(cfg);

    const targets: Record<string, number> = {};
    cos.forEach((co) => {
      targets[co.id] = cfg.coTargetLevels?.[co.id] ?? 1;
    });
    setCoTargetLevels(targets);

    const ciaAss = await OBEStore.getAssessments(subId, 'CIA');
    const eseAss = await OBEStore.getAssessments(subId, 'ESE');
    const survAss = await OBEStore.getAssessments(subId, 'COURSE_EXIT_SURVEY');

    setCiaAssessments(ciaAss);
    setEseAssessments(eseAss);
    setSurveyAssessments(survAss);

    const latestCIA = ciaAss[ciaAss.length - 1];
    const latestESE = eseAss[eseAss.length - 1];
    const latestSurv = survAss[survAss.length - 1];

    let ciaRes: StudentCOResult[] = [];
    let eseRes: StudentCOResult[] = [];
    let survRes: SurveyResponseRecord[] = [];

    if (latestCIA) ciaRes = await OBEStore.getStudentCoResults(latestCIA.id);
    if (latestESE) eseRes = await OBEStore.getStudentCoResults(latestESE.id);
    if (latestSurv) survRes = await OBEStore.getSurveyResponses(latestSurv.id);

    const cMap: Record<string, StudentCOResult[]> = {};
    const eMap: Record<string, StudentCOResult[]> = {};
    const sMap: Record<string, SurveyResponseRecord[]> = {};

    cos.forEach((co) => {
      cMap[co.id] = ciaRes.filter((r) => r.coId === co.id);
      eMap[co.id] = eseRes.filter((r) => r.coId === co.id);
      sMap[co.id] = survRes.filter((r) => r.coId === co.id);
    });

    setCiaResultsMap(cMap);
    setEseResultsMap(eMap);
    setSurveyResponsesMap(sMap);
  };

  // Save Target Levels and Configuration
  const handleSaveConfig = async () => {
    if (!subjectId) return;
    const updatedConfig = {
      ...config,
      subjectId,
      coTargetLevels,
    };
    await OBEStore.updateCalculationConfig(updatedConfig);
    setConfig(updatedConfig);
    setSavedConfig(true);
    setTimeout(() => setSavedConfig(false), 2500);
  };

  // Apply batch target level and auto-save
  const handleApplyBatchLevel = async () => {
    if (!subjectId) return;
    const updated: Record<string, number> = {};
    courseOutcomes.forEach((co) => {
      updated[co.id] = batchLevel;
    });
    setCoTargetLevels(updated);

    const updatedConfig = {
      ...config,
      subjectId,
      coTargetLevels: updated,
    };
    await OBEStore.updateCalculationConfig(updatedConfig);
    setConfig(updatedConfig);
    setSavedConfig(true);
    setTimeout(() => setSavedConfig(false), 2500);
  };

  // Handle File Upload Select
  const handleFileSelect = (previewData: ExcelImportPreview, file: File, type: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY') => {
    setUploadType(type);
    setPreview(previewData);
    setPreviewFile(file);
  };

  // Handle Confirm Import
  const handleConfirmImport = async () => {
    if (!preview || !previewFile || !subject || !semester || !programme || !activeYear) return;
    setIsUploading(true);
    try {
      // For CIA/ESE use studentMarks, for COURSE_EXIT_SURVEY use surveyRecords
      const records = uploadType === 'COURSE_EXIT_SURVEY'
        ? (preview.surveyRecords || [])
        : (preview.studentMarks || []);
      await OBEStore.saveAssessmentImport(
        activeYear.id,
        programme.id,
        semester.id,
        subject.id,
        uploadType,
        previewFile.name,
        records,
        preview.detectedCOs
      );
      setUploadSuccess(true);
      setPreview(null);
      setPreviewFile(null);
      await refreshSubjectData(subject.id);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to save assessment data.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!subjectId || (!loading && !subject)) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar role="faculty" />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title="Subject Dashboard" role="faculty" />
          <main className="p-8 max-w-7xl mx-auto w-full">
            <EmptyState
              title="Subject Not Found"
              description="Please select a valid subject box from the Programmes page."
              icon={BookOpen}
            />
            <div className="flex justify-center mt-4">
              <Link
                href="/faculty/programmes"
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition-colors"
              >
                ← Back to Programmes
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── COMPUTATIONS FOR THIS SUBJECT ──
  const ciaCount = ciaAssessments.length;
  const eseCount = eseAssessments.length;
  const surveyCount = surveyAssessments.length;

  // CO Calculations Table Data
  const calculatedCOData = courseOutcomes.map((co) => {
    const cRes = ciaResultsMap[co.id] || [];
    const eRes = eseResultsMap[co.id] || [];
    const sRes = surveyResponsesMap[co.id] || [];

    // CIA Breakdown
    const ciaTotal = cRes.length;
    const ciaAttained = cRes.filter((r) => r.percentage >= config.studentTargetPercentage).length;
    const ciaNoCount = ciaTotal - ciaAttained;
    const ciaPct = ciaTotal > 0 ? calculateCIACOAttainment(ciaAttained, ciaTotal) : 0;
    const ciaYesPct = ciaTotal > 0 ? Number(((ciaAttained / ciaTotal) * 100).toFixed(2)) : 0;
    const ciaNoPct = ciaTotal > 0 ? Number(((ciaNoCount / ciaTotal) * 100).toFixed(2)) : 0;
    const ciaOutof = config.ciaMaxMarks ?? 50;
    const ciaTargetMarks = Number(((config.studentTargetPercentage / 100) * ciaOutof).toFixed(1));
    const ciaLevel = evaluateAttainmentLevel(ciaPct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });

    // ESE Breakdown
    const eseTotal = eRes.length;
    const eseAttained = eRes.filter((r) => r.percentage >= config.studentTargetPercentage).length;
    const eseNoCount = eseTotal - eseAttained;
    const esePct = eseTotal > 0 ? calculateCIACOAttainment(eseAttained, eseTotal) : 0;
    const eseYesPct = eseTotal > 0 ? Number(((eseAttained / eseTotal) * 100).toFixed(2)) : 0;
    const eseNoPct = eseTotal > 0 ? Number(((eseNoCount / eseTotal) * 100).toFixed(2)) : 0;
    const eseOutof = config.eseMaxMarks ?? 50;
    const eseTargetMarks = Number(((config.studentTargetPercentage / 100) * eseOutof).toFixed(1));
    const eseLevel = evaluateAttainmentLevel(esePct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });

    // Direct Breakdown
    const directPct = calculateDirectAttainment(ciaPct, esePct, config.ciaWeight ?? 0.5, config.eseWeight ?? 0.5);
    const average5050 = Number(((ciaPct + esePct) / 2).toFixed(2));
    const ciaContrib = Number((ciaPct * (config.ciaWeight ?? 0.5)).toFixed(2));
    const eseContrib = Number((esePct * (config.eseWeight ?? 0.5)).toFixed(2));
    const directLevel = evaluateAttainmentLevel(directPct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });
    const isDirectTargetMet = directPct >= config.studentTargetPercentage;

    // Survey / Indirect Breakdown
    const grade1 = sRes.filter((r) => r.score === 1).length;
    const grade2 = sRes.filter((r) => r.score === 2).length;
    const grade3 = sRes.filter((r) => r.score === 3).length;
    const grade4 = sRes.filter((r) => r.score === 4).length;
    const grade5 = sRes.filter((r) => r.score === 5).length;
    const surveyTotal = sRes.length;
    const sScores = sRes.map((r) => r.score).filter((sc) => sc > 0);
    const avgSurveyScore = sScores.length > 0 ? Number((sScores.reduce((a, b) => a + b, 0) / sScores.length).toFixed(2)) : 0;
    const maxCount = config.surveyMaxScore ?? 5;
    const indirectPct = calculateIndirectPercentage(avgSurveyScore, maxCount);
    const indirectLevel = evaluateAttainmentLevel(indirectPct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });

    // Final Attainment Breakdown
    const weightedDirect = Number((directPct * (config.directWeight ?? 0.8)).toFixed(2));
    const weightedIndirect = Number((indirectPct * (config.indirectWeight ?? 0.2)).toFixed(2));
    const finalPct = calculateFinalAttainment(weightedDirect, weightedIndirect);
    const finalLevel = evaluateAttainmentLevel(finalPct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });
    const targetLevel = coTargetLevels[co.id] ?? 1;
    const isTargetAchieved = evaluateCOTargetAchievement(finalLevel.levelNumber, targetLevel);
    const interpretation = generateCOInterpretation(finalPct, co.coCode);

    return {
      co,
      // CIA
      ciaTotal,
      ciaAttained,
      ciaNoCount,
      ciaPct,
      ciaYesPct,
      ciaNoPct,
      ciaOutof,
      ciaTargetMarks,
      ciaLevel,
      // ESE
      eseTotal,
      eseAttained,
      eseNoCount,
      esePct,
      eseYesPct,
      eseNoPct,
      eseOutof,
      eseTargetMarks,
      eseLevel,
      // Direct
      directPct,
      average5050,
      ciaContrib,
      eseContrib,
      directLevel,
      isDirectTargetMet,
      // Indirect
      grade1,
      grade2,
      grade3,
      grade4,
      grade5,
      surveyTotal,
      avgSurveyScore,
      maxCount,
      indirectPct,
      indirectLevel,
      // Final
      weightedDirect,
      weightedIndirect,
      finalPct,
      finalLevel,
      targetLevel,
      isTargetAchieved,
      interpretation,
    };
  });

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

  const handleDownloadSubjectReport = async () => {
    try {
      setDownloading(true);
      const html2pdf = await loadHtml2Pdf();

      const year = await OBEStore.getActiveAcademicYear();
      const users = await OBEStore.getUsers();
      const faculty = users.find((u) => u.role === 'faculty');
      const facultyName = faculty?.displayName ?? 'Prof. ABC';

      const directWtdLabel = `${(config.directWeight * 100).toFixed(0)}%`;
      const indirectWtdLabel = `${(config.indirectWeight * 100).toFixed(0)}%`;

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
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600; width: 210px;">${subject?.subjectName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a; width: 140px;">Subject Code:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${subject?.subjectCode ?? 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Programme:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${programme?.programmeName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Semester:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${semester?.semesterName ?? 'N/A'}</td>
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
                <th style="width: 12%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Direct ${directWtdLabel}</th>
                <th style="width: 10%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Indirect</th>
                <th style="width: 12%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Indirect ${indirectWtdLabel}</th>
                <th style="width: 11%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Final %</th>
                <th style="width: 38%; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border: 1px solid #1d4ed8; color: #ffffff;">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              ${calculatedCOData.map((row, idx) => `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.co.coCode}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">${row.directPct.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.weightedDirect.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">${row.indirectPct.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.weightedIndirect.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${row.finalPct.toFixed(2)}%</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569; font-size: 10px; line-height: 1.5;">${row.interpretation?.narrative ?? ''}</td>
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
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">HOD Signature</div>
            </div>
          </div>
        </div>
      `;

      const fileName = `OBE_Final_Attainment_${subject?.subjectCode || 'Report'}.pdf`;

      const opts = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfWorker = html2pdf().set(opts).from(container);
      const pdfBlob = await pdfWorker.output('blob');

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error('PDF Generation error:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const tabs = [
    { id: 'attainment-levels', label: 'Attainment Levels of COs', icon: Sliders },
    { id: 'co-attainment', label: 'CO Attainment Analysis', icon: BarChart3 },
    { id: 'cia', label: 'CIA Module', icon: FileCheck },
    { id: 'ese', label: 'ESE Module', icon: FileCheck },
    { id: 'direct-attainment', label: 'Direct Attainment', icon: TrendingUp },
    { id: 'course-exit-survey', label: 'Course Exit Survey', icon: MessageSquare },
    { id: 'indirect-attainment', label: 'Indirect Attainment', icon: PieChart },
    { id: 'final-attainment', label: 'Final Attainment', icon: Sparkles },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={`${programme?.programmeCode ?? ''} - ${subject?.subjectName ?? ''}`}
          subtitle={`Subject Code: ${subject?.subjectCode ?? ''} | ${semester?.semesterName ?? ''}`}
          role="faculty"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb & Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link href="/faculty/programmes" className="hover:text-blue-600 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Programmes
                </Link>
                <span>/</span>
                <span>{programme?.programmeCode}</span>
                <span>/</span>
                <span>{semester?.semesterName}</span>
                <span>/</span>
                <span className="text-slate-900 font-bold">{subject?.subjectName}</span>
              </div>

              <h1 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span>{programme?.programmeCode} {semester?.semesterName}: {subject?.subjectName}</span>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                  {subject?.subjectCode}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/faculty/programmes"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Subject Box
              </Link>
            </div>
          </div>

          {/* Upload Success Alert */}
          {uploadSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Assessment file uploaded and outcome attainment re-calculated successfully for this subject!</span>
            </div>
          )}

          {/* Module Navigation Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              TAB 1: ATTAINMENT LEVELS OF COs
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'attainment-levels' && (
            <div className="space-y-6">
              {/* Threshold & Target Level Settings Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Target Level & Threshold Configuration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assign target levels specifically for {subject?.subjectName} ({subject?.subjectCode}).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savedConfig ? 'Saved ✓' : 'Save Config'}</span>
                    </button>
                  </div>
                </div>

                {/* Thresholds & Weights Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Student Target %
                    </label>
                    <input
                      type="number"
                      value={config.studentTargetPercentage}
                      onChange={(e) => setConfig({ ...config, studentTargetPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      CIA Max Marks (Out of)
                    </label>
                    <input
                      type="number"
                      value={config.ciaMaxMarks ?? 50}
                      onChange={(e) => setConfig({ ...config, ciaMaxMarks: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      ESE Max Marks (Out of)
                    </label>
                    <input
                      type="number"
                      value={config.eseMaxMarks ?? 50}
                      onChange={(e) => setConfig({ ...config, eseMaxMarks: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Level 1 Threshold %
                    </label>
                    <input
                      type="number"
                      value={config.level1Threshold}
                      onChange={(e) => setConfig({ ...config, level1Threshold: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Level 2 Threshold %
                    </label>
                    <input
                      type="number"
                      value={config.level2Threshold}
                      onChange={(e) => setConfig({ ...config, level2Threshold: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Level 3 Threshold %
                    </label>
                    <input
                      type="number"
                      value={config.level3Threshold}
                      onChange={(e) => setConfig({ ...config, level3Threshold: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Batch Set Target Level */}
                <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-900">Batch Set Target Level for All COs:</span>
                  <select
                    value={batchLevel}
                    onChange={(e) => setBatchLevel(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value={1}>Level 1 (Low)</option>
                    <option value={2}>Level 2 (Medium)</option>
                    <option value={3}>Level 3 (High)</option>
                  </select>
                  <button
                    onClick={handleApplyBatchLevel}
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
                  >
                    Apply to All
                  </button>
                </div>

                {/* CO Target Levels Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                        <th className="p-3">CO Code</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Target Level</th>
                        <th className="p-3">Final Attainment %</th>
                        <th className="p-3">Actual Level</th>
                        <th className="p-3">Target Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {calculatedCOData.map((row) => (
                        <tr key={row.co.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-blue-700">{row.co.coCode}</td>
                          <td className="p-3 text-slate-600 max-w-md">{row.co.description}</td>
                          <td className="p-3">
                            <select
                              value={coTargetLevels[row.co.id] ?? 1}
                              onChange={async (e) => {
                                const val = Number(e.target.value);
                                const updated = { ...coTargetLevels, [row.co.id]: val };
                                setCoTargetLevels(updated);
                                if (subjectId) {
                                  const updatedConfig = { ...config, subjectId, coTargetLevels: updated };
                                  await OBEStore.updateCalculationConfig(updatedConfig);
                                  setConfig(updatedConfig);
                                  setSavedConfig(true);
                                  setTimeout(() => setSavedConfig(false), 2500);
                                }
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={1}>Level 1</option>
                              <option value={2}>Level 2</option>
                              <option value={3}>Level 3</option>
                            </select>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{row.finalPct.toFixed(2)}%</td>
                          <td className="p-3 font-bold text-indigo-700">{row.finalLevel.levelLabel}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                row.isTargetAchieved.isTargetMet
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {row.isTargetAchieved.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 2: CO ATTAINMENT ANALYSIS
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'co-attainment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                CO Attainment Analysis for {subject?.subjectName}
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <th className="p-3">CO Code</th>
                      <th className="p-3">CIA Attainment %</th>
                      <th className="p-3">ESE Attainment %</th>
                      <th className="p-3">Direct Attainment %</th>
                      <th className="p-3">Direct Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {calculatedCOData.map((row) => (
                      <tr key={row.co.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-blue-700">{row.co.coCode}</td>
                        <td className="p-3 font-semibold">{row.ciaPct.toFixed(2)}%</td>
                        <td className="p-3 font-semibold">{row.esePct.toFixed(2)}%</td>
                        <td className="p-3 font-bold text-slate-900">{row.directPct.toFixed(2)}%</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full font-bold text-[11px]">
                            {row.directLevel.levelLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 3: CIA MODULE
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'cia' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileCheck className="w-5 h-5 text-blue-600" />
                CIA Assessment Upload & Analysis ({subject?.subjectCode})
              </h3>

              <ExcelUploader
                assessmentType="CIA"
                onParsedPreview={(prev, file) => handleFileSelect(prev, file, 'CIA')}
              />

              {ciaAssessments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded CIA Files</h4>
                  <div className="space-y-2">
                    {ciaAssessments.map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900">{a.fileName}</span>
                        </div>
                        <span className="text-slate-400 font-mono">{new Date(a.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CIA Attainment Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">CIA Attainment Table</h3>
                      <p className="text-xs text-slate-500">Student Target: {config.studentTargetPercentage}% marks threshold per CO</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-semibold">
                      <tr>
                        <th className="p-3">CO</th>
                        <th className="p-3 text-center">Out of</th>
                        <th className="p-3 text-center">Target (≥ {config.studentTargetPercentage}%)</th>
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
                      {calculatedCOData.map((row) => (
                        <tr key={row.co.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                              {row.co.coCode}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">{row.ciaOutof}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{row.ciaTargetMarks}</td>
                          <td className="p-3 text-center font-mono font-semibold">{row.ciaTotal}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/50">{row.ciaAttained}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">{row.ciaYesPct}%</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-600 bg-rose-50/50">{row.ciaNoCount}</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-700">{row.ciaNoPct}%</td>
                          <td className="p-3 text-center font-mono font-black text-slate-900 text-sm bg-slate-50">
                            {row.ciaPct.toFixed(2)}%
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${row.ciaLevel.colorClass}`}>
                              {row.ciaLevel.levelLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {calculatedCOData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                            No Course Outcomes defined for this subject yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 4: ESE MODULE
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'ese' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                ESE Assessment Upload & Analysis ({subject?.subjectCode})
              </h3>

              <ExcelUploader
                assessmentType="ESE"
                onParsedPreview={(prev, file) => handleFileSelect(prev, file, 'ESE')}
              />

              {eseAssessments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded ESE Files</h4>
                  <div className="space-y-2">
                    {eseAssessments.map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900">{a.fileName}</span>
                        </div>
                        <span className="text-slate-400 font-mono">{new Date(a.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ESE Attainment Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ESE Attainment Table</h3>
                      <p className="text-xs text-slate-500">Student Target: {config.studentTargetPercentage}% marks threshold per CO</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-semibold">
                      <tr>
                        <th className="p-3">CO</th>
                        <th className="p-3 text-center">Out of</th>
                        <th className="p-3 text-center">Target (≥ {config.studentTargetPercentage}%)</th>
                        <th className="p-3 text-center">Total Students</th>
                        <th className="p-3 text-center">YES (Scored ≥ Target)</th>
                        <th className="p-3 text-center">YES %</th>
                        <th className="p-3 text-center">NO (Scored &lt; Target)</th>
                        <th className="p-3 text-center">NO %</th>
                        <th className="p-3 text-center">ESE Attainment %</th>
                        <th className="p-3 text-center">Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {calculatedCOData.map((row) => (
                        <tr key={row.co.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-indigo-700">
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                              {row.co.coCode}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">{row.eseOutof}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{row.eseTargetMarks}</td>
                          <td className="p-3 text-center font-mono font-semibold">{row.eseTotal}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/50">{row.eseAttained}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">{row.eseYesPct}%</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-600 bg-rose-50/50">{row.eseNoCount}</td>
                          <td className="p-3 text-center font-mono font-bold text-rose-700">{row.eseNoPct}%</td>
                          <td className="p-3 text-center font-mono font-black text-slate-900 text-sm bg-slate-50">
                            {row.esePct.toFixed(2)}%
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${row.eseLevel.colorClass}`}>
                              {row.eseLevel.levelLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {calculatedCOData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                            No Course Outcomes defined for this subject yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 5: DIRECT ATTAINMENT
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'direct-attainment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Direct Attainment — CO-wise Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculated using CIA ({(config.ciaWeight * 100).toFixed(0)}%) and ESE ({(config.eseWeight * 100).toFixed(0)}%) weighted components
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3.5">CO</th>
                      <th className="p-3.5 text-center">CIA Attainment %</th>
                      <th className="p-3.5 text-center">ESE Attainment %</th>
                      <th className="p-3.5 text-center">Average (50/50)</th>
                      <th className="p-3.5 text-center">CIA × {(config.ciaWeight * 100).toFixed(0)}%</th>
                      <th className="p-3.5 text-center">ESE × {(config.eseWeight * 100).toFixed(0)}%</th>
                      <th className="p-3.5 text-center">Final Weighted Attainment %</th>
                      <th className="p-3.5 text-center">Target Status (≥ {config.studentTargetPercentage}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {calculatedCOData.map((row) => (
                      <tr key={row.co.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-blue-700">
                          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded text-xs">{row.co.coCode}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{row.ciaPct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{row.esePct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono text-slate-500">{row.average5050.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-700">{row.ciaContrib.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-700">{row.eseContrib.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-black text-slate-900 text-sm bg-slate-50">
                          <span className="inline-block px-3 py-1 bg-white border border-slate-300 rounded shadow-xs">{row.directPct.toFixed(2)}%</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                            row.isDirectTargetMet
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {row.isDirectTargetMet ? 'Target Met' : 'Target Not Met'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {calculatedCOData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                          No Course Outcomes defined for this subject yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Comparison Info Banner */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs font-semibold text-blue-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">CIA vs ESE Attainment Comparison</span> &nbsp;|&nbsp;
                  <span>Weighted Attainment = (CIA × {(config.ciaWeight * 100).toFixed(0)}%) + (ESE × {(config.eseWeight * 100).toFixed(0)}%)</span>
                </div>
                <div className="bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg text-blue-800 font-mono font-bold">
                  Benchmark Target: {config.studentTargetPercentage}%
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 6: COURSE EXIT SURVEY
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'course-exit-survey' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                Course Exit Survey Upload ({subject?.subjectCode})
              </h3>

              <ExcelUploader
                assessmentType="COURSE_EXIT_SURVEY"
                onParsedPreview={(prev, file) => handleFileSelect(prev, file, 'COURSE_EXIT_SURVEY')}
              />

              {surveyAssessments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Survey Files</h4>
                  <div className="space-y-2">
                    {surveyAssessments.map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900">{a.fileName}</span>
                        </div>
                        <span className="text-slate-400 font-mono">{new Date(a.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Course Exit Survey — Response Summary */}
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
                      {calculatedCOData.map((row) => (
                        <tr key={row.co.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-purple-700">
                            <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded">
                              {row.co.coCode}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-emerald-700">{row.grade1}</td>
                          <td className="p-3 text-center font-mono font-semibold text-blue-700">{row.grade2}</td>
                          <td className="p-3 text-center font-mono font-semibold text-amber-700">{row.grade3}</td>
                          <td className="p-3 text-center font-mono font-semibold text-orange-700">{row.grade4}</td>
                          <td className="p-3 text-center font-mono font-semibold text-rose-700">{row.grade5}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{row.surveyTotal}</td>
                        </tr>
                      ))}
                      {calculatedCOData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                            No Course Outcomes defined for this subject yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 7: INDIRECT ATTAINMENT
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'indirect-attainment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Indirect Attainment — Course Exit Survey Analysis
                  </h3>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs font-semibold text-purple-900">
                <span className="font-bold">Formula: </span>
                Weighted Avg = (Grade1×1 + Grade2×2 + Grade3×3 + Grade4×4 + Grade5×5) / Total &nbsp;|&nbsp;
                <span className="font-bold"> in Percentage = (Weighted Avg / Maximum count) × 100</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
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
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {calculatedCOData.map((row) => (
                      <tr key={row.co.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-purple-700">
                          <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded">{row.co.coCode}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-emerald-700">{row.grade1}</td>
                        <td className="p-3 text-center font-mono font-semibold text-blue-700">{row.grade2}</td>
                        <td className="p-3 text-center font-mono font-semibold text-amber-700">{row.grade3}</td>
                        <td className="p-3 text-center font-mono font-semibold text-orange-700">{row.grade4}</td>
                        <td className="p-3 text-center font-mono font-semibold text-rose-700">{row.grade5}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{row.surveyTotal}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">{row.avgSurveyScore > 0 ? row.avgSurveyScore.toFixed(2) : '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{row.maxCount}</td>
                        <td className="p-3 text-center font-mono font-black text-purple-800 text-sm">
                          <span className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded">{row.indirectPct.toFixed(2)}%</span>
                        </td>
                      </tr>
                    ))}
                    {calculatedCOData.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                          No Course Outcomes defined for this subject yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              TAB 8: FINAL ATTAINMENT
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'final-attainment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Final CO Attainment — Complete Summary
                </h3>
                <button
                  onClick={handleDownloadSubjectReport}
                  disabled={downloading}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Generating PDF...' : 'Download Report'}
                </button>
              </div>

              {/* Formula Legend Banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs font-medium text-indigo-900">
                <span className="font-bold">Formula: </span>
                Direct Attainment = (CIA% × {(config.ciaWeight * 100).toFixed(0)}%) + (ESE% × {(config.eseWeight * 100).toFixed(0)}%)
                &nbsp;→&nbsp;
                <span className="font-bold">
                  Final CO Attainment = (Direct × {(config.directWeight * 100).toFixed(0)}%) + (Indirect% × {(config.indirectWeight * 100).toFixed(0)}%)
                </span>
                &nbsp;— rounding applied only at final step.
              </div>

              {/* Final Attainment Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3.5">CO</th>
                      <th className="p-3.5 text-center">CIA %</th>
                      <th className="p-3.5 text-center">ESE %</th>
                      <th className="p-3.5 text-center">Direct %</th>
                      <th className="p-3.5 text-center text-purple-300">Indirect %</th>
                      <th className="p-3.5 text-center text-blue-300">
                        <div>Wtd Direct</div>
                        <div className="font-normal text-[10px] text-blue-400">× {(config.directWeight * 100).toFixed(0)}%</div>
                      </th>
                      <th className="p-3.5 text-center text-purple-300">
                        <div>Wtd Indirect</div>
                        <div className="font-normal text-[10px] text-purple-400">× {(config.indirectWeight * 100).toFixed(0)}%</div>
                      </th>
                      <th className="p-3.5 text-center text-amber-300">Final Attainment %</th>
                      <th className="p-3.5 text-center text-emerald-300">CO Score</th>
                      <th className="p-3.5 text-center">Level</th>
                      <th className="p-3.5 text-center text-rose-300">Target Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {calculatedCOData.map((row) => (
                      <tr key={row.co.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-blue-700">
                          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">{row.co.coCode}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-600">{row.ciaPct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-600">{row.esePct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-700">{row.directPct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-purple-700">{row.indirectPct.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-800 bg-blue-50/50">{row.weightedDirect.toFixed(2)}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-purple-800 bg-purple-50/50">{row.weightedIndirect.toFixed(2)}%</td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded font-mono font-black text-amber-800 text-sm">
                            {row.finalPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-emerald-700 text-sm">
                          {row.finalLevel.levelNumber}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${row.finalLevel.colorClass}`}>
                            {row.finalLevel.levelLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${row.isTargetAchieved.badgeColor}`}>
                            {row.isTargetAchieved.isTargetMet
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            }
                            <span>{row.isTargetAchieved.statusLabel}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                    {calculatedCOData.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-400 font-medium">
                          No Course Outcomes defined for this subject yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* CO Attainment Interpretation Cards */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>CO Attainment Interpretation</span>
                  <span className="text-xs text-slate-500 font-normal">Final CO Attainment — Direct vs Indirect Weighted Contributions</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {calculatedCOData.map((row) => (
                    <div key={row.co.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-700 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
                          {row.co.coCode}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${row.interpretation.badgeColor}`}>
                          {row.interpretation.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {row.interpretation.narrative}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Excel Preview Modal */}
          {preview && previewFile && (
            <ExcelPreviewModal
              preview={preview}
              fileName={previewFile.name}
              onConfirm={handleConfirmImport}
              onCancel={() => {
                setPreview(null);
                setPreviewFile(null);
              }}
              isSubmitting={isUploading}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function SubjectDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">Loading Subject Dashboard...</div>}>
      <SubjectDetailContent />
    </Suspense>
  );
}
