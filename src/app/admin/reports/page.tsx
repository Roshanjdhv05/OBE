'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AcademicYearSelector } from '@/components/common/AcademicYearSelector';
import { EmptyState } from '@/components/common/EmptyState';
import {
  OBEStore,
  AcademicYear,
  Programme,
  Semester,
  Subject,
  CourseOutcome,
  Student,
} from '@/lib/store/obe-store';
import { evaluateAttainmentLevel } from '@/lib/calculations/attainment-level';
import {
  FileSpreadsheet,
  Filter,
  Download,
  Search,
  User,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  FileText,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BloomTaxonomyPieChart, CORecordForBloom } from '@/components/charts/BloomTaxonomyPieChart';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'student' | 'cumulative' | 'programme'>('student');
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

  // Structural Filters
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedProgId, setSelectedProgId] = useState('');
  const [selectedSemId, setSelectedSemId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState(''); // '' means All Subjects

  // Student Section Specific State
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all'); // 'all' or specific student.id
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [allSystemStudents, setAllSystemStudents] = useState<Student[]>([]);

  // Cumulative 6-Semester State
  const [progAllStudents, setProgAllStudents] = useState<Student[]>([]);
  const [cumulativeStudent, setCumulativeStudent] = useState<Student | null>(null);
  const [cumulativeSemestersData, setCumulativeSemestersData] = useState<any[]>([]);
  const [loadingCumulative, setLoadingCumulative] = useState<boolean>(false);
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);
  const [cumulativeSearch, setCumulativeSearch] = useState<string>('');

  // Report Async Cache Maps
  const [studentUuidMap, setStudentUuidMap] = useState<Record<string, string>>({});
  const [studentNameMap, setStudentNameMap] = useState<Record<string, string>>({});
  const [configsMap, setConfigsMap] = useState<Record<string, any>>({});
  const [cosMap, setCosMap] = useState<Record<string, CourseOutcome[]>>({});
  const [ciaLatestMap, setCiaLatestMap] = useState<Record<string, any>>({});
  const [eseLatestMap, setEseLatestMap] = useState<Record<string, any>>({});
  const [surveyLatestMap, setSurveyLatestMap] = useState<Record<string, any>>({});
  const [ciaResultsMap, setCiaResultsMap] = useState<Record<string, any[]>>({});
  const [eseResultsMap, setEseResultsMap] = useState<Record<string, any[]>>({});
  const [surveyResponsesMap, setSurveyResponsesMap] = useState<Record<string, any[]>>({});

  const isStudentMatch = (resultStudentId: string, targetStudent: Student) => {
    if (!resultStudentId || !targetStudent) return false;

    // 1. Direct UUID or studentId match
    if (resultStudentId === targetStudent.id) return true;
    if (resultStudentId === targetStudent.studentId) return true;

    const targetNameNorm = (targetStudent.studentName || '').toLowerCase().trim();
    const targetIdClean = (targetStudent.studentId || '').toLowerCase().replace(/[\s-]/g, '');

    const mappedCode = studentUuidMap[resultStudentId];
    const mappedName = studentNameMap[resultStudentId];

    // 2. Match by Student Name (normalized) — Matches student across all semesters regardless of semester code prefix
    if (targetNameNorm && targetNameNorm.length > 1) {
      if (mappedName && mappedName.toLowerCase().trim() === targetNameNorm) return true;

      const resultObj = allSystemStudents.find((s) => s.id === resultStudentId);
      if (resultObj && (resultObj.studentName || '').toLowerCase().trim() === targetNameNorm) {
        return true;
      }
    }

    // 3. Match by exact normalized student code
    const resultClean = (resultStudentId || '').toLowerCase().replace(/[\s-]/g, '');
    if (targetIdClean && resultClean && resultClean === targetIdClean) return true;

    if (mappedCode) {
      const mappedClean = mappedCode.toLowerCase().replace(/[\s-]/g, '');
      if (mappedClean === targetIdClean) return true;

      // 4. Match by Roll Suffix (e.g. FYBCOM101-26-001 and TYBCOM501-26-001 both end in '26-001' or '001')
      const targetParts = targetStudent.studentId.split('-');
      const mappedParts = mappedCode.split('-');
      if (targetParts.length > 1 && mappedParts.length > 1) {
        const targetSuffix = targetParts.slice(1).join('-').toLowerCase().trim();
        const mappedSuffix = mappedParts.slice(1).join('-').toLowerCase().trim();
        if (targetSuffix && mappedSuffix && targetSuffix === mappedSuffix) return true;
      }

      // Check last 4 chars (e.g. '001')
      const targetEnd = targetIdClean.slice(-4);
      const mappedEnd = mappedClean.slice(-4);
      if (targetEnd && targetEnd.length >= 3 && targetEnd === mappedEnd) return true;
    }

    return false;
  };

  const loadReportData = async (subs: Subject[], semId: string) => {
    const allStds = await OBEStore.getAllStudents();
    console.log('[Reports] getAllStudents returned:', allStds.length, 'students');
    const uuidMap: Record<string, string> = {};
    const nameMap: Record<string, string> = {};
    allStds.forEach((s) => {
      uuidMap[s.id] = s.studentId;
      nameMap[s.id] = s.studentName;
    });
    setStudentUuidMap((prev) => ({ ...prev, ...uuidMap }));
    setStudentNameMap((prev) => ({ ...prev, ...nameMap }));
    setAllSystemStudents(allStds);

    if (semId) {
      const stds = await OBEStore.getStudents(semId);
      console.log('[Reports] getStudents(semId) returned:', stds.length, 'students for semId:', semId);
      // If no students in this specific semester, show all system students
      setAvailableStudents(stds.length > 0 ? stds : allStds);
    } else {
      const uniqueMap = new Map<string, Student>();
      allStds.forEach((s) => {
        if (!uniqueMap.has(s.studentId)) {
          uniqueMap.set(s.studentId, s);
        }
      });
      setAvailableStudents(Array.from(uniqueMap.values()));
    }

    const cMap: Record<string, any> = {};
    const coMap: Record<string, CourseOutcome[]> = {};
    const ciaLMap: Record<string, any> = {};
    const eseLMap: Record<string, any> = {};
    const survLMap: Record<string, any> = {};
    const ciaRMap: Record<string, any[]> = {};
    const eseRMap: Record<string, any[]> = {};
    const survRMap: Record<string, any[]> = {};

    for (const sub of subs) {
      const cfg = await OBEStore.getCalculationConfig(sub.id);
      cMap[sub.id] = cfg;

      const cos = await OBEStore.getCourseOutcomes(sub.id);
      coMap[sub.id] = cos;

      const ciaAss = await OBEStore.getAssessments(sub.id, 'CIA');
      const eseAss = await OBEStore.getAssessments(sub.id, 'ESE');
      const survAss = await OBEStore.getAssessments(sub.id, 'COURSE_EXIT_SURVEY');

      const ciaL = ciaAss.length > 0 ? ciaAss[ciaAss.length - 1] : null;
      const eseL = eseAss.length > 0 ? eseAss[eseAss.length - 1] : null;
      const survL = survAss.length > 0 ? survAss[survAss.length - 1] : null;

      ciaLMap[sub.id] = ciaL;
      eseLMap[sub.id] = eseL;
      survLMap[sub.id] = survL;

      if (ciaL) {
        ciaRMap[ciaL.id] = await OBEStore.getStudentCoResults(ciaL.id);
      }
      if (eseL) {
        eseRMap[eseL.id] = await OBEStore.getStudentCoResults(eseL.id);
      }
      if (survL) {
        survRMap[survL.id] = await OBEStore.getSurveyResponses(survL.id);
      }
    }

    setConfigsMap(cMap);
    setCosMap(coMap);
    setCiaLatestMap(ciaLMap);
    setEseLatestMap(eseLMap);
    setSurveyLatestMap(survLMap);
    setCiaResultsMap(ciaRMap);
    setEseResultsMap(eseRMap);
    setSurveyResponsesMap(survRMap);
  };

  const reloadFilters = async (year?: AcademicYear | null) => {
    const targetYear = year !== undefined ? year : await OBEStore.getActiveAcademicYear();
    setActiveYear(targetYear);

    if (targetYear) {
      const progs = await OBEStore.getProgrammes(targetYear.id);
      setProgrammes(progs);
      if (progs.length > 0) {
        const defaultProg = progs[0].id;
        setSelectedProgId(defaultProg);
        const sems = await OBEStore.getSemesters(defaultProg);
        setSemesters(sems);
        if (sems.length > 0) {
          const defaultSem = sems[0].id;
          setSelectedSemId(defaultSem);
          const subs = await OBEStore.getSubjects(defaultSem);
          setSubjects(subs);
          await loadReportData(subs, defaultSem);
        } else {
          setSemesters([]);
          setSubjects([]);
          await loadReportData([], '');
        }
      } else {
        setProgrammes([]);
        setSemesters([]);
        setSubjects([]);
        await loadReportData([], '');
      }
    } else {
      setProgrammes([]);
      setSemesters([]);
      setSubjects([]);
      await loadReportData([], '');
    }
  };

  useEffect(() => {
    reloadFilters();
  }, []);

  useEffect(() => {
    const changeProg = async () => {
      if (selectedProgId) {
        const sems = await OBEStore.getSemesters(selectedProgId);
        setSemesters(sems);
        if (sems.length > 0) {
          setSelectedSemId(sems[0].id);
        } else {
          setSelectedSemId('');
          setSubjects([]);
          await loadReportData([], '');
        }
      }
    };
    changeProg();
  }, [selectedProgId]);

  useEffect(() => {
    const changeSem = async () => {
      if (selectedSemId) {
        const subs = await OBEStore.getSubjects(selectedSemId);
        setSubjects(subs);
        setSelectedSubId(''); // default to All Subjects
        await loadReportData(subs, selectedSemId);
      } else {
        setSubjects([]);
        setSelectedSubId('');
        await loadReportData([], '');
      }
    };
    changeSem();
  }, [selectedSemId]);

  // Filtered students list based on search text
  const filteredStudents = useMemo(() => {
    if (studentSearch.trim()) {
      const qRaw = studentSearch.toLowerCase().trim();
      const qClean = qRaw.replace(/[\s-]/g, '');
      const filtered = allSystemStudents.filter((s) => {
        const idRaw = (s.studentId || '').toLowerCase();
        const idClean = idRaw.replace(/[\s-]/g, '');
        const nameRaw = (s.studentName || '').toLowerCase();
        return (
          idRaw.includes(qRaw) ||
          idClean.includes(qClean) ||
          nameRaw.includes(qRaw)
        );
      });
      return filtered.length > 0 ? filtered : availableStudents;
    }
    return availableStudents.length > 0 ? availableStudents : allSystemStudents;
  }, [availableStudents, allSystemStudents, studentSearch]);


  const activeProg = programmes.find((p) => p.id === selectedProgId);
  const activeSem = semesters.find((s) => s.id === selectedSemId);

  // Helper to compute attainment details for a given subject
  const getSubjectAttainmentSummary = (subId: string) => {
    const config = configsMap[subId] || {
      studentTargetPercentage: 50,
      level1Threshold: 60,
      level2Threshold: 70,
      level3Threshold: 80,
      directWeight: 0.8,
      indirectWeight: 0.2,
      ciaWeight: 0.5,
      eseWeight: 0.5,
      surveyMaxScore: 5.0,
      coTargetLevels: {},
    };
    const cos = cosMap[subId] || [];

    const ciaLatest = ciaLatestMap[subId] || null;
    const eseLatest = eseLatestMap[subId] || null;
    const surveyLatest = surveyLatestMap[subId] || null;

    const ciaResults = ciaLatest ? ciaResultsMap[ciaLatest.id] || [] : [];
    const eseResults = eseLatest ? eseResultsMap[eseLatest.id] || [] : [];
    const surveyResponses = surveyLatest ? surveyResponsesMap[surveyLatest.id] || [] : [];

    const coSummaries = cos.map((co) => {
      // CIA
      const coCia = ciaResults.filter((r) => r.coId === co.id);
      const ciaTotal = coCia.length;
      const ciaAttained = coCia.filter((r) => r.percentage >= config.studentTargetPercentage).length;
      const ciaPct = ciaTotal > 0 ? Number(((ciaAttained / ciaTotal) * 100).toFixed(1)) : 0;
      const ciaLevel = evaluateAttainmentLevel(ciaPct, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      // ESE
      const coEse = eseResults.filter((r) => r.coId === co.id);
      const eseTotal = coEse.length;
      const eseAttained = coEse.filter((r) => r.percentage >= config.studentTargetPercentage).length;
      const esePct = eseTotal > 0 ? Number(((eseAttained / eseTotal) * 100).toFixed(1)) : 0;
      const eseLevel = evaluateAttainmentLevel(esePct, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      // Direct Attainment %
      const directPct = Number((ciaPct * config.ciaWeight + esePct * config.eseWeight).toFixed(1));
      const directLevel = evaluateAttainmentLevel(directPct, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      // Indirect Attainment (Exit Survey %)
      const coSurvey = surveyResponses.filter((r) => r.coId === co.id);
      const surveyTotal = coSurvey.length;
      const avgScore =
        surveyTotal > 0 ? coSurvey.reduce((acc, curr) => acc + curr.score, 0) / surveyTotal : 0;
      const indirectPct = Number(((avgScore / config.surveyMaxScore) * 100).toFixed(1));
      const indirectLevel = evaluateAttainmentLevel(indirectPct, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      // Final Attainment %
      const finalPct = Number((directPct * config.directWeight + indirectPct * config.indirectWeight).toFixed(1));
      const finalLevel = evaluateAttainmentLevel(finalPct, {
        level1: config.level1Threshold,
        level2: config.level2Threshold,
        level3: config.level3Threshold,
      });

      const targetLevel = (config.coTargetLevels && config.coTargetLevels[co.coCode]) || (config.coTargetLevels && config.coTargetLevels[co.id]) || 1;
      const gap = finalLevel.levelNumber - targetLevel;

      return {
        coCode: co.coCode,
        coDesc: co.description,
        ciaPct,
        ciaLevel,
        esePct,
        eseLevel,
        directPct,
        directLevel,
        indirectPct,
        indirectLevel,
        finalPct,
        finalLevel,
        targetLevel,
        gap,
      };
    });

    const hasData = ciaLatest !== null || eseLatest !== null || surveyLatest !== null;
    const avgFinalPct =
      coSummaries.length > 0
        ? Number((coSummaries.reduce((acc, c) => acc + c.finalPct, 0) / coSummaries.length).toFixed(1))
        : 0;

    const overallLevel = evaluateAttainmentLevel(avgFinalPct, {
      level1: config.level1Threshold,
      level2: config.level2Threshold,
      level3: config.level3Threshold,
    });

    return {
      hasData,
      cosCount: cos.length,
      ciaUploaded: !!ciaLatest,
      eseUploaded: !!eseLatest,
      surveyUploaded: !!surveyLatest,
      coSummaries,
      avgFinalPct,
      overallLevel,
    };
  };

  // Helper to compute individual student attainment transcript
  const getIndividualStudentAttainment = (student: Student) => {
    // Determine subjects to inspect
    const targetSubjects = selectedSubId
      ? subjects.filter((s) => s.id === selectedSubId)
      : subjects;

    const subjectRecords: Array<{
      subjectCode: string;
      subjectName: string;
      coCode: string;
      coDesc: string;
      ciaObtained?: number;
      ciaMax?: number;
      ciaPct?: number;
      ciaAttained?: boolean;
      eseObtained?: number;
      eseMax?: number;
      esePct?: number;
      eseAttained?: boolean;
      surveyScore?: number;
      finalPct?: number;
      status: string;
    }> = [];

    targetSubjects.forEach((sub) => {
      const config = configsMap[sub.id] || {
        studentTargetPercentage: 50,
        directWeight: 0.8,
        indirectWeight: 0.2,
        ciaWeight: 0.5,
        eseWeight: 0.5,
        surveyMaxScore: 5.0,
      };
      const cos = cosMap[sub.id] || [];

      const ciaLatest = ciaLatestMap[sub.id] || null;
      const eseLatest = eseLatestMap[sub.id] || null;
      const surveyLatest = surveyLatestMap[sub.id] || null;

      const ciaResults = ciaLatest ? ciaResultsMap[ciaLatest.id] || [] : [];
      const eseResults = eseLatest ? eseResultsMap[eseLatest.id] || [] : [];
      const surveyResponses = surveyLatest ? surveyResponsesMap[surveyLatest.id] || [] : [];

      cos.forEach((co) => {
        const stdCia = ciaResults.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);
        const stdEse = eseResults.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);
        const stdSurvey = surveyResponses.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);

        const ciaPct = stdCia ? stdCia.percentage : undefined;
        const esePct = stdEse ? stdEse.percentage : undefined;
        const directPct =
          ciaPct !== undefined && esePct !== undefined
            ? ciaPct * config.ciaWeight + esePct * config.eseWeight
            : ciaPct !== undefined
            ? ciaPct
            : esePct !== undefined
            ? esePct
            : 0;

        const surveyPct = stdSurvey ? (stdSurvey.score / config.surveyMaxScore) * 100 : 0;
        const finalPct = Number((directPct * config.directWeight + surveyPct * config.indirectWeight).toFixed(1));

        const attained = stdCia?.attained || stdEse?.attained || finalPct >= config.studentTargetPercentage;

        subjectRecords.push({
          subjectCode: sub.subjectCode,
          subjectName: sub.subjectName,
          coCode: co.coCode,
          coDesc: co.description,
          ciaObtained: stdCia?.marksObtained,
          ciaMax: stdCia?.maximumMarks,
          ciaPct,
          ciaAttained: stdCia?.attained,
          eseObtained: stdEse?.marksObtained,
          eseMax: stdEse?.maximumMarks,
          esePct,
          eseAttained: stdEse?.attained,
          surveyScore: stdSurvey?.score,
          finalPct: stdCia || stdEse || stdSurvey ? finalPct : undefined,
          status: stdCia || stdEse || stdSurvey ? (attained ? 'Attained ✓' : 'Not Attained') : 'No Data',
        });
      });
    });

    return subjectRecords;
  };

  // EXPORT HANDLERS
  const exportStudentReport = (student: Student) => {
    const records = getIndividualStudentAttainment(student);
    const data = records.map((r) => ({
      'Student ID': student.studentId,
      'Student Name': student.studentName,
      Programme: activeProg?.programmeCode || '',
      Semester: activeSem?.semesterName || '',
      'Subject Code': r.subjectCode,
      'Subject Name': r.subjectName,
      'CO Code': r.coCode,
      'CO Description': r.coDesc,
      'CIA Marks': r.ciaObtained !== undefined ? `${r.ciaObtained}/${r.ciaMax}` : 'N/A',
      'CIA %': r.ciaPct !== undefined ? `${r.ciaPct}%` : 'N/A',
      'ESE Marks': r.eseObtained !== undefined ? `${r.eseObtained}/${r.eseMax}` : 'N/A',
      'ESE %': r.esePct !== undefined ? `${r.esePct}%` : 'N/A',
      'Exit Survey Score': r.surveyScore !== undefined ? `${r.surveyScore}/5.0` : 'N/A',
      'Calculated Final %': r.finalPct !== undefined ? `${r.finalPct}%` : 'N/A',
      'Attainment Status': r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Attainment Report');
    XLSX.writeFile(workbook, `OBE_Report_Student_${student.studentId}.xlsx`);
  };

  const exportAllStudentsBatchReport = () => {
    if (filteredStudents.length === 0) return;

    const allRows: any[] = [];
    filteredStudents.forEach((std) => {
      const records = getIndividualStudentAttainment(std);
      records.forEach((r) => {
        allRows.push({
          'Student ID': std.studentId,
          'Student Name': std.studentName,
          Programme: activeProg?.programmeCode || '',
          Semester: activeSem?.semesterName || '',
          'Subject Code': r.subjectCode,
          'Subject Name': r.subjectName,
          'CO Code': r.coCode,
          'CIA Marks': r.ciaObtained !== undefined ? `${r.ciaObtained}/${r.ciaMax}` : 'N/A',
          'CIA %': r.ciaPct !== undefined ? `${r.ciaPct}%` : 'N/A',
          'ESE Marks': r.eseObtained !== undefined ? `${r.eseObtained}/${r.eseMax}` : 'N/A',
          'ESE %': r.esePct !== undefined ? `${r.esePct}%` : 'N/A',
          'Exit Survey Score': r.surveyScore !== undefined ? `${r.surveyScore}/5.0` : 'N/A',
          'Calculated Final %': r.finalPct !== undefined ? `${r.finalPct}%` : 'N/A',
          Status: r.status,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Student Report');
    XLSX.writeFile(
      workbook,
      `OBE_Batch_Student_Report_${activeProg?.programmeCode || 'Export'}_${activeSem?.semesterName || 'Sem'}.xlsx`
    );
  };

  const exportProgrammeSummaryReport = () => {
    const targetSubs = selectedSubId ? subjects.filter((s) => s.id === selectedSubId) : subjects;
    if (targetSubs.length === 0) return;

    const summaryRows: any[] = [];
    targetSubs.forEach((sub) => {
      const summary = getSubjectAttainmentSummary(sub.id);
      summary.coSummaries.forEach((co) => {
        summaryRows.push({
          Programme: activeProg?.programmeCode || '',
          Semester: activeSem?.semesterName || '',
          'Subject Code': sub.subjectCode,
          'Subject Name': sub.subjectName,
          'CO Code': co.coCode,
          Description: co.coDesc,
          'CIA Attainment %': `${co.ciaPct}%`,
          'CIA Level': co.ciaLevel.levelLabel,
          'ESE Attainment %': `${co.esePct}%`,
          'ESE Level': co.eseLevel.levelLabel,
          'Direct Attainment %': `${co.directPct}%`,
          'Indirect Exit Survey %': `${co.indirectPct}%`,
          'Final Attainment %': `${co.finalPct}%`,
          'Achieved Level': co.finalLevel.levelLabel,
          'Target Level': `Level ${co.targetLevel}`,
          'Attainment Gap': co.gap >= 0 ? `+${co.gap} Level` : `${co.gap} Level`,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(summaryRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programme Attainment Summary');
    XLSX.writeFile(
      workbook,
      `OBE_Programme_Summary_${activeProg?.programmeCode || 'Report'}_${activeSem?.semesterName || 'Sem'}.xlsx`
    );
  };

  // ── CUMULATIVE 6-SEMESTER DATA FETCHING & CALCULATIONS ───────────────────────

  // Load all unique students in selected programme (and system-wide fallback)
  useEffect(() => {
    const fetchProgStudents = async () => {
      // Get ALL students from the database (no filter)
      const allStds = await OBEStore.getAllStudents();
      console.log('[Reports] fetchProgStudents: total students in DB:', allStds.length);
      
      const systemUniqueMap = new Map<string, Student>();
      allStds.forEach((s) => {
        if (!systemUniqueMap.has(s.studentId)) {
          systemUniqueMap.set(s.studentId, s);
        }
      });
      const allUniqueStds = Array.from(systemUniqueMap.values());
      setAllSystemStudents(allUniqueStds);

      let list: Student[] = [];
      if (selectedProgId) {
        // First try: students directly linked to this programme
        const progStds = await OBEStore.getStudentsByProgramme(selectedProgId);
        console.log('[Reports] getStudentsByProgramme returned:', progStds.length, 'for progId:', selectedProgId);
        
        const progUniqueMap = new Map<string, Student>();
        progStds.forEach((s) => {
          if (!progUniqueMap.has(s.studentId)) progUniqueMap.set(s.studentId, s);
        });
        list = Array.from(progUniqueMap.values());

        // Second try: filter by semesters of this programme
        if (list.length === 0) {
          const sems = await OBEStore.getSemesters(selectedProgId);
          const semIds = new Set(sems.map((s) => s.id));
          list = allUniqueStds.filter((s) => semIds.has(s.semesterId) || s.programmeId === selectedProgId);
        }
      }
      
      // Final fallback: show all students
      if (list.length === 0) {
        list = allUniqueStds;
      }

      console.log('[Reports] progAllStudents final list:', list.length);
      setProgAllStudents(list);
      if (list.length > 0) {
        if (!cumulativeStudent || !list.some((s) => s.id === cumulativeStudent.id)) {
          setCumulativeStudent(list[0]);
        }
      }
    };
    fetchProgStudents();
  }, [selectedProgId]);


  // Filter cumulative students by search query across system-wide students
  const filteredCumulativeStudents = useMemo(() => {
    const pool = progAllStudents.length > 0 ? progAllStudents : allSystemStudents;
    if (cumulativeSearch.trim()) {
      const qRaw = cumulativeSearch.toLowerCase().trim();
      const qClean = qRaw.replace(/[\s-]/g, '');
      const searched = allSystemStudents.filter((s) => {
        const idRaw = (s.studentId || '').toLowerCase();
        const idClean = idRaw.replace(/[\s-]/g, '');
        const nameRaw = (s.studentName || '').toLowerCase();
        return idRaw.includes(qRaw) || idClean.includes(qClean) || nameRaw.includes(qRaw);
      });
      return searched.length > 0 ? searched : pool;
    }
    return pool;
  }, [progAllStudents, allSystemStudents, cumulativeSearch]);

  // Load complete Sem 1 to Sem 6 dataset for selected student
  const fetchCumulativeReportForStudent = async (student: Student, progId: string) => {
    setLoadingCumulative(true);
    try {
      const allStds = await OBEStore.getAllStudents();
      const uuidMap: Record<string, string> = {};
      const nameMap: Record<string, string> = {};
      allStds.forEach((s) => {
        uuidMap[s.id] = s.studentId;
        nameMap[s.id] = s.studentName;
      });
      setStudentUuidMap((prev) => ({ ...prev, ...uuidMap }));
      setStudentNameMap((prev) => ({ ...prev, ...nameMap }));

      let sems = await OBEStore.getSemesters(selectedProgId);
      if (sems.length === 0 && student.programmeId) {
        sems = await OBEStore.getSemesters(student.programmeId);
      }
      if (sems.length === 0 && progId) {
        sems = await OBEStore.getSemesters(progId);
      }
      if (sems.length === 0) {
        sems = await OBEStore.getSemesters();
      }
      sems.sort((a, b) => a.semesterNumber - b.semesterNumber);

      const semDataList: any[] = [];

      for (const sem of sems) {
        const subs = await OBEStore.getSubjects(sem.id);
        const subRecords: any[] = [];

        for (const sub of subs) {
          const cfg = await OBEStore.getCalculationConfig(sub.id);
          const cos = await OBEStore.getCourseOutcomes(sub.id);

          const ciaAss = await OBEStore.getAssessments(sub.id, 'CIA');
          const eseAss = await OBEStore.getAssessments(sub.id, 'ESE');
          const survAss = await OBEStore.getAssessments(sub.id, 'COURSE_EXIT_SURVEY');

          const ciaL = ciaAss.length > 0 ? ciaAss[ciaAss.length - 1] : null;
          const eseL = eseAss.length > 0 ? eseAss[eseAss.length - 1] : null;
          const survL = survAss.length > 0 ? survAss[survAss.length - 1] : null;

          const ciaResults = ciaL ? await OBEStore.getStudentCoResults(ciaL.id) : [];
          const eseResults = eseL ? await OBEStore.getStudentCoResults(eseL.id) : [];
          const surveyResponses = survL ? await OBEStore.getSurveyResponses(survL.id) : [];

          const coList: any[] = [];
          cos.forEach((co) => {
            const stdCia = ciaResults.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);
            const stdEse = eseResults.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);
            const stdSurvey = surveyResponses.find((r) => isStudentMatch(r.studentId, student) && r.coId === co.id);

            const ciaPct = stdCia ? stdCia.percentage : undefined;
            const esePct = stdEse ? stdEse.percentage : undefined;
            const directPct =
              ciaPct !== undefined && esePct !== undefined
                ? ciaPct * (cfg.ciaWeight ?? 0.5) + esePct * (cfg.eseWeight ?? 0.5)
                : ciaPct !== undefined
                ? ciaPct
                : esePct !== undefined
                ? esePct
                : undefined;

            const surveyScore = stdSurvey ? stdSurvey.score : undefined;
            const surveyPct = surveyScore !== undefined ? (surveyScore / (cfg.surveyMaxScore ?? 5)) * 100 : undefined;

            let finalPct: number | undefined = undefined;
            if (directPct !== undefined && surveyPct !== undefined) {
              finalPct = Number((directPct * (cfg.directWeight ?? 0.8) + surveyPct * (cfg.indirectWeight ?? 0.2)).toFixed(1));
            } else if (directPct !== undefined) {
              finalPct = Number(directPct.toFixed(1));
            } else if (surveyPct !== undefined) {
              finalPct = Number(surveyPct.toFixed(1));
            }

            const level = finalPct !== undefined ? evaluateAttainmentLevel(finalPct, {
              level1: cfg.level1Threshold,
              level2: cfg.level2Threshold,
              level3: cfg.level3Threshold,
            }) : null;

            const isAttained = finalPct !== undefined ? finalPct >= (cfg.studentTargetPercentage ?? 50) : false;

            coList.push({
              coCode: co.coCode,
              coDesc: co.description,
              ciaObtained: stdCia?.marksObtained,
              ciaMax: stdCia?.maximumMarks,
              ciaPct,
              eseObtained: stdEse?.marksObtained,
              eseMax: stdEse?.maximumMarks,
              esePct,
              directPct,
              surveyScore,
              surveyPct,
              finalPct,
              level,
              isAttained,
              status: finalPct !== undefined ? (isAttained ? 'Attained ✓' : 'Not Attained') : 'No Data',
            });
          });

          const validFinalPcts = coList.map((c) => c.finalPct).filter((p) => p !== undefined) as number[];
          const subAvgPct = validFinalPcts.length > 0 ? Number((validFinalPcts.reduce((a, b) => a + b, 0) / validFinalPcts.length).toFixed(1)) : 0;
          const subLevel = evaluateAttainmentLevel(subAvgPct, {
            level1: cfg.level1Threshold,
            level2: cfg.level2Threshold,
            level3: cfg.level3Threshold,
          });

          subRecords.push({
            subject: sub,
            config: cfg,
            coList,
            subAvgPct,
            subLevel,
            hasData: validFinalPcts.length > 0,
          });
        }

        // Check if student has ANY data in this semester (CIA, ESE, or survey)
        let studentHasAnyData = false;
        for (const sub of subs) {
          const ciaAssCheck = await OBEStore.getAssessments(sub.id, 'CIA');
          const eseAssCheck = await OBEStore.getAssessments(sub.id, 'ESE');
          const survAssCheck = await OBEStore.getAssessments(sub.id, 'COURSE_EXIT_SURVEY');
          const ciaLCheck = ciaAssCheck.length > 0 ? ciaAssCheck[ciaAssCheck.length - 1] : null;
          const eseLCheck = eseAssCheck.length > 0 ? eseAssCheck[eseAssCheck.length - 1] : null;
          const survLCheck = survAssCheck.length > 0 ? survAssCheck[survAssCheck.length - 1] : null;
          if (ciaLCheck) {
            const results = await OBEStore.getStudentCoResults(ciaLCheck.id);
            if (results.some((r) => isStudentMatch(r.studentId, student))) { studentHasAnyData = true; break; }
          }
          if (!studentHasAnyData && eseLCheck) {
            const results = await OBEStore.getStudentCoResults(eseLCheck.id);
            if (results.some((r) => isStudentMatch(r.studentId, student))) { studentHasAnyData = true; break; }
          }
          if (!studentHasAnyData && survLCheck) {
            const results = await OBEStore.getSurveyResponses(survLCheck.id);
            if (results.some((r) => isStudentMatch(r.studentId, student))) { studentHasAnyData = true; break; }
          }
        }

        const semSubPcts = subRecords.filter((s) => s.hasData).map((s) => s.subAvgPct);
        const semAvgPct = semSubPcts.length > 0 ? Number((semSubPcts.reduce((a, b) => a + b, 0) / semSubPcts.length).toFixed(1)) : 0;
        // A semester is "student missing" if the sem has subjects/assessments BUT the student has no results
        const semHasAssessments = subs.length > 0;
        const studentMissing = semHasAssessments && !studentHasAnyData;

        semDataList.push({
          semester: sem,
          subRecords,
          semAvgPct,
          hasData: semSubPcts.length > 0,
          studentMissing,
          subjectsCount: subs.length,
        });
      }

      setCumulativeSemestersData(semDataList);
    } catch (err) {
      console.error('Error fetching cumulative data:', err);
    } finally {
      setLoadingCumulative(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cumulative' && cumulativeStudent && selectedProgId) {
      fetchCumulativeReportForStudent(cumulativeStudent, selectedProgId);
    }
  }, [activeTab, cumulativeStudent, selectedProgId]);

  const cumulativeStats = useMemo(() => {
    let totalCOs = 0;
    let attainedCOs = 0;
    let sumFinalPct = 0;
    let countFinalPct = 0;
    let totalSubjects = 0;
    let missingSemestersCount = 0;
    let enrolledSemestersCount = 0;

    cumulativeSemestersData.forEach((semData) => {
      if (semData.studentMissing) {
        missingSemestersCount++;
      } else {
        enrolledSemestersCount++;
      }
      semData.subRecords.forEach((subRec: any) => {
        totalSubjects++;
        subRec.coList.forEach((co: any) => {
          totalCOs++;
          if (co.isAttained) attainedCOs++;
          if (co.finalPct !== undefined) {
            sumFinalPct += co.finalPct;
            countFinalPct++;
          }
        });
      });
    });

    const avgPct = countFinalPct > 0 ? Number((sumFinalPct / countFinalPct).toFixed(1)) : 0;
    const level = evaluateAttainmentLevel(avgPct, { level1: 50, level2: 60, level3: 70 });
    const targetMetPct = totalCOs > 0 ? Number(((attainedCOs / totalCOs) * 100).toFixed(0)) : 0;

    let fullReportStatus = 'NO ASSESSMENT DATA RECORDED';
    let statusBadgeColor = 'bg-slate-100 text-slate-600 border-slate-300';

    if (countFinalPct > 0) {
      if (missingSemestersCount > 0) {
        fullReportStatus = `PARTIAL REPORT — ${enrolledSemestersCount} OF ${cumulativeSemestersData.length} SEMESTERS AVAILABLE (${targetMetPct}% COs ATTAINED)`;
        statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
      } else if (attainedCOs === totalCOs) {
        fullReportStatus = 'COMPLETE — ALL CO TARGETS FULLY ATTAINED (100%)';
        statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      } else if (targetMetPct >= 75) {
        fullReportStatus = `COMPLETE — HIGH ATTAINMENT (${targetMetPct}% COs ATTAINED)`;
        statusBadgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
      } else {
        fullReportStatus = `IN PROGRESS / REMEDIATION NEEDED (${targetMetPct}% COs ATTAINED)`;
        statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
      }
    }

    return {
      totalSubjects,
      totalCOs,
      attainedCOs,
      avgPct,
      level,
      targetMetPct,
      fullReportStatus,
      statusBadgeColor,
      missingSemestersCount,
      enrolledSemestersCount,
    };
  }, [cumulativeSemestersData]);

  const cumulativeCORecords = useMemo(() => {
    const list: CORecordForBloom[] = [];
    cumulativeSemestersData.forEach((semData) => {
      semData.subRecords?.forEach((subRec: any) => {
        subRec.coList?.forEach((co: any) => {
          list.push({
            coCode: co.coCode,
            coDesc: co.coDesc,
            finalPct: co.finalPct,
            ciaPct: co.ciaPct,
            esePct: co.esePct,
            directPct: co.directPct,
          });
        });
      });
    });
    return list;
  }, [cumulativeSemestersData]);

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

  const handleDownloadCumulativePdfReport = async () => {
    if (!cumulativeStudent) return;
    try {
      setPdfDownloading(true);
      const html2pdf = await loadHtml2Pdf();

      const year = await OBEStore.getActiveAcademicYear();

      let semTablesHtml = '';

      cumulativeSemestersData.forEach((semData) => {
        if (semData.studentMissing) {
          semTablesHtml += `
            <div style="margin-bottom: 24px; page-break-inside: avoid;">
              <div style="background: #92400e; color: #ffffff; padding: 8px 14px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between;">
                <span>${semData.semester.semesterName}</span>
                <span style="color: #fef3c7;">STUDENT NOT ENROLLED / DATA MISSING</span>
              </div>
              <div style="background: #fffbeb; border: 1px solid #fcd34d; border-top: none; padding: 14px; border-radius: 0 0 4px 4px; font-size: 11px; color: #92400e;">
                <strong>Notice:</strong> No student record or assessment scores exist for ${semData.semester.semesterName} (${activeProg?.programmeCode ?? 'Programme'}). This semester has been flagged as missing in the cumulative report.
              </div>
            </div>
          `;
          return;
        }

        let rowsHtml = '';
        semData.subRecords.forEach((subRec: any) => {
          subRec.coList.forEach((co: any, idx: number) => {
            rowsHtml += `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #1e40af;">${subRec.subject.subjectCode}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155;">${subRec.subject.subjectName}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${co.coCode}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center;">${co.ciaPct !== undefined ? co.ciaPct + '%' : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center;">${co.esePct !== undefined ? co.esePct + '%' : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #1e40af;">${co.directPct !== undefined ? co.directPct.toFixed(1) + '%' : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; color: #6b21a8;">${co.surveyPct !== undefined ? co.surveyPct.toFixed(1) + '%' : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; color: #0f172a; background: #f1f5f9;">${co.finalPct !== undefined ? co.finalPct.toFixed(1) + '%' : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${co.level ? co.level.levelLabel : '—'}</td>
                <td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: ${co.isAttained ? '#15803d' : '#b91c1c'};">${co.status}</td>
              </tr>
            `;
          });
        });

        if (!rowsHtml) {
          rowsHtml = `
            <tr>
              <td colSpan="10" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">No course outcomes or assessment records found for this semester.</td>
            </tr>
          `;
        }

        semTablesHtml += `
          <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <div style="background: #1e293b; color: #ffffff; padding: 8px 14px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between;">
              <span>${semData.semester.semesterName}</span>
              <span style="color: #60a5fa;">Semester Avg Attainment: ${semData.semAvgPct}%</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #2563eb; color: #ffffff;">
                  <th style="width: 12%; padding: 7px; border: 1px solid #1d4ed8; text-align: left; color: #ffffff;">Code</th>
                  <th style="width: 25%; padding: 7px; border: 1px solid #1d4ed8; text-align: left; color: #ffffff;">Subject Name</th>
                  <th style="width: 8%; padding: 7px; border: 1px solid #1d4ed8; text-align: left; color: #ffffff;">CO</th>
                  <th style="width: 8%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">CIA %</th>
                  <th style="width: 8%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">ESE %</th>
                  <th style="width: 9%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">Direct %</th>
                  <th style="width: 9%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">Indirect %</th>
                  <th style="width: 9%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">Final %</th>
                  <th style="width: 6%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">Level</th>
                  <th style="width: 9%; padding: 7px; border: 1px solid #1d4ed8; text-align: center; color: #ffffff;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      });

      const container = document.createElement('div');
      container.style.width = '794px';
      container.style.padding = '0';
      container.style.background = '#ffffff';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';
      container.style.fontSize = '11px';
      container.style.color = '#1e293b';

      container.innerHTML = `
        <div style="background: #0b1528; color: #ffffff; padding: 24px 32px;">
          <h1 style="font-size: 18px; font-weight: 900; letter-spacing: 0.6px; margin: 0 0 6px 0; text-transform: uppercase; color: #ffffff; line-height: 1.2;">OUTCOME BASED EDUCATION (OBE) REPORT CARD</h1>
          <p style="font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 0; text-transform: uppercase; color: #f59e0b;">CUMULATIVE STUDENT TRANSCRIPT — SEMESTERS 1 TO 6 (NAAC COMPLIANT)</p>
        </div>

        <div style="padding: 24px 32px;">
          <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 2px solid #1e40af;">1. STUDENT PROFILE & INSTITUTIONAL CONTEXT</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px;">
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a; width: 140px;">Student Name:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 700; width: 210px; font-size: 12px;">${cumulativeStudent.studentName}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a; width: 140px;">Student Register ID:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 700; font-family: monospace;">${cumulativeStudent.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Programme:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${activeProg?.programmeName ?? 'N/A'} (${activeProg?.programmeCode ?? ''})</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Batch Year:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${cumulativeStudent.batchYear ?? '2024'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Academic Year:</td>
              <td style="padding: 5px 0; color: #1e40af; font-weight: 600;">${year?.yearName ?? 'N/A'}</td>
              <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">Full Report Status:</td>
              <td style="padding: 5px 0; color: #0f172a; font-weight: 800;">${cumulativeStats.fullReportStatus}</td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 2px solid #1e40af;">2. CUMULATIVE 6-SEMESTER ATTAINMENT SUMMARY</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; background: #f8fafc; border: 1px solid #cbd5e1;">
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; width: 25%;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Cumulative Attainment</div>
                <div style="font-size: 16px; font-weight: 900; color: #1e40af; margin-top: 2px;">${cumulativeStats.avgPct}%</div>
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; width: 25%;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Attainment Level</div>
                <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 2px;">${cumulativeStats.level.levelLabel}</div>
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; width: 25%;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Subjects Evaluated</div>
                <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px;">${cumulativeStats.totalSubjects}</div>
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; width: 25%;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Target Met Rate</div>
                <div style="font-size: 16px; font-weight: 900; color: #b91c1c; margin-top: 2px;">${cumulativeStats.targetMetPct}%</div>
              </td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 14px; padding-bottom: 4px; border-bottom: 2px solid #1e40af;">3. SEMESTER-BY-SEMESTER DETAILED TRANSCRIPT (SEM 1 - SEM 6)</div>
          ${semTablesHtml}

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; padding: 0 10px; page-break-inside: avoid;">
            <div style="min-width: 180px;">
              <div style="border-top: 1.5px solid #64748b; width: 180px; margin-bottom: 6px;"></div>
              <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Faculty Advisor / Coordinator</div>
            </div>
            <div style="min-width: 180px;">
              <div style="border-top: 1.5px solid #64748b; width: 180px; margin-bottom: 6px;"></div>
              <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Head of Department (HOD)</div>
            </div>
            <div style="min-width: 180px;">
              <div style="border-top: 1.5px solid #64748b; width: 180px; margin-bottom: 6px;"></div>
              <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Controller of Examinations / Principal</div>
            </div>
          </div>
        </div>
      `;

      const fileName = `OBE_Cumulative_Report_Card_${cumulativeStudent.studentId}.pdf`;

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
      alert('Failed to generate PDF report card. Please try again.');
    } finally {
      setPdfDownloading(false);
    }
  };

  const exportCumulativeStudentReportExcel = () => {
    if (!cumulativeStudent) return;
    const allRows: any[] = [];

    cumulativeSemestersData.forEach((semData) => {
      semData.subRecords.forEach((subRec: any) => {
        subRec.coList.forEach((co: any) => {
          allRows.push({
            'Student ID': cumulativeStudent.studentId,
            'Student Name': cumulativeStudent.studentName,
            Programme: activeProg?.programmeCode || '',
            Semester: semData.semester.semesterName,
            'Subject Code': subRec.subject.subjectCode,
            'Subject Name': subRec.subject.subjectName,
            'CO Code': co.coCode,
            'CIA Marks': co.ciaObtained !== undefined ? `${co.ciaObtained}/${co.ciaMax}` : 'N/A',
            'CIA %': co.ciaPct !== undefined ? `${co.ciaPct}%` : 'N/A',
            'ESE Marks': co.eseObtained !== undefined ? `${co.eseObtained}/${co.eseMax}` : 'N/A',
            'ESE %': co.esePct !== undefined ? `${co.esePct}%` : 'N/A',
            'Direct Attainment %': co.directPct !== undefined ? `${co.directPct.toFixed(1)}%` : 'N/A',
            'Exit Survey Score': co.surveyScore !== undefined ? `${co.surveyScore}/5.0` : 'N/A',
            'Final Attainment %': co.finalPct !== undefined ? `${co.finalPct.toFixed(1)}%` : 'N/A',
            'Achieved Level': co.level ? co.level.levelLabel : 'N/A',
            'Attainment Status': co.status,
          });
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cumulative Report Card');
    XLSX.writeFile(workbook, `OBE_Cumulative_Report_Card_${cumulativeStudent.studentId}.xlsx`);
  };

  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentId || selectedStudentId === 'all') return null;
    return (
      allSystemStudents.find((s) => s.id === selectedStudentId) ||
      availableStudents.find((s) => s.id === selectedStudentId) ||
      null
    );
  }, [selectedStudentId, availableStudents, allSystemStudents]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="super_admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Institutional Reports & Attainment Analytics"
          subtitle="Comprehensive Outcome Based Education (OBE) reports for Individual Students & Programmes"
          role="super_admin"
        />

        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Control: Academic Year Selector */}
          <AcademicYearSelector onYearChange={(y) => reloadFilters(y)} />

          {/* SECTION SWITCHER TABS */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('student')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>1. Semester-Wise Student Reports</span>
              </button>

              <button
                onClick={() => setActiveTab('cumulative')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'cumulative'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>2. Cumulative Report Card (Sem 1 to 6)</span>
              </button>

              <button
                onClick={() => setActiveTab('programme')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'programme'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>3. Programme Summary Reports</span>
              </button>
            </div>

            {/* Quick Export Button based on active tab */}
            {activeTab === 'student' ? (
              <button
                onClick={
                  selectedStudentObj
                    ? () => exportStudentReport(selectedStudentObj)
                    : exportAllStudentsBatchReport
                }
                disabled={filteredStudents.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedStudentObj
                    ? `Export Report (${selectedStudentObj.studentId})`
                    : 'Export All Filtered Student Reports'}
                </span>
              </button>
            ) : activeTab === 'cumulative' ? (
              <button
                onClick={handleDownloadCumulativePdfReport}
                disabled={!cumulativeStudent || pdfDownloading || loadingCumulative}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>{pdfDownloading ? 'Generating PDF...' : 'Download Full Report Card (PDF)'}</span>
              </button>
            ) : (
              <button
                onClick={exportProgrammeSummaryReport}
                disabled={subjects.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Programme Summary (.xlsx)</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STUDENT REPORTS & INDIVIDUAL ANALYTICS */}
          {/* ========================================================================= */}
          {activeTab === 'student' && (
            <div className="space-y-6">
              {/* Structural & Student Filters */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Select Student & Subject Parameters</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {filteredStudents.length} Student(s) Enrolled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Programme */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Programme
                    </label>
                    <select
                      value={selectedProgId}
                      onChange={(e) => setSelectedProgId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.programmeCode}] {p.programmeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Semester
                    </label>
                    <select
                      value={selectedSemId}
                      onChange={(e) => setSelectedSemId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.semesterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Subject Context
                    </label>
                    <select
                      value={selectedSubId}
                      onChange={(e) => setSelectedSubId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Subjects in Semester</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          [{sub.subjectCode}] {sub.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PARTICULAR STUDENT SELECT DROPDOWN */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-blue-700 mb-1">
                      Particular Student (Select Account)
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-blue-50/70 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 font-mono"
                    >
                      <option value="all">-- All Enrolled Students --</option>
                      {filteredStudents.map((std) => (
                        <option key={std.id} value={std.id}>
                          {std.studentId} — {std.studentName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Student ID Filter Search Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Type Student User ID (e.g. FYBCOM201-26-001) or Name to search..."
                      value={studentSearch}
                      onChange={(e) => {
                        const query = e.target.value;
                        setStudentSearch(query);
                        if (query.trim()) {
                          const qRaw = query.toLowerCase().trim();
                          const qClean = qRaw.replace(/[\s-]/g, '');
                          const found = allSystemStudents.find((s) => {
                            const idRaw = (s.studentId || '').toLowerCase();
                            const idClean = idRaw.replace(/[\s-]/g, '');
                            const nameRaw = (s.studentName || '').toLowerCase();
                            return idRaw === qRaw || idClean === qClean || idRaw.includes(qRaw) || idClean.includes(qClean) || nameRaw.includes(qRaw);
                          }) || availableStudents.find((s) => {
                            const idRaw = (s.studentId || '').toLowerCase();
                            const idClean = idRaw.replace(/[\s-]/g, '');
                            const nameRaw = (s.studentName || '').toLowerCase();
                            return idRaw === qRaw || idClean === qClean || idRaw.includes(qRaw) || idClean.includes(qClean) || nameRaw.includes(qRaw);
                          });
                          if (found) {
                            setSelectedStudentId(found.id);
                          }
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 pl-9 pr-4 py-2 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* INDIVIDUAL PARTICULAR STUDENT VIEW CARD */}
              {selectedStudentObj ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                  {/* Student Profile Banner */}
                  <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/30 border border-blue-400/40 rounded-2xl text-blue-200">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                          Individual Student OBE Transcript Report
                        </div>
                        <h3 className="text-xl font-black">{selectedStudentObj.studentName}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300 font-mono">
                          <span>
                            Student ID: <strong className="text-white">{selectedStudentObj.studentId}</strong>
                          </span>
                          <span>•</span>
                          <span>Prog: {activeProg?.programmeCode}</span>
                          <span>•</span>
                          <span>{activeSem?.semesterName}</span>
                          {selectedStudentObj.batchYear && (
                            <>
                              <span>•</span>
                              <span>Batch: {selectedStudentObj.batchYear}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => exportStudentReport(selectedStudentObj)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Particular Report (.xlsx)</span>
                    </button>
                  </div>

                  {/* Individual Student CO Attainment Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>CO-Wise Assessment Breakdown & Attainment Results</span>
                    </h4>

                    {(() => {
                      const records = getIndividualStudentAttainment(selectedStudentObj);

                      if (records.length === 0) {
                        return (
                          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                            No assessment marks or exit survey responses have been uploaded for this student yet.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          <BloomTaxonomyPieChart
                            title="Student Bloom's Taxonomy Attainment Distribution (K1 to K6)"
                            subtitle={`Evaluated COs across subjects for ${selectedStudentObj.studentName} (${selectedStudentObj.studentId})`}
                            coRecords={records}
                          />

                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white font-semibold">
                              <tr>
                                <th className="p-3.5">Subject Code</th>
                                <th className="p-3.5">CO Code</th>
                                <th className="p-3.5">CO Statement</th>
                                <th className="p-3.5 text-center">CIA Marks</th>
                                <th className="p-3.5 text-center">CIA %</th>
                                <th className="p-3.5 text-center">ESE Marks</th>
                                <th className="p-3.5 text-center">ESE %</th>
                                <th className="p-3.5 text-center">Exit Survey Score</th>
                                <th className="p-3.5 text-center">Final CO %</th>
                                <th className="p-3.5 text-center">Attainment Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {records.map((r, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80">
                                  <td className="p-3.5 font-mono font-bold text-slate-900">
                                    [{r.subjectCode}]
                                  </td>
                                  <td className="p-3.5 font-mono font-bold text-blue-700 bg-blue-50/50">
                                    {r.coCode}
                                  </td>
                                  <td className="p-3.5 text-slate-700 max-w-xs truncate">
                                    {r.coDesc}
                                  </td>
                                  <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                                    {r.ciaObtained !== undefined ? `${r.ciaObtained}/${r.ciaMax}` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center font-mono">
                                    {r.ciaPct !== undefined ? `${r.ciaPct}%` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                                    {r.eseObtained !== undefined ? `${r.eseObtained}/${r.eseMax}` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center font-mono">
                                    {r.esePct !== undefined ? `${r.esePct}%` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center font-mono font-bold text-purple-700 bg-purple-50/30">
                                    {r.surveyScore !== undefined ? `${r.surveyScore} / 5.0` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center font-mono font-black text-slate-900 text-sm bg-slate-50">
                                    {r.finalPct !== undefined ? `${r.finalPct}%` : '—'}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        r.status.includes('Attained')
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : r.status === 'No Data'
                                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}
                                    >
                                      {r.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* ALL ENROLLED STUDENTS LIST TABLE */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Enrolled Students Attainment Roster</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click on any student to view their individual transcript and download their report.
                      </p>
                    </div>

                    <button
                      onClick={exportAllStudentsBatchReport}
                      disabled={filteredStudents.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export All Batch Reports (.xlsx)</span>
                    </button>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <EmptyState
                      title="No student records match search criteria"
                      description="No students found for the selected programme and semester."
                    />
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white font-semibold">
                          <tr>
                            <th className="p-3.5 font-mono">Student ID</th>
                            <th className="p-3.5">Student Name</th>
                            <th className="p-3.5">Programme</th>
                            <th className="p-3.5">Semester</th>
                            <th className="p-3.5 text-center">Batch Year</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                          {filteredStudents.map((std) => (
                            <tr key={std.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="p-3.5 font-mono font-bold text-blue-700">
                                {std.studentId}
                              </td>
                              <td className="p-3.5 font-bold text-slate-900">{std.studentName}</td>
                              <td className="p-3.5 font-mono text-slate-600">
                                {activeProg?.programmeCode}
                              </td>
                              <td className="p-3.5 text-slate-600">{activeSem?.semesterName}</td>
                              <td className="p-3.5 text-center font-mono text-slate-600">
                                {std.batchYear || '2024'}
                              </td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  onClick={() => setSelectedStudentId(std.id)}
                                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  View Particular Report →
                                </button>
                                <button
                                  onClick={() => exportStudentReport(std)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Excel ↓
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CUMULATIVE 6-SEMESTER STUDENT REPORT CARD */}
          {/* ========================================================================= */}
          {activeTab === 'cumulative' && (
            <div className="space-y-6">
              {/* Student Selection Controls Header */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Select Degree Programme & Student Profile</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Sem 1 to Sem 6 Full OBE Report Card
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Programme */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Degree Programme
                    </label>
                    <select
                      value={selectedProgId}
                      onChange={(e) => setSelectedProgId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.programmeCode}] {p.programmeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Search Student ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-amber-800 mb-1 flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-amber-600" />
                      <span>Search Student User ID / Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Type Student User ID (e.g. FYBCOM201-26-001) or Name..."
                      value={cumulativeSearch}
                      onChange={(e) => {
                        const query = e.target.value;
                        setCumulativeSearch(query);
                        if (query.trim()) {
                          const qRaw = query.toLowerCase().trim();
                          const qClean = qRaw.replace(/[\s-]/g, '');
                          const found = allSystemStudents.find((s) => {
                            const idRaw = (s.studentId || '').toLowerCase();
                            const idClean = idRaw.replace(/[\s-]/g, '');
                            const nameRaw = (s.studentName || '').toLowerCase();
                            return idRaw === qRaw || idClean === qClean || idRaw.includes(qRaw) || idClean.includes(qClean) || nameRaw.includes(qRaw);
                          }) || progAllStudents.find((s) => {
                            const idRaw = (s.studentId || '').toLowerCase();
                            const idClean = idRaw.replace(/[\s-]/g, '');
                            const nameRaw = (s.studentName || '').toLowerCase();
                            return idRaw === qRaw || idClean === qClean || idRaw.includes(qRaw) || idClean.includes(qClean) || nameRaw.includes(qRaw);
                          });
                          if (found) {
                            setCumulativeStudent(found);
                            if (found.programmeId && programmes.some((p) => p.id === found.programmeId)) {
                              setSelectedProgId(found.programmeId);
                            }
                          } else {
                            const virtualStudent: Student = {
                              id: query.trim(),
                              academicYearId: activeYear?.id || '',
                              programmeId: selectedProgId,
                              semesterId: '',
                              studentId: query.trim(),
                              studentName: query.trim(),
                            };
                            setCumulativeStudent(virtualStudent);
                          }
                        } else {
                          const defaultStudent = progAllStudents[0] || allSystemStudents[0] || null;
                          setCumulativeStudent(defaultStudent);
                        }
                      }}
                      className="w-full bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-mono placeholder:font-sans placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* CUMULATIVE REPORT CARD CONTAINER */}
              {loadingCumulative ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
                  <div className="text-sm font-bold text-slate-800">Generating Semesters 1 to 6 Cumulative OBE Transcript...</div>
                  <div className="text-xs text-slate-400 mt-1">Aggregating CIA, ESE, and Exit Survey results across all subjects</div>
                </div>
              ) : cumulativeStudent ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                  {/* Header Student Profile Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-400">
                        <GraduationCap className="w-9 h-9" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Full Cumulative Report Card
                          </span>
                          <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            NAAC Compliant
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-white">{cumulativeStudent.studentName}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                          <span>Register ID: <strong className="text-white">{cumulativeStudent.studentId}</strong></span>
                          <span>•</span>
                          <span>Programme: <strong className="text-white">{activeProg?.programmeCode}</strong></span>
                          <span>•</span>
                          <span>Batch: <strong className="text-white">{cumulativeStudent.batchYear || '2024'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Action Buttons */}
                    <div className="flex flex-col sm:items-end gap-3">
                      <div className={`px-4 py-2 rounded-xl text-xs font-black border shadow-xs ${cumulativeStats.statusBadgeColor}`}>
                        STATUS OF FULL REPORT: {cumulativeStats.fullReportStatus}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleDownloadCumulativePdfReport}
                          disabled={pdfDownloading}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>{pdfDownloading ? 'Generating PDF...' : 'Download Full Report Card (PDF)'}</span>
                        </button>
                        <button
                          onClick={exportCumulativeStudentReportExcel}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Excel (.xlsx)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Cumulative Attainment</div>
                      <div className="text-2xl font-black text-blue-900 mt-1">{cumulativeStats.avgPct}%</div>
                      <div className="text-[11px] font-medium text-blue-600 mt-0.5">Average Across All COs</div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Overall Attainment Level</div>
                      <div className="text-xl font-black text-emerald-900 mt-1">{cumulativeStats.level.levelLabel}</div>
                      <div className="text-[11px] font-medium text-emerald-700 mt-0.5">Level {cumulativeStats.level.levelNumber} Target Threshold</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Subjects Evaluated</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{cumulativeStats.totalSubjects}</div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">Semesters 1 to 6</div>
                    </div>

                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">CO Target Met Rate</div>
                      <div className="text-2xl font-black text-purple-900 mt-1">{cumulativeStats.targetMetPct}%</div>
                      <div className="text-[11px] font-medium text-purple-700 mt-0.5">{cumulativeStats.attainedCOs} / {cumulativeStats.totalCOs} COs Attained</div>
                    </div>
                  </div>

                  {/* Bloom's Taxonomy Pie Chart for Cumulative 6-Semester Profile */}
                  <BloomTaxonomyPieChart
                    title="Cumulative 6-Semester Bloom's Taxonomy Level Distribution (K1 to K6)"
                    subtitle={`Aggregated CO Attainment across Semesters 1 to 6 for ${cumulativeStudent.studentName} (${cumulativeStudent.studentId})`}
                    coRecords={cumulativeCORecords}
                  />

                  {/* Semester-by-Semester Tables (Sem 1 to Sem 6) */}
                  <div className="space-y-6 pt-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Semester-by-Semester OBE Attainment Transcript (Sem 1 to Sem 6)
                      </span>
                      <span className="text-xs text-slate-500 font-normal">
                        Calculated using CIA (50%), ESE (50%), and Exit Survey (20% indirect)
                      </span>
                    </h4>

                    {cumulativeSemestersData.map((semData) => (
                      <div
                        key={semData.semester.id}
                        className={`rounded-xl overflow-hidden shadow-xs border ${semData.studentMissing ? 'border-amber-300' : 'border-slate-200'}`}
                      >
                        {/* Semester Bar Header */}
                        <div className={`px-4 py-3 flex items-center justify-between ${semData.studentMissing ? 'bg-amber-800' : 'bg-slate-900'} text-white`}>
                          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                            <span className={`w-2 h-2 rounded-full ${semData.studentMissing ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                            <span>{semData.semester.semesterName}</span>
                            <span className="text-slate-300 text-[11px] font-normal">
                              ({semData.subjectsCount ?? semData.subRecords.length} Subject{(semData.subjectsCount ?? semData.subRecords.length) !== 1 ? 's' : ''})
                            </span>
                            {semData.studentMissing && (
                              <span className="ml-2 px-2 py-0.5 bg-amber-500/30 border border-amber-400/50 text-amber-200 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                ⚠ Student Not Enrolled / No Data
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {semData.studentMissing ? (
                              <span className="text-xs font-semibold text-amber-300">
                                No records for this student in this semester
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-blue-300">
                                Semester Avg: <strong>{semData.semAvgPct}%</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student Missing Banner */}
                        {semData.studentMissing ? (
                          <div className="bg-amber-50 border-t border-amber-200 p-5 flex items-start gap-4">
                            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-600 shrink-0 mt-0.5">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="text-sm font-bold text-amber-900">
                                Student Not Found in {semData.semester.semesterName}
                              </div>
                              <div className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                                No CIA, ESE, or Exit Survey data exists for student{' '}
                                <strong className="font-mono">{cumulativeStudent?.studentId}</strong> in{' '}
                                <strong>{semData.semester.semesterName}</strong>. The student may not have been enrolled
                                in this semester, or assessment files have not been uploaded for this period.
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                  {semData.subjectsCount ?? semData.subRecords.length} Subject(s) Configured — Student Data Missing
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                                  Excluded from Cumulative Average Calculation
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : semData.subRecords.length === 0 ? (
                          /* No Subjects Configured */
                          <div className="bg-slate-50 border-t border-slate-200 p-5 text-center">
                            <div className="text-xs text-slate-400 font-medium italic">
                              No subjects configured for {semData.semester.semesterName}.
                            </div>
                          </div>
                        ) : (
                          /* Normal: Semester Subjects CO Table */
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-3">Subject Code</th>
                                  <th className="p-3">Subject Name</th>
                                  <th className="p-3">CO Code</th>
                                  <th className="p-3 text-center">CIA %</th>
                                  <th className="p-3 text-center">ESE %</th>
                                  <th className="p-3 text-center text-blue-700">Direct %</th>
                                  <th className="p-3 text-center text-purple-700">Exit Survey %</th>
                                  <th className="p-3 text-center font-bold text-slate-900 bg-slate-200/60">Final CO %</th>
                                  <th className="p-3 text-center">Level</th>
                                  <th className="p-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {semData.subRecords.flatMap((subRec: any) =>
                                  subRec.coList.map((co: any) => (
                                    <tr key={`${subRec.subject.id}-${co.coCode}`} className="hover:bg-slate-50/80">
                                      <td className="p-3 font-mono font-bold text-blue-700">{subRec.subject.subjectCode}</td>
                                      <td className="p-3 text-slate-800 font-semibold max-w-xs truncate">{subRec.subject.subjectName}</td>
                                      <td className="p-3 font-mono font-bold text-slate-900 bg-blue-50/30">{co.coCode}</td>
                                      <td className="p-3 text-center font-mono text-slate-600">
                                        {co.ciaPct !== undefined ? `${co.ciaPct}%` : '—'}
                                      </td>
                                      <td className="p-3 text-center font-mono text-slate-600">
                                        {co.esePct !== undefined ? `${co.esePct}%` : '—'}
                                      </td>
                                      <td className="p-3 text-center font-mono font-bold text-blue-700">
                                        {co.directPct !== undefined ? `${co.directPct.toFixed(1)}%` : '—'}
                                      </td>
                                      <td className="p-3 text-center font-mono font-bold text-purple-700 bg-purple-50/20">
                                        {co.surveyPct !== undefined ? `${co.surveyPct.toFixed(1)}%` : '—'}
                                      </td>
                                      <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-100 text-sm">
                                        {co.finalPct !== undefined ? `${co.finalPct.toFixed(1)}%` : '—'}
                                      </td>
                                      <td className="p-3 text-center">
                                        {co.level ? (
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${co.level.colorClass}`}>
                                            {co.level.levelLabel}
                                          </span>
                                        ) : '—'}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span
                                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            co.status.includes('Attained')
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : co.status === 'No Data'
                                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                                              : 'bg-rose-50 text-rose-700 border-rose-200'
                                          }`}
                                        >
                                          {co.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                                {semData.subRecords.every((s: any) => s.coList.length === 0) && (
                                  <tr>
                                    <td colSpan={10} className="p-4 text-center text-slate-400 font-medium italic">
                                      No CO data found for {semData.semester.semesterName}.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No Student Selected"
                  description="Select a degree programme and student from the dropdown above to view their 6-semester cumulative report card."
                />
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROGRAMME / SEMESTER / SUBJECT REPORTS */}
          {/* ========================================================================= */}
          {activeTab === 'programme' && (
            <div className="space-y-6">
              {/* Structural Filters */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Programme & Semester Hierarchy Selection</span>
                  </h3>

                  <button
                    onClick={exportProgrammeSummaryReport}
                    disabled={subjects.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Full Programme Summary (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Degree Programme
                    </label>
                    <select
                      value={selectedProgId}
                      onChange={(e) => setSelectedProgId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.programmeCode}] {p.programmeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Semester
                    </label>
                    <select
                      value={selectedSemId}
                      onChange={(e) => setSelectedSemId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.semesterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Filter Subject
                    </label>
                    <select
                      value={selectedSubId}
                      onChange={(e) => setSelectedSubId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Subjects in Semester</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          [{sub.subjectCode}] {sub.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Programme Data Cards Grid */}
              {subjects.length === 0 ? (
                <EmptyState
                  title="No subjects configured for this programme and semester"
                  description="Add subjects and course outcomes in Programme Management to view attainment analytics."
                />
              ) : (
                <div className="space-y-6">
                  {(selectedSubId
                    ? subjects.filter((s) => s.id === selectedSubId)
                    : subjects
                  ).map((sub) => {
                    const summary = getSubjectAttainmentSummary(sub.id);

                    return (
                      <div
                        key={sub.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                      >
                        {/* Subject Header Bar */}
                        <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-600 text-white font-mono text-xs font-bold">
                              {sub.subjectCode}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold">{sub.subjectName}</h4>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Programme: {activeProg?.programmeCode} | {activeSem?.semesterName} |{' '}
                                {summary.cosCount} COs Configured
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${summary.overallLevel.colorClass}`}
                            >
                              Overall: {summary.overallLevel.levelLabel} ({summary.avgFinalPct}%)
                            </span>
                          </div>
                        </div>

                        {/* Upload Status Flags */}
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                          <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                            Data Availability:
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              summary.ciaUploaded ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {summary.ciaUploaded ? '✓ CIA Uploaded' : '○ CIA Pending'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              summary.eseUploaded ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {summary.eseUploaded ? '✓ ESE Uploaded' : '○ ESE Pending'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              summary.surveyUploaded ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {summary.surveyUploaded ? '✓ Exit Survey Uploaded' : '○ Exit Survey Pending'}
                          </span>
                        </div>

                        {/* CO Attainment Summary Table for Subject */}
                        <div className="p-5 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3">CO Code</th>
                                <th className="p-3">CO Description</th>
                                <th className="p-3 text-center">CIA Attainment</th>
                                <th className="p-3 text-center">ESE Attainment</th>
                                <th className="p-3 text-center">Direct Attainment</th>
                                <th className="p-3 text-center">Exit Survey %</th>
                                <th className="p-3 text-center">Final Attainment</th>
                                <th className="p-3 text-center">Achieved Level</th>
                                <th className="p-3 text-center">Target Level</th>
                                <th className="p-3 text-center">Attainment Gap</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                              {summary.coSummaries.map((co) => (
                                <tr key={co.coCode} className="hover:bg-slate-50/80">
                                  <td className="p-3 font-mono font-bold text-blue-700 bg-blue-50/30">
                                    {co.coCode}
                                  </td>
                                  <td className="p-3 text-slate-700 max-w-xs">{co.coDesc}</td>
                                  <td className="p-3 text-center font-mono">
                                    <div>{co.ciaPct}%</div>
                                    <span className="text-[10px] text-slate-500">
                                      {co.ciaLevel.levelLabel}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    <div>{co.esePct}%</div>
                                    <span className="text-[10px] text-slate-500">
                                      {co.eseLevel.levelLabel}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-blue-800">
                                    {co.directPct}%
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-purple-700">
                                    {co.indirectPct}%
                                  </td>
                                  <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-50 text-sm">
                                    {co.finalPct}%
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${co.finalLevel.colorClass}`}
                                    >
                                      {co.finalLevel.levelLabel}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-700 font-mono">
                                    Level {co.targetLevel}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                        co.gap >= 0
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                                      }`}
                                    >
                                      {co.gap >= 0 ? `+${co.gap} Level` : `${co.gap} Level`}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
