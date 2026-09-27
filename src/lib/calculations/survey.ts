/**
 * Course Exit Survey / Indirect Attainment Engine
 *
 * Grade scale (as entered by students):
 *   Grade 1 = Very Satisfied     → weight ×5
 *   Grade 2 = Satisfied          → weight ×4
 *   Grade 3 = Unsure             → weight ×3
 *   Grade 4 = Dissatisfied       → weight ×2
 *   Grade 5 = Very Dissatisfied  → weight ×1
 *
 * The score stored in the DB is the raw grade number (1–5).
 * The weighted average gives higher values for more satisfied responses.
 */

export interface ResponseBreakdown {
  verySatisfied: number;    // grade 1 responses
  satisfied: number;        // grade 2 responses
  unsure: number;           // grade 3 responses
  dissatisfied: number;     // grade 4 responses
  veryDissatisfied: number; // grade 5 responses
}

/**
 * Normalizes a raw survey response to a grade number (1–5):
 *   1 = Very Satisfied, 2 = Satisfied, 3 = Unsure, 4 = Dissatisfied, 5 = Very Dissatisfied
 */
export function normalizeSurveyResponse(rawResponse: any): { label: string; score: number } {
  if (rawResponse === null || rawResponse === undefined || rawResponse === '') {
    return { label: 'Unsure', score: 3 };
  }

  // Handle direct numeric input — treat as grade number
  if (typeof rawResponse === 'number') {
    const val = Math.round(rawResponse);
    if (val === 1) return { label: 'Very Satisfied', score: 1 };
    if (val === 2) return { label: 'Satisfied', score: 2 };
    if (val === 3) return { label: 'Unsure', score: 3 };
    if (val === 4) return { label: 'Dissatisfied', score: 4 };
    if (val === 5) return { label: 'Very Dissatisfied', score: 5 };
  }

  const cleaned = String(rawResponse).trim().toLowerCase();

  // Evaluate dissatisfied FIRST because the substring "satisfied" is present in "dissatisfied"
  if (cleaned.includes('very dissatisfied') || cleaned === 'vd') {
    return { label: 'Very Dissatisfied', score: 5 };
  }
  if (cleaned.includes('dissatisfied') || cleaned === 'd') {
    return { label: 'Dissatisfied', score: 4 };
  }
  if (cleaned.includes('very satisfied') || cleaned === 'vs') {
    return { label: 'Very Satisfied', score: 1 };
  }
  if (cleaned.includes('satisfied') || cleaned === 's') {
    return { label: 'Satisfied', score: 2 };
  }
  if (cleaned.includes('unsure') || cleaned === 'u' || cleaned.includes('neutral')) {
    return { label: 'Unsure', score: 3 };
  }

  // Numeric string: treat digit as grade number
  const digitMatch = cleaned.match(/([1-5])/);
  if (digitMatch) {
    const grade = parseInt(digitMatch[1], 10);
    const labels: Record<number, string> = {
      1: 'Very Satisfied',
      2: 'Satisfied',
      3: 'Unsure',
      4: 'Dissatisfied',
      5: 'Very Dissatisfied',
    };
    return { label: labels[grade] || 'Unsure', score: grade };
  }

  return { label: 'Unsure', score: 3 };
}

/**
 * Calculates Weighted Average (range 1–5, higher = more satisfied):
 *   (Grade1×5 + Grade2×4 + Grade3×3 + Grade4×2 + Grade5×1) / Total
 *
 * Grade 1 responses (Very Satisfied) get weight 5 — best.
 * Grade 5 responses (Very Dissatisfied) get weight 1 — worst.
 */
export function calculateSurveyWeightedAverage(breakdown: ResponseBreakdown): number {
  const total =
    breakdown.verySatisfied +
    breakdown.satisfied +
    breakdown.unsure +
    breakdown.dissatisfied +
    breakdown.veryDissatisfied;

  if (!total || total <= 0) return 0;

  const totalScore =
    breakdown.verySatisfied * 5 +   // grade 1 × 5
    breakdown.satisfied * 4 +       // grade 2 × 4
    breakdown.unsure * 3 +          // grade 3 × 3
    breakdown.dissatisfied * 2 +    // grade 4 × 2
    breakdown.veryDissatisfied * 1; // grade 5 × 1

  const weightedAvg = totalScore / total;
  return Number(weightedAvg.toFixed(4));
}

/**
 * Converts weighted average to Indirect CO Percentage:
 * (Weighted Average / maxScore) * 100
 */
export function calculateIndirectPercentage(weightedAverage: number, maxScore: number = 5): number {
  if (!maxScore || maxScore <= 0) return 0;
  const pct = (weightedAverage / maxScore) * 100;
  return Number(pct.toFixed(2));
}
