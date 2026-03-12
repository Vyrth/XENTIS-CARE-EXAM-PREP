/**
 * Adaptive Exam Service Layer
 *
 * Production backend for computer-adaptive practice exams.
 * Uses: adaptive_exam_configs, adaptive_exam_sessions, adaptive_exam_items,
 * adaptive_exam_blueprint_progress, question_calibration.
 */

export {
  createAdaptiveExamSession,
  completeAdaptiveExamSession,
  getAdaptiveSession,
} from "./adaptive-session";
export type {
  CreateAdaptiveExamSessionParams,
  CreateAdaptiveExamSessionResult,
  AdaptiveSessionRow,
} from "./adaptive-session";

export {
  getNextAdaptiveQuestion,
  submitAdaptiveAnswer,
  updateBlueprintProgress,
} from "./adaptive-engine";
export type {
  GetNextAdaptiveQuestionParams,
  GetNextAdaptiveQuestionResult,
  SubmitAdaptiveAnswerParams,
  SubmitAdaptiveAnswerResult,
} from "./adaptive-engine";

export {
  updateThetaEstimate,
  updateStandardError,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  getConfidenceBand,
  probabilityCorrect2PL,
} from "./adaptive-scoring";
export type {
  ThetaUpdateInput,
  ThetaUpdateResult,
  StopRuleInput,
  StopRuleResult,
  ReadinessInput,
  ReadinessResult,
  ConfidenceBand,
} from "./adaptive-scoring";

export {
  rankCandidatesForAdaptive,
  thetaProximityScore,
  exposurePenaltyScore,
  computeBlueprintBoost,
  isBlueprintSatisfied,
} from "./adaptive-selection";
export type {
  CandidateForRanking,
  RankedCandidate,
  RankingContext,
  BlueprintProgressRow,
  BlueprintTarget,
  CandidateTaxonomy,
} from "./adaptive-selection";
