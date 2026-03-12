/**
 * Adaptive exam engine - CAT question selection, theta scoring, blueprint balancing.
 * Re-exports from adaptive-index (new service layer) and engine (legacy).
 */

export {
  createAdaptiveExamSession,
  completeAdaptiveExamSession,
  getAdaptiveSession,
  getNextAdaptiveQuestion,
  submitAdaptiveAnswer,
  updateBlueprintProgress,
  updateThetaEstimate,
  updateStandardError,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  getConfidenceBand,
  probabilityCorrect2PL,
  rankCandidatesForAdaptive,
  thetaProximityScore,
  exposurePenaltyScore,
  computeBlueprintBoost,
  isBlueprintSatisfied,
} from "./adaptive-index";

export type {
  CreateAdaptiveExamSessionParams,
  CreateAdaptiveExamSessionResult,
  AdaptiveSessionRow,
  GetNextAdaptiveQuestionParams,
  GetNextAdaptiveQuestionResult,
  SubmitAdaptiveAnswerParams,
  SubmitAdaptiveAnswerResult,
  ThetaUpdateInput,
  ThetaUpdateResult,
  StopRuleInput,
  StopRuleResult,
  ReadinessInput,
  ReadinessResult,
  ConfidenceBand,
  CandidateForRanking,
  RankedCandidate,
  RankingContext,
  BlueprintProgressRow,
  BlueprintTarget,
  CandidateTaxonomy,
} from "./adaptive-index";

export type { AdaptiveSession, AdaptiveConfig, NextQuestionResult } from "./engine";
