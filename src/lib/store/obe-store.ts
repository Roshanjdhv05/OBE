/**
 * OBE System Store — Supabase Database Backend
 * All methods are async and persist data to Supabase.
 * Uses the service-role client to bypass RLS for this internal institution system.
 */

import { createServiceClient } from '@/lib/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES (unchanged shape — used by all pages)
// ─────────────────────────────────────────────────────────────────────────────

export interface AcademicYear {
  id: string;
  yearName: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
}

export interface Programme {
  id: string;
  academicYearId: string;
  programmeName: string;
  programmeCode: string;
}

export interface Semester {
  id: string;
  academicYearId: string;
  programmeId: string;
  semesterName: string;
  semesterNumber: number;
}

export interface Subject {
  id: string;
  academicYearId: string;
  programmeId: string;
  semesterId: string;
  subjectName: string;
  subjectCode: string;
}

export interface CourseOutcome {
  id: string;
  subjectId: string;
  coCode: string;
  description: string;
  displayOrder: number;
}

export interface Student {
  id: string;
  academicYearId: string;
  programmeId: string;
  semesterId: string;
  studentId: string;
  studentName: string;
  batchYear?: string;
}

export interface Assessment {
  id: string;
  academicYearId: string;
  programmeId: string;
  semesterId: string;
  subjectId: string;
  assessmentType: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY';
  fileName: string;
  uploadedBy?: string;
  status: 'COMPLETED';
  uploadedAt: string;
}

export interface StudentCOResult {
  id: string;
  assessmentId: string;
  studentId: string;
  coId: string;
  marksObtained: number;
  maximumMarks: number;
  percentage: number;
  targetPercentage: number;
  attained: boolean;
}

export interface SurveyResponseRecord {
  id: string;
  assessmentId: string;
  studentId: string;
  coId: string;
  response: string;
  score: number;
}

export interface CalculationConfig {
  id: string;
  academicYearId: string;
  subjectId: string;
  studentTargetPercentage: number;
  level1Threshold: number;
  level2Threshold: number;
  level3Threshold: number;
  ciaWeight: number;
  eseWeight: number;
  directWeight: number;
  indirectWeight: number;
  surveyMaxScore: number;
  ciaMaxMarks?: number;
  eseMaxMarks?: number;
  coTargetLevels?: Record<string, number>;
}

export interface ProgrammeAllocation {
  programmeId: string;
  semesterIds: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'super_admin' | 'faculty';
  active: boolean;
  createdAt: string;
  allocations?: ProgrammeAllocation[];
}

export interface PSO {
  id: string;
  academicYearId: string;
  programmeId: string;
  psoCode: string;
  description: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  module: string;
  recordDetails?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function db() {
  return createServiceClient();
}

function mapAY(row: any): AcademicYear {
  return {
    id: row.id,
    yearName: row.year_name,
    startYear: row.start_year,
    endYear: row.end_year,
    isActive: row.is_active,
  };
}

function mapProg(row: any): Programme {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeName: row.programme_name,
    programmeCode: row.programme_code,
  };
}

function mapSem(row: any): Semester {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeId: row.programme_id,
    semesterName: row.semester_name,
    semesterNumber: row.semester_number,
  };
}

function mapSub(row: any): Subject {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeId: row.programme_id,
    semesterId: row.semester_id,
    subjectName: row.subject_name,
    subjectCode: row.subject_code,
  };
}

function mapCO(row: any): CourseOutcome {
  return {
    id: row.id,
    subjectId: row.subject_id,
    coCode: row.co_code,
    description: row.description,
    displayOrder: row.display_order,
  };
}

function mapStudent(row: any): Student {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeId: row.programme_id,
    semesterId: row.semester_id,
    studentId: row.student_id ?? row.student_id_code ?? '',
    studentName: row.student_name,
    batchYear: row.batch_year,
  };
}

function mapAssessment(row: any): Assessment {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeId: row.programme_id,
    semesterId: row.semester_id,
    subjectId: row.subject_id,
    assessmentType: row.assessment_type,
    fileName: row.file_name,
    uploadedBy: row.uploaded_by,
    status: 'COMPLETED',
    uploadedAt: row.uploaded_at,
  };
}

function mapResult(row: any): StudentCOResult {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    coId: row.co_id,
    marksObtained: Number(row.marks_obtained),
    maximumMarks: Number(row.maximum_marks),
    percentage: Number(row.percentage),
    targetPercentage: Number(row.target_percentage),
    attained: row.attained,
  };
}

function mapSurvey(row: any): SurveyResponseRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    coId: row.co_id,
    response: row.response,
    score: row.score,
  };
}

function mapConfig(row: any): CalculationConfig {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    subjectId: row.subject_id,
    studentTargetPercentage: Number(row.student_target_percentage),
    level1Threshold: Number(row.level_1_threshold),
    level2Threshold: Number(row.level_2_threshold),
    level3Threshold: Number(row.level_3_threshold),
    ciaWeight: Number(row.cia_weight ?? 0.5),
    eseWeight: Number(row.ese_weight ?? 0.5),
    directWeight: Number(row.direct_weight),
    indirectWeight: Number(row.indirect_weight),
    surveyMaxScore: Number(row.survey_max_score),
    ciaMaxMarks: Number(row.cia_max_marks ?? 50),
    eseMaxMarks: Number(row.ese_max_marks ?? 50),
    coTargetLevels: row.co_target_levels || {},
  };
}

function mapUser(row: any, allocations: ProgrammeAllocation[] = []): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    allocations,
  };
}

function mapPSO(row: any): PSO {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    programmeId: row.programme_id,
    psoCode: row.pso_code,
    description: row.description,
  };
}

function mapLog(row: any): AuditLog {
  return {
    id: row.id,
    userEmail: row.user_email || '',
    action: row.action,
    module: row.module,
    recordDetails: row.record_details ? JSON.stringify(row.record_details) : undefined,
    createdAt: row.created_at,
  };
}

// Default config when none stored
const DEFAULT_CONFIG: Omit<CalculationConfig, 'id' | 'academicYearId' | 'subjectId'> = {
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
};

// ─────────────────────────────────────────────────────────────────────────────
// OBEStore — Async Supabase backend
// ─────────────────────────────────────────────────────────────────────────────

export class OBEStore {
  // ── ACADEMIC YEARS ──────────────────────────────────────────────────────────

  static async getAcademicYears(): Promise<AcademicYear[]> {
    const { data } = await db().from('academic_years').select('*').order('start_year');
    return (data || []).map(mapAY);
  }

  static async getActiveAcademicYear(): Promise<AcademicYear | null> {
    const { data } = await db()
      .from('academic_years')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (data) return mapAY(data);
    // Fallback to first year
    const { data: first } = await db()
      .from('academic_years')
      .select('*')
      .order('start_year')
      .limit(1)
      .maybeSingle();
    return first ? mapAY(first) : null;
  }

  static async setActiveAcademicYear(id: string): Promise<void> {
    const supabase = db();
    await supabase.from('academic_years').update({ is_active: false }).neq('id', id);
    await supabase.from('academic_years').update({ is_active: true }).eq('id', id);
  }

  static async addAcademicYear(yearName: string, startYear: number, endYear: number): Promise<AcademicYear> {
    const supabase = db();
    const { count } = await supabase.from('academic_years').select('*', { count: 'exact', head: true });
    const isFirst = (count || 0) === 0;
    const { data, error } = await supabase
      .from('academic_years')
      .insert({ year_name: yearName, start_year: startYear, end_year: endYear, is_active: isFirst })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Created Academic Year: ${yearName}`, 'Academic Year');
    return mapAY(data);
  }

  static async updateAcademicYear(id: string, yearName: string, startYear: number, endYear: number): Promise<void> {
    await db()
      .from('academic_years')
      .update({ year_name: yearName, start_year: startYear, end_year: endYear })
      .eq('id', id);
    await OBEStore.addAuditLog(`Updated Academic Year: ${yearName}`, 'Academic Year');
  }

  static async deleteAcademicYear(id: string): Promise<void> {
    await db().from('academic_years').delete().eq('id', id);
    await OBEStore.addAuditLog('Deleted Academic Year', 'Academic Year');
  }

  // ── PROGRAMMES ──────────────────────────────────────────────────────────────

  static async getProgrammes(academicYearId?: string): Promise<Programme[]> {
    let q = db().from('programmes').select('*').order('programme_code');
    if (academicYearId) q = q.eq('academic_year_id', academicYearId);
    const { data } = await q;
    return (data || []).map(mapProg);
  }

  static async addProgramme(academicYearId: string, name: string, code: string): Promise<Programme> {
    const { data, error } = await db()
      .from('programmes')
      .insert({ academic_year_id: academicYearId, programme_name: name, programme_code: code })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Created Programme: ${code} - ${name}`, 'Programme');
    return mapProg(data);
  }

  // ── SEMESTERS ───────────────────────────────────────────────────────────────

  static async getSemesters(programmeId?: string): Promise<Semester[]> {
    let q = db().from('semesters').select('*').order('semester_number');
    if (programmeId) q = q.eq('programme_id', programmeId);
    const { data } = await q;
    return (data || []).map(mapSem);
  }

  static async addSemester(academicYearId: string, programmeId: string, name: string, num: number): Promise<Semester> {
    const { data, error } = await db()
      .from('semesters')
      .insert({ academic_year_id: academicYearId, programme_id: programmeId, semester_name: name, semester_number: num })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Added Semester: ${name}`, 'Semester');
    return mapSem(data);
  }

  // ── SUBJECTS ────────────────────────────────────────────────────────────────

  static async getSubjects(semesterId?: string): Promise<Subject[]> {
    let q = db().from('subjects').select('*').order('subject_code');
    if (semesterId) q = q.eq('semester_id', semesterId);
    const { data } = await q;
    return (data || []).map(mapSub);
  }

  static async addSubject(academicYearId: string, programmeId: string, semesterId: string, name: string, code: string): Promise<Subject> {
    const { data, error } = await db()
      .from('subjects')
      .insert({ academic_year_id: academicYearId, programme_id: programmeId, semester_id: semesterId, subject_name: name, subject_code: code })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Added Subject: ${code} - ${name}`, 'Subject');
    return mapSub(data);
  }

  // ── COURSE OUTCOMES ─────────────────────────────────────────────────────────

  static async getCourseOutcomes(subjectId?: string): Promise<CourseOutcome[]> {
    let q = db().from('course_outcomes').select('*').order('display_order');
    if (subjectId) q = q.eq('subject_id', subjectId);
    const { data } = await q;
    return (data || []).map(mapCO);
  }

  static async addCourseOutcome(subjectId: string, coCode: string, description: string): Promise<CourseOutcome> {
    const { data: existing } = await db().from('course_outcomes').select('id').eq('subject_id', subjectId);
    const order = (existing || []).length + 1;
    const { data, error } = await db()
      .from('course_outcomes')
      .insert({ subject_id: subjectId, co_code: coCode, description, display_order: order })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Created ${coCode} for Subject ID ${subjectId}`, 'Course Outcome');
    return mapCO(data);
  }

  static async updateCourseOutcome(id: string, description: string): Promise<void> {
    await db().from('course_outcomes').update({ description }).eq('id', id);
  }

  static async deleteCourseOutcome(id: string): Promise<void> {
    await db().from('course_outcomes').delete().eq('id', id);
  }

  // ── USERS ────────────────────────────────────────────────────────────────────

  static async getUsers(): Promise<UserProfile[]> {
    const supabase = db();
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Fetch all allocations
    const { data: allAllocs } = await supabase
      .from('user_allocations')
      .select('user_id, programme_id, semester_id');

    // Group allocations by user_id -> programmeId -> semesterIds[]
    const allocMap: Record<string, Record<string, string[]>> = {};
    (allAllocs || []).forEach((a: any) => {
      if (!allocMap[a.user_id]) allocMap[a.user_id] = {};
      if (!allocMap[a.user_id][a.programme_id]) allocMap[a.user_id][a.programme_id] = [];
      allocMap[a.user_id][a.programme_id].push(a.semester_id);
    });

    return (users || []).map((u: any) => {
      const userAllocations: ProgrammeAllocation[] = Object.entries(allocMap[u.id] || {}).map(
        ([progId, semIds]) => ({ programmeId: progId, semesterIds: semIds })
      );
      return mapUser(u, userAllocations);
    });
  }

  static async addUser(
    username: string,
    displayName: string,
    email: string,
    role: 'super_admin' | 'faculty',
    allocations: ProgrammeAllocation[] = [],
    password?: string
  ): Promise<UserProfile> {
    const supabase = db();
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        display_name: displayName,
        email,
        role,
        active: true,
        password_hash: password || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert allocations into user_allocations table
    if (role === 'faculty' && allocations.length > 0) {
      const allocRows: any[] = [];
      allocations.forEach((alloc) => {
        alloc.semesterIds.forEach((semId) => {
          allocRows.push({ user_id: data.id, programme_id: alloc.programmeId, semester_id: semId });
        });
      });
      if (allocRows.length > 0) {
        await supabase.from('user_allocations').insert(allocRows);
      }
    }

    await OBEStore.addAuditLog(`Created User Access: ${username} (${role})`, 'User Management');
    return mapUser(data, allocations);
  }

  static async updateUserAllocations(userId: string, allocations: ProgrammeAllocation[]): Promise<void> {
    const supabase = db();
    // Delete old allocations
    await supabase.from('user_allocations').delete().eq('user_id', userId);
    // Insert new allocations
    if (allocations.length > 0) {
      const allocRows: any[] = [];
      allocations.forEach((alloc) => {
        alloc.semesterIds.forEach((semId) => {
          allocRows.push({ user_id: userId, programme_id: alloc.programmeId, semester_id: semId });
        });
      });
      if (allocRows.length > 0) {
        await supabase.from('user_allocations').insert(allocRows);
      }
    }
    await OBEStore.addAuditLog(`Updated programme allocations for user ID ${userId}`, 'User Management');
  }

  static async toggleUserStatus(userId: string): Promise<void> {
    const { data } = await db().from('users').select('active').eq('id', userId).single();
    if (data) {
      await db().from('users').update({ active: !data.active }).eq('id', userId);
      await OBEStore.addAuditLog(`Toggled status for user ID ${userId}`, 'User Management');
    }
  }

  // ── ASSESSMENTS & MARKS IMPORT ───────────────────────────────────────────────

  static async saveAssessmentImport(
    academicYearId: string,
    programmeId: string,
    semesterId: string,
    subjectId: string,
    assessmentType: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY',
    fileName: string,
    studentRecords: any[],
    detectedCOs: string[]
  ): Promise<void> {
    const supabase = db();

    // 1. Delete previous assessments for this subject+type
    const { data: oldAssessments } = await supabase
      .from('assessments')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType);

    if (oldAssessments && oldAssessments.length > 0) {
      const oldIds = oldAssessments.map((a: any) => a.id);
      await supabase.from('student_co_results').delete().in('assessment_id', oldIds);
      await supabase.from('survey_responses').delete().in('assessment_id', oldIds);
      await supabase.from('assessments').delete().in('id', oldIds);
    }

    // 2. Create new assessment record
    const { data: assessment, error: aErr } = await supabase
      .from('assessments')
      .insert({
        academic_year_id: academicYearId,
        programme_id: programmeId,
        semester_id: semesterId,
        subject_id: subjectId,
        assessment_type: assessmentType,
        file_name: fileName,
        status: 'COMPLETED',
      })
      .select()
      .single();
    if (aErr) throw aErr;

    // 3. Ensure COs exist — upsert by subject+co_code
    const { data: existingCOs } = await supabase
      .from('course_outcomes')
      .select('*')
      .eq('subject_id', subjectId);

    const coMap: Record<string, string> = {}; // coCode -> coId
    (existingCOs || []).forEach((c: any) => { coMap[c.co_code] = c.id; });

    for (let i = 0; i < detectedCOs.length; i++) {
      const coCode = detectedCOs[i];
      if (!coMap[coCode]) {
        const { data: newCO } = await supabase
          .from('course_outcomes')
          .insert({ subject_id: subjectId, co_code: coCode, description: `${coCode} Learning Outcome`, display_order: i + 1 })
          .select('id, co_code')
          .single();
        if (newCO) coMap[newCO.co_code] = newCO.id;
      }
    }

    // 4. Batch resolve students (fetch existing + batch insert missing)
    const { data: existingStudents } = await supabase
      .from('students')
      .select('*')
      .eq('academic_year_id', academicYearId)
      .eq('programme_id', programmeId)
      .eq('semester_id', semesterId);

    const studentMap: Record<string, string> = {};
    (existingStudents || []).forEach((s: any) => {
      const code = s.student_id || s.student_id_code;
      if (code) studentMap[code] = s.id;
    });

    const newStudentRowsToInsert: any[] = [];
    studentRecords.forEach((rec) => {
      if (rec.studentId && !studentMap[rec.studentId]) {
        newStudentRowsToInsert.push({
          academic_year_id: academicYearId,
          programme_id: programmeId,
          semester_id: semesterId,
          student_id: rec.studentId,
          student_name: rec.studentName || rec.studentId,
        });
      }
    });

    if (newStudentRowsToInsert.length > 0) {
      const uniqueMap = new Map<string, any>();
      newStudentRowsToInsert.forEach((row) => {
        if (!uniqueMap.has(row.student_id)) {
          uniqueMap.set(row.student_id, row);
        }
      });

      const rowsToInsert = Array.from(uniqueMap.values());

      // Try inserting with student_id_code column first (for compatibility), then without
      let insertResult = await supabase
        .from('students')
        .insert(rowsToInsert.map((r) => ({ ...r, student_id_code: r.student_id })))
        .select('*');

      if (insertResult.error) {
        // Fallback: insert without student_id_code (column may not exist)
        insertResult = await supabase
          .from('students')
          .insert(rowsToInsert)
          .select('*');
      }

      if (insertResult.error) {
        // Last resort: insert one-by-one to skip any duplicate conflicts
        for (const row of rowsToInsert) {
          const { data: oneRow } = await supabase
            .from('students')
            .upsert(row, { onConflict: 'academic_year_id,programme_id,semester_id,student_id', ignoreDuplicates: true })
            .select('*')
            .maybeSingle();
          if (oneRow) {
            const code = oneRow.student_id || oneRow.student_id_code;
            if (code) studentMap[code] = oneRow.id;
          }
        }
      } else {
        (insertResult.data || []).forEach((s: any) => {
          const code = s.student_id || s.student_id_code;
          if (code) studentMap[code] = s.id;
        });
      }

      // Re-fetch existing students to pick up any that were already there (upsert may have returned nothing)
      if (Object.keys(studentMap).length < studentRecords.length) {
        const { data: recheck } = await supabase
          .from('students')
          .select('*')
          .eq('academic_year_id', academicYearId)
          .eq('programme_id', programmeId)
          .eq('semester_id', semesterId);
        (recheck || []).forEach((s: any) => {
          const code = s.student_id || s.student_id_code;
          if (code && !studentMap[code]) studentMap[code] = s.id;
        });
      }
    }

    const resultsToInsert: any[] = [];
    const surveyToInsert: any[] = [];

    for (const rec of studentRecords) {
      const studentUUID = studentMap[rec.studentId];
      if (!studentUUID) continue;

      if (assessmentType === 'CIA' || assessmentType === 'ESE') {
        Object.entries(rec.coMarks || {}).forEach(([coCode, marksInfo]: [string, any]) => {
          const coId = coMap[coCode];
          if (coId && marksInfo.obtained !== undefined && marksInfo.obtained !== null) {
            const pct = (marksInfo.obtained / (marksInfo.max || 100)) * 100;
            resultsToInsert.push({
              assessment_id: assessment.id,
              student_id: studentUUID,
              co_id: coId,
              marks_obtained: marksInfo.obtained,
              maximum_marks: marksInfo.max || 100,
              percentage: Number(pct.toFixed(2)),
              target_percentage: 50,
              attained: pct >= 50,
            });
          }
        });
      } else if (assessmentType === 'COURSE_EXIT_SURVEY') {
        Object.entries(rec.coResponses || {}).forEach(([coCode, respInfo]: [string, any]) => {
          const coId = coMap[coCode];
          if (coId) {
            surveyToInsert.push({
              assessment_id: assessment.id,
              student_id: studentUUID,
              co_id: coId,
              response: respInfo.response || '',
              score: respInfo.score || 0,
            });
          }
        });
      }
    }

    if (resultsToInsert.length > 0) {
      for (let i = 0; i < resultsToInsert.length; i += 500) {
        const chunk = resultsToInsert.slice(i, i + 500);
        const { error: rErr } = await supabase.from('student_co_results').insert(chunk);
        if (rErr) throw rErr;
      }
    }

    if (surveyToInsert.length > 0) {
      for (let i = 0; i < surveyToInsert.length; i += 500) {
        const chunk = surveyToInsert.slice(i, i + 500);
        const { error: svErr } = await supabase.from('survey_responses').insert(chunk);
        if (svErr) throw svErr;
      }
    }

    await OBEStore.addAuditLog(`Uploaded & calculated ${assessmentType} file: ${fileName}`, assessmentType);
  }

  static async getAssessments(subjectId?: string, type?: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY'): Promise<Assessment[]> {
    let q = db().from('assessments').select('*').order('uploaded_at');
    if (subjectId) q = q.eq('subject_id', subjectId);
    if (type) q = q.eq('assessment_type', type);
    const { data } = await q;
    return (data || []).map(mapAssessment);
  }

  static async getStudentCoResults(assessmentId: string): Promise<StudentCOResult[]> {
    const { data } = await db()
      .from('student_co_results')
      .select('*')
      .eq('assessment_id', assessmentId);
    return (data || []).map(mapResult);
  }

  static async getSurveyResponses(assessmentId: string): Promise<SurveyResponseRecord[]> {
    const { data } = await db()
      .from('survey_responses')
      .select('*')
      .eq('assessment_id', assessmentId);
    return (data || []).map(mapSurvey);
  }

  static async getStudents(semesterId?: string): Promise<Student[]> {
    let q = db().from('students').select('*').order('student_id');
    if (semesterId) q = q.eq('semester_id', semesterId);
    const { data, error } = await q;
    if (error) console.error('getStudents error:', error);
    return (data || []).map(mapStudent);
  }

  static async getStudentsByProgramme(programmeId: string): Promise<Student[]> {
    const { data, error } = await db()
      .from('students')
      .select('*')
      .eq('programme_id', programmeId)
      .order('student_id');
    if (error) console.error('getStudentsByProgramme error:', error);
    return (data || []).map(mapStudent);
  }

  static async getAllStudents(): Promise<Student[]> {
    const { data, error } = await db()
      .from('students')
      .select('*')
      .order('student_id');
    if (error) console.error('getAllStudents error:', error);
    return (data || []).map(mapStudent);
  }

  // ── CALCULATION CONFIGS ──────────────────────────────────────────────────────

  static async getCalculationConfig(subjectId: string): Promise<CalculationConfig> {
    let localConfig: CalculationConfig | null = null;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('obe_config_' + subjectId);
      if (stored) {
        try {
          localConfig = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse local config', e);
        }
      }
    }

    try {
      const { data, error } = await db()
        .from('calculation_configs')
        .select('*')
        .eq('subject_id', subjectId)
        .maybeSingle();

      if (data && !error) {
        const mapped = mapConfig(data);
        return {
          ...mapped,
          ciaMaxMarks: localConfig?.ciaMaxMarks ?? mapped.ciaMaxMarks ?? 50,
          eseMaxMarks: localConfig?.eseMaxMarks ?? mapped.eseMaxMarks ?? 50,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch failed for calculation_configs, using fallback:', err);
    }

    if (localConfig) {
      return localConfig;
    }

    return {
      id: 'cfg-' + subjectId,
      academicYearId: '',
      subjectId,
      ...DEFAULT_CONFIG,
    };
  }

  static async updateCalculationConfig(config: CalculationConfig): Promise<void> {
    if (typeof window !== 'undefined') {
      // Merge with any existing localStorage entry to preserve fields (e.g. ciaMaxMarks/eseMaxMarks)
      // that the calling page may not have included in its local config shape.
      let existing: Partial<CalculationConfig> = {};
      try {
        const raw = localStorage.getItem('obe_config_' + config.subjectId);
        if (raw) existing = JSON.parse(raw);
      } catch { /* ignore */ }
      const merged = {
        ...existing,
        ...config,
        // Always prefer explicitly provided values; fall back to previously-stored ones.
        ciaMaxMarks: config.ciaMaxMarks ?? existing.ciaMaxMarks ?? 50,
        eseMaxMarks: config.eseMaxMarks ?? existing.eseMaxMarks ?? 50,
      };
      localStorage.setItem('obe_config_' + config.subjectId, JSON.stringify(merged));
    }

    const supabase = db();
    const row: any = {
      academic_year_id: config.academicYearId || null,
      subject_id: config.subjectId,
      student_target_percentage: config.studentTargetPercentage,
      level_1_threshold: config.level1Threshold,
      level_2_threshold: config.level2Threshold,
      level_3_threshold: config.level3Threshold,
      cia_weight: config.ciaWeight,
      ese_weight: config.eseWeight,
      direct_weight: config.directWeight,
      indirect_weight: config.indirectWeight,
      survey_max_score: config.surveyMaxScore,
      cia_max_marks: config.ciaMaxMarks ?? 50,
      ese_max_marks: config.eseMaxMarks ?? 50,
      co_target_levels: config.coTargetLevels || {},
    };

    try {
      const { data: existing } = await supabase
        .from('calculation_configs')
        .select('id')
        .eq('subject_id', config.subjectId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('calculation_configs').update(row).eq('subject_id', config.subjectId);
        if (error) {
          delete row.cia_max_marks;
          delete row.ese_max_marks;
          await supabase.from('calculation_configs').update(row).eq('subject_id', config.subjectId);
        }
      } else {
        const { error } = await supabase.from('calculation_configs').insert(row);
        if (error) {
          delete row.cia_max_marks;
          delete row.ese_max_marks;
          await supabase.from('calculation_configs').insert(row);
        }
      }
    } catch (err) {
      console.warn('Could not save calculation_configs to Supabase:', err);
    }
    await OBEStore.addAuditLog('Updated Calculation Configuration for Subject', 'Calculation Settings');
  }

  // ── PSOs ─────────────────────────────────────────────────────────────────────

  static async getPSOs(programmeId?: string): Promise<PSO[]> {
    let q = db().from('psos').select('*').order('pso_code');
    if (programmeId) q = q.eq('programme_id', programmeId);
    const { data } = await q;
    return (data || []).map(mapPSO);
  }

  static async addPSO(academicYearId: string, programmeId: string, psoCode: string, description: string): Promise<PSO> {
    const { data, error } = await db()
      .from('psos')
      .insert({ academic_year_id: academicYearId, programme_id: programmeId, pso_code: psoCode, description })
      .select()
      .single();
    if (error) throw error;
    await OBEStore.addAuditLog(`Created PSO: ${psoCode}`, 'PSO Management');
    return mapPSO(data);
  }

  // ── AUDIT LOGS ───────────────────────────────────────────────────────────────

  static async getAuditLogs(): Promise<AuditLog[]> {
    const { data } = await db()
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return (data || []).map(mapLog);
  }

  static async addAuditLog(action: string, module: string, recordDetails?: any): Promise<void> {
    await db()
      .from('audit_logs')
      .insert({
        user_email: 'system@institution.edu',
        action,
        module,
        record_details: recordDetails || null,
      });
  }
}
