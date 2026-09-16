/**
 * Interpretation Engine
 * Generates automated academic performance narrative based on attainment percentage
 */

export interface InterpretationResult {
  category: 'High Attainment' | 'Moderate Attainment' | 'Low Attainment';
  badgeColor: string;
  narrative: string;
}

export function generateCOInterpretation(attainmentPercentage: number, coCode: string = 'CO'): InterpretationResult {
  if (attainmentPercentage >= 70) {
    return {
      category: 'High Attainment',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      narrative: `Highest attainment. Indicates good achievement of the learning outcome. Students have demonstrated a satisfactory to strong understanding of the concepts and skills associated with ${coCode}.`,
    };
  } else if (attainmentPercentage >= 50) {
    return {
      category: 'Moderate Attainment',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      narrative: `Moderate attainment. Indicates that students have achieved the outcome partially, but there is considerable scope for improvement in conceptual understanding and application.`,
    };
  } else {
    return {
      category: 'Low Attainment',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      narrative: `Low attainment. Students have demonstrated basic achievement, but additional practice, application-based learning and reinforcement are required.`,
    };
  }
}
