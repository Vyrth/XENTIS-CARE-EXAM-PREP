/**
 * Flashcard Factory - typed output schema for board-focused flashcard generation.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type FlashcardDeckMode = "rapid_recall" | "high_yield_clinical";

export type FlashcardDifficulty = "easy" | "medium" | "hard";

/** Single card - maps to flashcards table */
export interface FlashcardPayload {
  frontText: string;
  backText: string;
  hint?: string;
  memoryTrick?: string;
  /** Additional metadata (e.g., highYield, clinicalFocus) */
  metadata?: Record<string, unknown>;
}

/** Full deck with metadata and cards */
export interface FlashcardDeckPayload {
  name: string;
  description?: string;
  deckType: FlashcardDeckMode;
  difficulty?: FlashcardDifficulty;
  cards: FlashcardPayload[];
}

/** Deck type for DB (matches flashcard_decks.deck_type) */
export const DECK_TYPE_MAP: Record<FlashcardDeckMode, string> = {
  rapid_recall: "rapid_recall",
  high_yield_clinical: "high_yield",
};
