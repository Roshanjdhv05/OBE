/**
 * Attainment Level Engine (Level 1, Level 2, Level 3)
 */

export interface AttainmentLevelConfig {
  level1: number; // default 50%
  level2: number; // default 60%
  level3: number; // default 70%
}

export const DEFAULT_ATTAINMENT_LEVEL_CONFIG: AttainmentLevelConfig = {
  level1: 50,
  level2: 60,
  level3: 70,
};

export interface AttainmentLevelResult {
  levelLabel: 'Level 3' | 'Level 2' | 'Level 1' | 'Below Threshold';
  levelNumber: number; // 3, 2, 1, or 0
  colorClass: string;
}

/**
 * Evaluates CO attainment percentage against configurable level thresholds
 */
export function evaluateAttainmentLevel(
  attainmentPercentage: number,
  config: AttainmentLevelConfig = DEFAULT_ATTAINMENT_LEVEL_CONFIG
): AttainmentLevelResult {
  if (attainmentPercentage >= config.level3) {
    return {
      levelLabel: 'Level 3',
      levelNumber: 3,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  } else if (attainmentPercentage >= config.level2) {
    return {
      levelLabel: 'Level 2',
      levelNumber: 2,
      colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    };
  } else if (attainmentPercentage >= config.level1) {
    return {
      levelLabel: 'Level 1',
      levelNumber: 1,
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  } else {
    return {
      levelLabel: 'Below Threshold',
      levelNumber: 0,
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }
}

export interface COTargetAchievementResult {
  isTargetMet: boolean;
  gap: number;
  statusLabel: string;
  badgeColor: string;
}

/**
 * Compares actual attained level against saved target level for a CO
 */
export function evaluateCOTargetAchievement(
  actualLevelNumber: number,
  targetLevelNumber: number
): COTargetAchievementResult {
  const gap = actualLevelNumber - targetLevelNumber;
  const isTargetMet = gap >= 0;

  if (isTargetMet) {
    return {
      isTargetMet: true,
      gap,
      statusLabel: gap > 0 ? `Exceeded (+${gap} Level)` : 'Target Achieved ✓',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    };
  } else {
    return {
      isTargetMet: false,
      gap,
      statusLabel: `Target Not Met (Gap: ${gap} Level)`,
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
    };
  }
}
