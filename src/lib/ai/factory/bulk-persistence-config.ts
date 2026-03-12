/**
 * Bulk Persistence Configuration
 *
 * Chunk sizes tuned for 25,000+ question generation without DB bottlenecks.
 * Supabase/PostgreSQL handle these batch sizes well; larger chunks risk timeout.
 */

export const BULK_CHUNK_SIZES = {
  questions: 25,
  question_options: 100,
  flashcards: 100,
  high_yield_content: 25,
} as const;

/** Transaction boundaries: each chunk is inserted atomically. */
export const TRANSACTION_BOUNDARIES = {
  /** Questions + options: one transaction per question chunk (questions + their options) */
  questionChunk: "questions + question_options per chunk",
  /** Flashcards: one transaction per flashcard chunk (within a deck) */
  flashcardChunk: "flashcards per deck chunk",
  /** High-yield: one transaction per high_yield_content chunk */
  highYieldChunk: "high_yield_content per chunk",
} as const;
