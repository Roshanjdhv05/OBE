/**
 * ESE (End Semester Examination) Calculation Engine
 */

export function calculateESEStudentPercentage(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  const pct = (obtained / max) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(2));
}

export function evaluateESESkillAttainment(percentage: number, targetThreshold: number = 50): boolean {
  return percentage >= targetThreshold;
}

export function calculateESECOAttainment(attainedStudentsCount: number, totalValidStudents: number): number {
  if (!totalValidStudents || totalValidStudents <= 0) return 0;
  const pct = (attainedStudentsCount / totalValidStudents) * 100;
  return Number(pct.toFixed(2));
}
