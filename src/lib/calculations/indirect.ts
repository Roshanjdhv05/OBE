/**
 * Indirect Attainment Weighting Engine
 *
 * IMPORTANT: Returns full-precision float — round only at the final display step.
 */

/**
 * Applies Indirect Weightage (Default 20% / 0.20) — full precision, no rounding:
 * Weighted Indirect = Indirect Percentage * indirectWeight
 */
export function calculateWeightedIndirect(indirectPercentage: number, indirectWeight: number = 0.20): number {
  return indirectPercentage * indirectWeight;
}
