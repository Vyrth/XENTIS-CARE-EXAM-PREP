/**
 * Adaptive Exam Question Selection Service
 *
 * Candidate ranking: theta proximity, blueprint balance, exposure.
 * Only learner-visible content (approved/published); skip retired.
 */

export {
  rankCandidatesForAdaptive,
  thetaProximityScore,
  exposurePenaltyScore,
} from "./selection";

export type {
  CandidateForRanking,
  RankedCandidate,
  RankingContext,
} from "./selection";

export { computeBlueprintBoost, isBlueprintSatisfied } from "./blueprint";
export type { BlueprintProgressRow, BlueprintTarget, CandidateTaxonomy } from "./blueprint";
