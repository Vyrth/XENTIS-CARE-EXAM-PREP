/**
 * Production planning targets by track.
 * Used by AI Content Factory production panel.
 */

export type ExamTrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

export type ContentTypeKey = "questions" | "studyGuides" | "flashcardDecks" | "flashcards" | "highYield";

export interface ProductionTargets {
  questions: number;
  studyGuides: number;
  flashcardDecks: number;
  flashcards: number;
  highYield: number;
}

/**
 * Mass Content Production targets by track.
 * Used by AI Content Factory Production Roadmap.
 */
export const PRODUCTION_TARGETS: Record<ExamTrackSlug, ProductionTargets> = {
  rn: {
    questions: 2000,
    studyGuides: 150,
    flashcardDecks: 80,
    flashcards: 4000,
    highYield: 500,
  },
  fnp: {
    questions: 1500,
    studyGuides: 120,
    flashcardDecks: 60,
    flashcards: 3000,
    highYield: 400,
  },
  pmhnp: {
    questions: 1000,
    studyGuides: 80,
    flashcardDecks: 40,
    flashcards: 2000,
    highYield: 300,
  },
  lvn: {
    questions: 800,
    studyGuides: 60,
    flashcardDecks: 32,
    flashcards: 1600,
    highYield: 200,
  },
};

export const CONTENT_TYPE_LABELS: Record<ContentTypeKey, string> = {
  questions: "Questions",
  studyGuides: "Study Guides",
  flashcardDecks: "Flashcard Decks",
  flashcards: "Flashcards",
  highYield: "High-Yield Summaries",
};

export const CONTENT_TYPE_TO_TAB: Record<ContentTypeKey, "questions" | "study-guides" | "flashcards" | "high-yield"> = {
  questions: "questions",
  studyGuides: "study-guides",
  flashcardDecks: "flashcards",
  flashcards: "flashcards",
  highYield: "high-yield",
};
