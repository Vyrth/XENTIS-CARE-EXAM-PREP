/**
 * Adaptive Exam Scoring Service
 *
 * Theta update, standard error, stop rules, readiness.
 * Practical approximate implementation (not full psychometric).
 */

export {
  updateThetaEstimate,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  getConfidenceBand,
  probabilityCorrect2PL,
} from "./scoring";

export type {
  ThetaUpdateInput,
  ThetaUpdateResult,
  StopRuleInput,
  StopRuleResult,
  ReadinessInput,
  ReadinessResult,
  ConfidenceBand,
} from "./scoring";

/**
 * Update standard error after one item response.
 * SE is computed inside updateThetaEstimate; this is a convenience alias.
 * Use updateThetaEstimate for the full theta + SE update.
 */
export function updateStandardError(
  currentSE: number,
  fisherInfo: number
): number {
  const priorVariance = currentSE * currentSE;
  const posteriorVariance = 1 / (1 / priorVariance + fisherInfo);
  return Math.min(9.99, Math.sqrt(Math.max(0.01, posteriorVariance)));
}
