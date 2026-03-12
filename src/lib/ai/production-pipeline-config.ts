/**
 * Production-Scale AI Content Pipeline - Configuration
 *
 * Targets: 25,000+ questions in 24h without crashing APIs or Supabase.
 * Sharded, resumable, rate-limited.
 */

export type BatchContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "flashcard_batch"
  | "high_yield_summary"
  | "high_yield_batch";

export type BatchJobStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial";

/** Batch sizing: generate in chunks to avoid API overload and enable resume */
export const BATCH_SIZING = {
  question: { min: 10, max: 25, default: 15 },
  study_guide: { min: 1, max: 3, default: 1 },
  flashcard_deck: { min: 1, max: 1, cardsPerDeck: { min: 10, max: 25 } },
  flashcard_batch: { cardsPerDeck: { min: 10, max: 25 }, default: 20 },
  high_yield_summary: { min: 5, max: 10, default: 5 },
  high_yield_batch: { min: 5, max: 10, default: 5 },
} as const;

/** Worker concurrency limits */
export const CONCURRENCY_LIMITS = {
  /** Max concurrent jobs per track (prevents one track from monopolizing) */
  maxConcurrentPerTrack: 2,
  /** Max concurrent jobs globally */
  maxConcurrentGlobal: 4,
  /** API calls per minute (rough) */
  apiCallsPerMinute: 45,
  /** Inserts per minute to Supabase (bulk batch size) */
  insertsPerMinuteCap: 200,
  /** Delay between API calls (ms) */
  rateLimitMs: 1200,
  /** Max retries per failed generation with exponential backoff */
  maxRetriesPerItem: 3,
  /** Initial backoff (ms) */
  initialBackoffMs: 1000,
  /** Max backoff (ms) */
  maxBackoffMs: 30000,
} as const;

/** Exponential backoff: delay = min(initial * 2^attempt, max) */
export function getBackoffMs(attempt: number): number {
  const { initialBackoffMs, maxBackoffMs } = CONCURRENCY_LIMITS;
  const delay = initialBackoffMs * Math.pow(2, attempt);
  return Math.min(delay, maxBackoffMs);
}
