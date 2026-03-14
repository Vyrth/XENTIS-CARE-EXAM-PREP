/**
 * Jade Tutor Content Factory - typed input and output contracts.
 * All outputs are structured JSON for deterministic admin review workflows.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type ContentMode =
  | "question"
  | "study_guide_section"
  | "study_guide"
  | "study_guide_section_pack"
  | "flashcard_deck"
  | "flashcard_cards"
  | "high_yield_summary"
  | "common_confusion"
  | "board_trap"
  | "compare_contrast";

/** Style options for generation tone and format */
export interface StyleOptions {
  /** Tone: clinical, conversational, concise */
  tone?: "clinical" | "conversational" | "concise";
  /** Include mnemonics when helpful */
  includeMnemonics?: boolean;
  /** Emphasis: safety, pharmacology, assessment, etc. */
  emphasis?: string;
}

/** Unified generation request */
export interface ContentFactoryRequest {
  track: ExamTrack;
  contentMode: ContentMode;
  /** Domain name (e.g., Safe and Effective Care) */
  domain?: string;
  /** System name (e.g., Cardiovascular) */
  system?: string;
  /** Topic name (e.g., Heart Failure) */
  topic?: string;
  /** Learning objective or focus area */
  objective?: string;
  /** 1-5 difficulty tier */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** Number of items to generate (for batch modes) */
  quantity?: number;
  /** Style overrides */
  style?: StyleOptions;
  /** Item type for questions (e.g., single_best_answer) */
  itemType?: string;
  /** Board focus area for study guides */
  boardFocus?: string;
  /** Section count for study_guide_section_pack */
  sectionCount?: number;
  /** Flashcard deck mode: rapid_recall or high_yield_clinical */
  flashcardDeckMode?: string;
  /** Flashcard style for mass production (overrides mode emphasis) */
  flashcardStyle?: string;
  /** Source text for "generate from study guide" */
  sourceText?: string;
  /** Diversification hints for regeneration when duplicate detected (patient profile, care setting, clinical angle, decision type) */
  diversificationContext?: string;
}

// -----------------------------------------------------------------------------
// Output contracts - strict schemas for persistence
// -----------------------------------------------------------------------------

export interface QuestionOptionOutput {
  key: string;
  text: string;
  isCorrect: boolean;
  distractorRationale?: string;
}

export interface QuestionOutput {
  stem: string;
  leadIn?: string;
  instructions?: string;
  options: QuestionOptionOutput[];
  rationale?: string;
}

export interface StudyGuideSectionOutput {
  title: string;
  slug?: string;
  contentMarkdown: string;
  plainExplanation?: string;
  keyTakeaways?: string[];
  commonTraps?: string[];
  /** Common confusions (alias for commonTraps, board-focused) */
  commonConfusions?: string[];
  clinicalPearls?: string[];
  quickReviewBullets?: string[];
  mnemonics?: string[];
  highYield?: boolean;
}

/** Full study guide - title, description, sections (chunk-friendly) */
export interface StudyGuideOutput {
  title: string;
  slugSuggestion?: string;
  description: string;
  boardFocus?: string;
  sections: StudyGuideSectionOutput[];
}

/** Section pack - multiple sections for adding to existing guide */
export interface StudyGuideSectionPackOutput {
  sections: StudyGuideSectionOutput[];
}

export interface FlashcardOutput {
  frontText: string;
  backText: string;
  hint?: string;
  memoryTrick?: string;
}

export interface FlashcardDeckOutput {
  name: string;
  description?: string;
  deckType?: string;
  difficulty?: string;
  cards: FlashcardOutput[];
}

export interface HighYieldSummaryOutput {
  title: string;
  explanation: string;
  whyHighYield?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  highYieldScore?: number;
}

export interface CommonConfusionOutput {
  title: string;
  explanation: string;
  conceptA?: string;
  conceptB?: string;
  keyDifference?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  confusionFrequency?: string;
  whyHighYield?: string;
  highYieldScore?: number;
}

export interface BoardTrapOutput {
  title: string;
  trapDescription: string;
  correctApproach: string;
  severity?: 1 | 2 | 3 | 4 | 5;
  whyHighYield?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  trapSeverity?: number;
  explanation?: string;
  highYieldScore?: number;
}

export interface CompareContrastOutput {
  title: string;
  conceptA: string;
  conceptB: string;
  keyDifference: string;
  explanation?: string;
  whyHighYield?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  highYieldScore?: number;
}

export type ContentFactoryOutput =
  | { mode: "question"; data: QuestionOutput }
  | { mode: "study_guide_section"; data: StudyGuideSectionOutput }
  | { mode: "study_guide"; data: StudyGuideOutput }
  | { mode: "study_guide_section_pack"; data: StudyGuideSectionPackOutput }
  | { mode: "flashcard_deck"; data: FlashcardDeckOutput }
  | { mode: "flashcard_cards"; data: FlashcardOutput[] }
  | { mode: "high_yield_summary"; data: HighYieldSummaryOutput }
  | { mode: "common_confusion"; data: CommonConfusionOutput }
  | { mode: "board_trap"; data: BoardTrapOutput }
  | { mode: "compare_contrast"; data: CompareContrastOutput };

export type ProviderErrorCode =
  | "provider_rate_limit"
  | "provider_timeout"
  | "invalid_output"
  | "db_failure"
  | "duplicate_rejected"
  | "unknown";

export interface ContentFactoryResult<T extends ContentFactoryOutput = ContentFactoryOutput> {
  success: boolean;
  output?: T;
  error?: string;
  /** Structured error classification for batch logging */
  errorCode?: ProviderErrorCode;
  /** Raw model response for debugging */
  rawContent?: string;
  /** Tokens used */
  promptTokens?: number;
  completionTokens?: number;
}
