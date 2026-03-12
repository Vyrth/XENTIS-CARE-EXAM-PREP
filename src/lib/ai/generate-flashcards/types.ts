/**
 * Generate Flashcards types - request/response for /api/ai/generate-flashcards
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type FlashcardMode =
  | "standard"
  | "high_yield"
  | "rapid_recall"
  | "compare_contrast"
  | "pharm_focus";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface GeneratedFlashcard {
  front_text: string;
  back_text: string;
  hint_text?: string;
  memory_trick?: string;
  difficulty_level?: DifficultyLevel;
}

export interface GenerateFlashcardsRequest {
  sourceText: string;
  examTrack: ExamTrack;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  numberOfCards?: number;
  flashcardMode?: FlashcardMode;
}

export interface GenerateFlashcardsResponse {
  flashcards: GeneratedFlashcard[];
}

/** Save-ready payload for ai_saved_outputs and later flashcard_decks/flashcards */
export interface FlashcardSavePayload {
  outputType: "flashcard_set";
  flashcards: GeneratedFlashcard[];
  flashcardMode: FlashcardMode;
  examTrack: ExamTrack;
  sourceType?: string;
  sourceId?: string;
  topicId?: string;
  systemId?: string;
}
