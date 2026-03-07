/**
 * High-Yield Intelligence config - ranking formula weights
 * Adjust for product tuning
 */

import type { TrackSlug } from "@/data/mock/types";

/** Weights for composite high-yield score (must sum to 1) */
export const HIGH_YIELD_WEIGHTS = {
  /** Official blueprint % - how much of exam this covers */
  blueprintWeight: 0.35,
  /** Internal miss rate - learners struggle here */
  missRate: 0.25,
  /** Student signal - notes, reports, AI requests */
  studentSignal: 0.20,
  /** Low-confidence correct - guessed right, may not know */
  lowConfidenceCorrect: 0.10,
  /** Slow item types - time pressure / difficulty */
  slowItemType: 0.10,
} as const;

/** Minimum attempts for telemetry to count */
export const MIN_ATTEMPTS_FOR_TELEMETRY = 20;

/** Score thresholds for "high yield" badge */
export const HIGH_YIELD_THRESHOLDS = {
  topTier: 75,
  highYield: 60,
  notable: 45,
} as const;
