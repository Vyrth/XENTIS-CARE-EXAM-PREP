/**
 * Adaptive question selection - candidate ranking.
 * Pure functions for unit testing.
 */

import type { BlueprintProgressRow, BlueprintTarget, CandidateTaxonomy } from "./blueprint";
import { computeBlueprintBoost } from "./blueprint";

export interface RankedCandidate {
  questionId: string;
  difficultyB: number;
  score: number;
  hasCalibration: boolean;
  domainId: string | null;
  systemId: string | null;
  topicId: string | null;
}

export interface CandidateForRanking {
  questionId: string;
  difficultyB: number;
  hasCalibration: boolean;
  exposureCount: number;
  domainId: string | null;
  systemId: string | null;
  topicId: string | null;
}

export interface RankingContext {
  thetaEstimate: number;
  blueprintProgress: BlueprintProgressRow[];
  blueprintTargets: BlueprintTarget[];
  totalServed: number;
  /** Max exposure before penalty. Default 50. */
  maxExposureBeforePenalty?: number;
}

/**
 * Rank candidates for adaptive selection.
 * Combines: (1) theta proximity, (2) blueprint boost, (3) exposure penalty.
 * Returns sorted by score descending (best first).
 */
export function rankCandidatesForAdaptive(
  candidates: CandidateForRanking[],
  context: RankingContext
): RankedCandidate[] {
  const {
    thetaEstimate,
    blueprintProgress,
    blueprintTargets,
    totalServed,
    maxExposureBeforePenalty = 50,
  } = context;

  const scored = candidates.map((c) => {
    const thetaScore = thetaProximityScore(c.difficultyB, thetaEstimate);
    const blueprintScore = computeBlueprintBoost(
      {
        questionId: c.questionId,
        domainId: c.domainId,
        systemId: c.systemId,
        topicId: c.topicId,
      },
      blueprintProgress,
      blueprintTargets,
      totalServed
    );
    const exposurePenalty = exposurePenaltyScore(c.exposureCount, maxExposureBeforePenalty);
    const calibrationBonus = c.hasCalibration ? 0.1 : 0;

    const score = thetaScore + blueprintScore + calibrationBonus - exposurePenalty;

    return {
      questionId: c.questionId,
      difficultyB: c.difficultyB,
      score,
      hasCalibration: c.hasCalibration,
      domainId: c.domainId,
      systemId: c.systemId,
      topicId: c.topicId,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Score for theta proximity: best when difficulty_b ≈ theta.
 * Uses negative distance: higher when closer.
 */
export function thetaProximityScore(difficultyB: number, thetaEstimate: number): number {
  const distance = Math.abs(difficultyB - thetaEstimate);
  // Inverse distance: 1 at distance 0, decays with distance
  return 1 / (1 + distance);
}

/**
 * Exposure penalty: higher exposure = lower score.
 */
export function exposurePenaltyScore(
  exposureCount: number,
  maxBeforePenalty: number
): number {
  if (exposureCount < maxBeforePenalty) return 0;
  const excess = exposureCount - maxBeforePenalty;
  return Math.min(1, excess * 0.02);
}
