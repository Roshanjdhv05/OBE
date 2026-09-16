/**
 * Course Exit Survey / Indirect Attainment Engine
 */

export interface ResponseBreakdown {
  verySatisfied: number;    // score 1
  satisfied: number;        // score 2
  unsure: number;           // score 3
  dissatisfied: number;     // score 4
  veryDissatisfied: number; // score 5
}

/**
 * Normalizes case-insensitive survey response string to score 1..5:
 * 1 = Very Satisfied, 2 = Satisfied, 3 = Unsure, 4 = Dissatisfied, 5 = Very Dissatisfied
 */
export function normalizeSurveyResponse(rawResponse: any): { label: string; score: number } {
  if (rawResponse === null || rawResponse === undefined || rawResponse === '') {
    return { label: 'Unsure', score: 3 };
  }

  // Handle direct numeric input
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
  if (cleaned.includes('very dissatisfied') || cleaned === '5' || cleaned === 'vd') {
    return { label: 'Very Dissatisfied', score: 5 };
  }
  if (cleaned.includes('dissatisfied') || cleaned === '4' || cleaned === 'd') {
    return { label: 'Dissatisfied', score: 4 };
  }
  if (cleaned.includes('very satisfied') || cleaned === '1' || cleaned === 'vs') {
    return { label: 'Very Satisfied', score: 1 };
  }
  if (cleaned.includes('satisfied') || cleaned === '2' || cleaned === 's') {
    return { label: 'Satisfied', score: 2 };
  }
  if (cleaned.includes('unsure') || cleaned === '3' || cleaned === 'u' || cleaned.includes('neutral')) {
    return { label: 'Unsure', score: 3 };
  }

  const digitMatch = cleaned.match(/([1-5])/);
  if (digitMatch) {
    const score = parseInt(digitMatch[1], 10);
    const labels: Record<number, string> = {
      1: 'Very Satisfied',
      2: 'Satisfied',
      3: 'Unsure',
      4: 'Dissatisfied',
      5: 'Very Dissatisfied',
    };
    return { label: labels[score] || 'Unsure', score };
  }

  return { label: 'Unsure', score: 3 };
}

/**
 * Calculates Weighted Average score (1 to 5):
 * (VS*1 + S*2 + U*3 + D*4 + VD*5) / Total Responses
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
    breakdown.verySatisfied * 1 +
    breakdown.satisfied * 2 +
    breakdown.unsure * 3 +
    breakdown.dissatisfied * 4 +
    breakdown.veryDissatisfied * 5;

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
