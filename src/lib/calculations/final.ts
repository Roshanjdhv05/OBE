/**
 * Final CO Attainment & Attainment Score Engine
 */

/**
 * Combines Weighted Direct + Weighted Indirect
 * Final CO Attainment = (Direct * 0.80) + (Indirect * 0.20)
 */
export function calculateFinalAttainment(weightedDirect: number, weightedIndirect: number): number {
  const finalAttainment = weightedDirect + weightedIndirect;
  return Number(finalAttainment.toFixed(2));
}

/**
 * Calculates normalized CO Attainment Score:
 * CO Attainment Score = Final CO Attainment / 100
 */
export function calculateCOAttainmentScore(finalAttainment: number): number {
  const score = finalAttainment / 100;
  return Number(score.toFixed(4));
}
