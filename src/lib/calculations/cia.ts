/**
 * CIA (Continuous Internal Assessment) Calculation Engine
 */

export interface StudentCOResultInput {
  studentId: string;
  studentName: string;
  obtainedMarks: number;
  maximumMarks: number;
}

export interface COAttainmentSummary {
  coCode: string;
  totalStudents: number;
  attainedCount: number;
  attainmentPercentage: number; // CIA CO Attainment %
}

/**
 * Calculates student CO percentage: (Obtained / Max) * 100
 */
export function calculateStudentCOPercentage(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  const pct = (obtained / max) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(2));
}

/**
 * Evaluates whether student achieved the target threshold (default 50%)
 */
export function evaluateStudentAttainment(percentage: number, targetThreshold: number = 50): boolean {
  return percentage >= targetThreshold;
}

/**
 * Calculates CIA CO Attainment Percentage across all valid students:
 * (Number of students achieving target / Total valid students) * 100
 */
export function calculateCIACOAttainment(attainedStudentsCount: number, totalValidStudents: number): number {
  if (!totalValidStudents || totalValidStudents <= 0) return 0;
  const pct = (attainedStudentsCount / totalValidStudents) * 100;
  return Number(pct.toFixed(2));
}
