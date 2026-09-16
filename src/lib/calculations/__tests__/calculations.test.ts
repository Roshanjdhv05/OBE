import { calculateStudentCOPercentage, evaluateStudentAttainment, calculateCIACOAttainment } from '../cia';
import { calculateDirectAttainment, calculateWeightedDirect } from '../direct';
import { normalizeSurveyResponse, calculateSurveyWeightedAverage, calculateIndirectPercentage } from '../survey';
import { calculateWeightedIndirect } from '../indirect';
import { calculateFinalAttainment, calculateCOAttainmentScore } from '../final';
import { evaluateAttainmentLevel } from '../attainment-level';
import { generateCOInterpretation } from '../interpretation';

export function runCalculationUnitTests() {
  const results: { test: string; passed: boolean; details?: string }[] = [];

  // 1. CIA Tests
  const ciaStudentPct = calculateStudentCOPercentage(17, 20); // 17 / 20 * 100 = 85%
  results.push({
    test: 'CIA Student Percentage (17/20 = 85%)',
    passed: ciaStudentPct === 85,
    details: `Expected 85, got ${ciaStudentPct}`,
  });

  const ciaAttained = evaluateStudentAttainment(ciaStudentPct, 50);
  results.push({
    test: 'CIA Student Attainment Threshold (85% >= 50%)',
    passed: ciaAttained === true,
  });

  const ciaCOAttainment = calculateCIACOAttainment(428, 450); // 428 / 450 * 100 = 95.11%
  results.push({
    test: 'CIA CO Attainment % (428/450 = 95.11%)',
    passed: ciaCOAttainment === 95.11,
    details: `Expected 95.11, got ${ciaCOAttainment}`,
  });

  // 2. Direct Attainment Tests
  const ciaVal = 95.1;
  const eseVal = 65.0;
  const direct = calculateDirectAttainment(ciaVal, eseVal, 0.50, 0.50); // (95.1 + 65.0) / 2 = 80.05%
  results.push({
    test: 'Direct Attainment 50% CIA + 50% ESE ((95.1 + 65.0)/2 = 80.05%)',
    passed: direct === 80.05,
    details: `Expected 80.05, got ${direct}`,
  });

  const weightedDirect = calculateWeightedDirect(direct, 0.8); // 80.05 * 0.8 = 64.04%
  results.push({
    test: 'Weighted Direct (80.05 * 0.8 = 64.04%)',
    passed: Number(weightedDirect.toFixed(2)) === 64.04,
    details: `Expected 64.04, got ${weightedDirect}`,
  });

  // 3. Exit Survey Tests
  const norm1 = normalizeSurveyResponse('Very satisfied');
  const norm2 = normalizeSurveyResponse('very satisfied ');
  results.push({
    test: 'Survey Response Normalization (Case-insensitive)',
    passed: norm1.score === 1 && norm2.score === 1,
  });

  const breakdown = { verySatisfied: 10, satisfied: 20, unsure: 10, dissatisfied: 5, veryDissatisfied: 5 };
  // Total = 50. Sum = 10*1 + 20*2 + 10*3 + 5*4 + 5*5 = 10 + 40 + 30 + 20 + 25 = 125.
  // Weighted Avg = 125 / 50 = 2.5
  const weightedAvg = calculateSurveyWeightedAverage(breakdown);
  results.push({
    test: 'Survey Weighted Average (125/50 = 2.5)',
    passed: weightedAvg === 2.5,
    details: `Expected 2.5, got ${weightedAvg}`,
  });

  const indirectPct = calculateIndirectPercentage(2.5, 5); // 2.5 / 5 * 100 = 50%
  results.push({
    test: 'Indirect Percentage (2.5/5 * 100 = 50%)',
    passed: indirectPct === 50,
    details: `Expected 50, got ${indirectPct}`,
  });

  const weightedIndirect = calculateWeightedIndirect(indirectPct, 0.2); // 50 * 0.2 = 10%
  results.push({
    test: 'Weighted Indirect (50 * 0.2 = 10%)',
    passed: weightedIndirect === 10,
    details: `Expected 10, got ${weightedIndirect}`,
  });

  // 4. Final Attainment Tests
  const finalAttainment = calculateFinalAttainment(weightedDirect, weightedIndirect); // 64.04 + 10 = 74.04%
  results.push({
    test: 'Final Attainment (64.04 + 10 = 74.04%)',
    passed: finalAttainment === 74.04,
    details: `Expected 74.04, got ${finalAttainment}`,
  });

  const score = calculateCOAttainmentScore(finalAttainment); // 75.63 / 100 = 0.7563
  results.push({
    test: 'CO Attainment Score (75.63 / 100 = 0.7563)',
    passed: score === 0.7563,
    details: `Expected 0.7563, got ${score}`,
  });

  // 5. Attainment Level & Interpretation Tests
  const level = evaluateAttainmentLevel(78);
  results.push({
    test: 'Attainment Level Evaluation (78% >= 70% -> Level 3)',
    passed: level.levelLabel === 'Level 3',
  });

  const interp = generateCOInterpretation(78, 'CO1');
  results.push({
    test: 'CO Interpretation Generator (78% -> High Attainment)',
    passed: interp.category === 'High Attainment',
  });

  return results;
}

// Execute if run directly via Node/Ts-node
if (require.main === module) {
  console.log('--- RUNNING OBE CALCULATION ENGINE UNIT TESTS ---');
  const testResults = runCalculationUnitTests();
  let passedCount = 0;
  testResults.forEach((r) => {
    if (r.passed) {
      console.log(`[PASS] ${r.test}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${r.test} - ${r.details}`);
    }
  });
  console.log(`\nSUMMARY: ${passedCount}/${testResults.length} tests passed.`);
}
