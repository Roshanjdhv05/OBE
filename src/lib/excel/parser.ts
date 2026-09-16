import * as XLSX from 'xlsx';
import { normalizeSurveyResponse } from '../calculations/survey';

export interface ParsedStudentMark {
  studentId: string; // Primary key for student matching
  studentName: string;
  coMarks: Record<string, { obtained: number; max: number }>; // e.g. { CO1: { obtained: 17, max: 20 }, CO2: ... }
  rowIndex: number;
}

export interface ParsedSurveyRecord {
  studentId: string;
  studentName: string;
  coResponses: Record<string, { response: string; score: number }>; // e.g. { CO1: { response: 'Very satisfied', score: 5 } }
  rowIndex: number;
}

export interface ExcelImportPreview {
  assessmentType: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY';
  totalRows: number;
  validStudentsCount: number;
  detectedCOs: string[]; // ['CO1', 'CO2', 'CO3', 'CO4']
  maxMarksPerCO: Record<string, number>; // { CO1: 20, CO2: 20 }
  duplicates: Array<{ studentId: string; rows: number[] }>;
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  studentMarks?: ParsedStudentMark[];
  surveyRecords?: ParsedSurveyRecord[];
}

/**
 * Normalizes Student ID:
 * - Trims whitespace
 * - Preserves leading zeros
 * - Prevents scientific notation formatting issues
 */
export function normalizeStudentId(rawId: any): string {
  if (rawId === null || rawId === undefined) return '';
  let str = String(rawId).trim();
  // If numeric with trailing .0, clean it up
  if (str.endsWith('.0')) {
    str = str.replace(/\.0$/, '');
  }
  return str;
}

/**
 * Normalizes Student Name
 */
export function normalizeStudentName(rawName: any): string {
  if (!rawName) return '';
  return String(rawName).trim().toUpperCase();
}

/**
 * Parses CIA / ESE Excel File Buffer
 */
export function parseAssessmentExcel(buffer: ArrayBuffer, assessmentType: 'CIA' | 'ESE'): ExcelImportPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Excel file is empty or has insufficient rows.');
  }

  // Find Header Row
  let headerRowIndex = -1;
  let idColIndex = -1;
  let nameColIndex = -1;

  const idKeywords = ['student id', 'student_id', 'studentid', 'roll', 'usn', 'reg', 'enrollment', 'registration', 's.no', 'sl.no', 'arn', 'id', 'code', 'htno', 'hallticket', 'seat'];
  const nameKeywords = ['name', 'student_name', 'studentname', 'candidate'];

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim().toLowerCase();
      if (!cellVal) continue;

      // Check ID match
      if (idColIndex === -1) {
        if (idKeywords.some((kw) => cellVal.includes(kw))) {
          idColIndex = c;
          headerRowIndex = r;
        }
      }

      // Check Name match
      if (nameColIndex === -1) {
        if (nameKeywords.some((kw) => cellVal.includes(kw)) && !cellVal.includes('id') && !cellVal.includes('roll') && !cellVal.includes('usn') && !cellVal.includes('reg')) {
          nameColIndex = c;
          if (headerRowIndex === -1) headerRowIndex = r;
        }
      }
    }
    if (idColIndex !== -1 && nameColIndex !== -1) break;
  }

  // Smart Fallbacks if headers were missing or ambiguous
  if (headerRowIndex === -1) headerRowIndex = 0;

  if (idColIndex === -1 && nameColIndex !== -1) {
    idColIndex = nameColIndex === 0 ? 1 : 0;
  } else if (idColIndex !== -1 && nameColIndex === -1) {
    nameColIndex = idColIndex === 0 ? 1 : 0;
  } else if (idColIndex === -1 && nameColIndex === -1) {
    // Default column 0 = ID, column 1 = Name
    idColIndex = 0;
    nameColIndex = (rawRows[headerRowIndex] && rawRows[headerRowIndex].length > 1) ? 1 : 0;
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const maxMarksRow = rawRows[headerRowIndex + 1] || []; // Optional max marks header row

  // Detect CO Columns
  const coColMap: Record<number, { coCode: string; maxMarks: number }> = {};
  const detectedCOSet = new Set<string>();
  const maxMarksPerCO: Record<string, number> = {};

  for (let c = 0; c < headerRow.length; c++) {
    if (c === idColIndex || c === nameColIndex) continue;
    const colHeader = String(headerRow[c] || '').trim().toUpperCase();

    // Check if column title matches CO pattern (e.g., CO1, CO2, CO1_Q1, Q1 (CO1), etc.)
    const coMatch = colHeader.match(/(CO\d+)/i);
    if (coMatch) {
      const coCode = coMatch[1].toUpperCase();
      detectedCOSet.add(coCode);

      // Detect Max Marks for this column
      let colMax = assessmentType === 'ESE' ? 15 : 10;
      if (assessmentType !== 'ESE') {
        const rawMaxVal = maxMarksRow[c];
        if (typeof rawMaxVal === 'number' && rawMaxVal > 0) {
          colMax = rawMaxVal;
        } else {
          const maxInHeaderMatch = colHeader.match(/(?:max|out of|\/)\s*(\d+)/i);
          if (maxInHeaderMatch) {
            colMax = parseFloat(maxInHeaderMatch[1]);
          }
        }
      }

      coColMap[c] = { coCode, maxMarks: colMax };
      maxMarksPerCO[coCode] = colMax;
    }
  }

  // If no explicit CO headers found, create dynamic CO mapping from numeric columns
  if (detectedCOSet.size === 0) {
    let coCounter = 1;
    const defaultMax = assessmentType === 'ESE' ? 15 : 10;
    for (let c = 0; c < headerRow.length; c++) {
      if (c === idColIndex || c === nameColIndex) continue;
      const val = String(headerRow[c] || '').trim();
      const coCode = `CO${coCounter++}`;
      detectedCOSet.add(coCode);
      coColMap[c] = { coCode, maxMarks: defaultMax };
      maxMarksPerCO[coCode] = defaultMax;
    }
  }

  const detectedCOs = Array.from(detectedCOSet).sort();

  // Parse Student Data Rows
  const studentMarks: ParsedStudentMark[] = [];
  const invalidRows: Array<{ rowNumber: number; reason: string }> = [];
  const studentIdRowTracker: Record<string, number[]> = {};

  const startDataRowIndex = headerRowIndex + 1;

  for (let r = startDataRowIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawId = row[idColIndex];
    const rawName = row[nameColIndex];

    const studentId = normalizeStudentId(rawId);
    const studentName = normalizeStudentName(rawName);

    // Skip empty summary/header rows
    if (!studentId && !studentName) continue;
    if (studentId.toLowerCase().includes('total') || studentId.toLowerCase().includes('average')) continue;

    if (!studentId) {
      invalidRows.push({ rowNumber: r + 1, reason: 'Missing Student ID Number' });
      continue;
    }

    // Duplicate Student ID tracking
    if (!studentIdRowTracker[studentId]) {
      studentIdRowTracker[studentId] = [];
    }
    studentIdRowTracker[studentId].push(r + 1);

    const coMarks: Record<string, { obtained: number; max: number }> = {};

    detectedCOs.forEach((co) => {
      coMarks[co] = { obtained: 0, max: maxMarksPerCO[co] || 100 };
    });

    // Populate marks per CO column
    Object.entries(coColMap).forEach(([colIdxStr, coInfo]) => {
      const colIdx = parseInt(colIdxStr, 10);
      const markVal = row[colIdx];
      let numVal = 0;

      if (typeof markVal === 'number') {
        numVal = markVal;
      } else if (typeof markVal === 'string') {
        const parsed = parseFloat(markVal.trim());
        if (!isNaN(parsed)) numVal = parsed;
      }

      const existing = coMarks[coInfo.coCode] || { obtained: 0, max: maxMarksPerCO[coInfo.coCode] || 100 };
      coMarks[coInfo.coCode] = {
        obtained: existing.obtained + numVal,
        max: existing.max,
      };
    });

    studentMarks.push({
      studentId,
      studentName: studentName || `Student ${studentId}`,
      coMarks,
      rowIndex: r + 1,
    });
  }

  // Detect Duplicates
  const duplicates = Object.entries(studentIdRowTracker)
    .filter(([_, rows]) => rows.length > 1)
    .map(([studentId, rows]) => ({ studentId, rows }));

  return {
    assessmentType,
    totalRows: rawRows.length,
    validStudentsCount: studentMarks.length,
    detectedCOs,
    maxMarksPerCO,
    duplicates,
    invalidRows,
    studentMarks,
  };
}

/**
 * Parses Course Exit Survey Excel File Buffer
 */
export function parseExitSurveyExcel(buffer: ArrayBuffer): ExcelImportPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Exit Survey Excel file is empty.');
  }

  // Header detection
  let headerRowIndex = -1;
  let idColIndex = -1;
  let nameColIndex = -1;

  const idKeywords = ['student id', 'student_id', 'studentid', 'roll', 'usn', 'reg', 'enrollment', 'registration', 's.no', 'sl.no', 'arn', 'id', 'code', 'htno', 'hallticket', 'seat'];
  const nameKeywords = ['name', 'student_name', 'studentname', 'candidate'];

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim().toLowerCase();
      if (!cellVal) continue;

      if (idColIndex === -1 && idKeywords.some((kw) => cellVal.includes(kw))) {
        idColIndex = c;
        headerRowIndex = r;
      }
      if (nameColIndex === -1 && nameKeywords.some((kw) => cellVal.includes(kw)) && !cellVal.includes('id') && !cellVal.includes('roll') && !cellVal.includes('usn') && !cellVal.includes('reg')) {
        nameColIndex = c;
        if (headerRowIndex === -1) headerRowIndex = r;
      }
    }
    if (idColIndex !== -1 && nameColIndex !== -1) break;
  }

  if (headerRowIndex === -1) headerRowIndex = 0;
  if (idColIndex === -1 && nameColIndex !== -1) {
    idColIndex = nameColIndex === 0 ? 1 : 0;
  } else if (idColIndex !== -1 && nameColIndex === -1) {
    nameColIndex = idColIndex === 0 ? 1 : 0;
  } else if (idColIndex === -1 && nameColIndex === -1) {
    idColIndex = 0;
    nameColIndex = (rawRows[headerRowIndex] && rawRows[headerRowIndex].length > 1) ? 1 : 0;
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const coColMap: Record<number, string> = {};
  const detectedCOSet = new Set<string>();

  for (let c = 0; c < headerRow.length; c++) {
    if (c === idColIndex || c === nameColIndex) continue;
    const colHeader = String(headerRow[c] || '').trim().toUpperCase();
    const coMatch = colHeader.match(/(CO\d+)/i);

    if (coMatch) {
      const coCode = coMatch[1].toUpperCase();
      detectedCOSet.add(coCode);
      coColMap[c] = coCode;
    }
  }

  // Fallback if no explicit CO1, CO2 headers were found
  if (detectedCOSet.size === 0) {
    let coCounter = 1;
    for (let c = 0; c < headerRow.length; c++) {
      if (c === idColIndex || c === nameColIndex) continue;
      const coCode = `CO${coCounter++}`;
      detectedCOSet.add(coCode);
      coColMap[c] = coCode;
    }
  }

  const detectedCOs = Array.from(detectedCOSet).sort();
  const surveyRecords: ParsedSurveyRecord[] = [];
  const invalidRows: Array<{ rowNumber: number; reason: string }> = [];
  const studentIdRowTracker: Record<string, number[]> = {};

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawId = row[idColIndex];
    const rawName = row[nameColIndex];
    const studentId = normalizeStudentId(rawId);
    const studentName = normalizeStudentName(rawName);

    if (!studentId && !studentName) continue;

    if (!studentId) {
      invalidRows.push({ rowNumber: r + 1, reason: 'Missing Student ID Number' });
      continue;
    }

    if (!studentIdRowTracker[studentId]) {
      studentIdRowTracker[studentId] = [];
    }
    studentIdRowTracker[studentId].push(r + 1);

    const coResponses: Record<string, { response: string; score: number }> = {};

    Object.entries(coColMap).forEach(([colIdxStr, coCode]) => {
      const colIdx = parseInt(colIdxStr, 10);
      const rawResp = row[colIdx];
      const normalized = normalizeSurveyResponse(rawResp);
      coResponses[coCode] = {
        response: normalized.label,
        score: normalized.score,
      };
    });

    surveyRecords.push({
      studentId,
      studentName: studentName || `Student ${studentId}`,
      coResponses,
      rowIndex: r + 1,
    });
  }

  const duplicates = Object.entries(studentIdRowTracker)
    .filter(([_, rows]) => rows.length > 1)
    .map(([studentId, rows]) => ({ studentId, rows }));

  return {
    assessmentType: 'COURSE_EXIT_SURVEY',
    totalRows: rawRows.length,
    validStudentsCount: surveyRecords.length,
    detectedCOs,
    maxMarksPerCO: {},
    duplicates,
    invalidRows,
    surveyRecords,
  };
}
