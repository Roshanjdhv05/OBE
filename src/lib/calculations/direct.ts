/**
 * Direct Attainment Engine
 * Combines CIA Attainment + ESE Attainment
 *
 * IMPORTANT: These functions return FULL-PRECISION floats intentionally.
 * Round only at the final display step to avoid accumulated rounding errors.
 */

/**
 * Calculates Direct Attainment for a CO (full precision, no rounding):
 * Direct = (CIA Attainment * ciaWeight) + (ESE Attainment * eseWeight)
 * Default weights: CIA = 40% (0.40), ESE = 60% (0.60)
 */
export function calculateDirectAttainment(
  ciaAttainment: number,
  eseAttainment: number,
  ciaWeight: number = 0.40,
  eseWeight: number = 0.60
): number {
  return (ciaAttainment * ciaWeight) + (eseAttainment * eseWeight);
}

/**
 * Applies Direct Weightage (Default 80% / 0.80) — full precision, no rounding:
 * Weighted Direct = Direct Attainment * directWeight
 */
export function calculateWeightedDirect(directAttainment: number, directWeight: number = 0.80): number {
  return directAttainment * directWeight;
}
