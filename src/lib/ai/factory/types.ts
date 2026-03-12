/**
 * AI Content Factory - shared types for generation config, validation, and persistence.
 * All generated content is draft or editor_review only. Never auto-published.
 */

export type ExamTrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

export type ContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "flashcard"
  | "high_yield_summary"
  | "common_confusion"
  | "board_trap"
  | "compare_contrast_summary";

/** Shared generation configuration - track required, taxonomy optional */
export interface GenerationConfig {
  /** exam_tracks.id (UUID) - required for persistence. Use for dropdown value and payload. */
  trackId: string;
  trackSlug: ExamTrackSlug;
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  domainId?: string;
  domainName?: string;
  /** Learning objective or focus area */
  objective?: string;
  /** 1-5 difficulty tier */
  targetDifficulty?: 1 | 2 | 3 | 4 | 5;
  /** For questions: item type slug */
  itemTypeSlug?: string;
  /** For high-yield variants */
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
  /** For batch: count to generate */
  batchCount?: number;
  /** Board focus area for study guides */
  boardFocus?: string;
  /** Section count for study guide section pack (2-8) */
  sectionCount?: number;
  /** Study guide generation mode: full (default) or section_pack */
  studyGuideMode?: "full" | "section_pack";
  /** Flashcard deck mode: rapid_recall or high_yield_clinical */
  flashcardDeckMode?: "rapid_recall" | "high_yield_clinical";
  /** Flashcard style for mass production (rapid_recall, definition, etc.) */
  flashcardStyle?: string;
  /** Card count for flashcard deck (3-25) */
  cardCount?: number;
  /** Source text for "generate from study guide" */
  sourceText?: string;
  /** Status for saved content: draft (default) or editor_review */
  saveStatus?: "draft" | "editor_review";
}

/** Generation mode: single item or batch */
export type GenerationMode = "single" | "batch";

/** Validation result */
export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/** Persistence result */
export interface PersistResult {
  success: boolean;
  contentId?: string;
  error?: string;
  auditId?: string;
  /** True when question was skipped due to duplicate stem in same track/topic scope */
  duplicate?: boolean;
}

/** AI generation audit entry */
export interface AIGenerationAuditEntry {
  id: string;
  contentType: string;
  contentId: string | null;
  generationParams: Record<string, unknown>;
  modelUsed: string;
  generatedAt: string;
  createdBy: string | null;
}
