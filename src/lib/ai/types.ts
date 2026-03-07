/**
 * AI service types - request/response models for the reusable AI layer.
 * Server-only. Used by ai-orchestrator and API routes.
 */

/** Supported tutor modes - maps to prompt templates and future RAG retrieval */
export type TutorMode =
  | "explain_question"
  | "explain_highlight"
  | "compare_concepts"
  | "generate_flashcards"
  | "summarize_note"
  | "weak_area_coach"
  | "mnemonic_generator";

/** Exam track for context */
export type AITrack = "lvn" | "rn" | "fnp" | "pmhnp";

/** Mnemonic style for mnemonic_generator */
export type MnemonicType =
  | "simple"
  | "acronym"
  | "visual_hook"
  | "story"
  | "compare_contrast";

// -----------------------------------------------------------------------------
// Generic prompt request - used by /api/ai/test and simple flows
// -----------------------------------------------------------------------------

export interface SimplePromptRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SimplePromptResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
}

// -----------------------------------------------------------------------------
// Tutor mode request - mode-specific params for RAG-ready flows
// -----------------------------------------------------------------------------

export interface TutorModeParams {
  track: AITrack;
  /** Injected by RAG - retrieved context chunks. Empty until retrieval integrated. */
  retrievedContext?: string;
}

export interface ExplainQuestionParams extends TutorModeParams {
  questionStem: string;
  rationale: string;
  correctAnswer: string;
}

export interface ExplainHighlightParams extends TutorModeParams {
  highlightedText: string;
  contentRef?: string;
}

export interface CompareConceptsParams extends TutorModeParams {
  concepts: string[];
}

export interface GenerateFlashcardsParams extends TutorModeParams {
  content: string;
  count?: number;
}

export interface SummarizeNoteParams extends TutorModeParams {
  notebookContent: string;
}

export interface WeakAreaCoachParams extends TutorModeParams {
  weakSystems: string[];
  weakDomains: string[];
}

export interface MnemonicGeneratorParams extends TutorModeParams {
  topic: string;
  mnemonicType?: MnemonicType;
}

/** Union of all tutor mode params */
export type TutorParams =
  | ExplainQuestionParams
  | ExplainHighlightParams
  | CompareConceptsParams
  | GenerateFlashcardsParams
  | SummarizeNoteParams
  | WeakAreaCoachParams
  | MnemonicGeneratorParams;

// -----------------------------------------------------------------------------
// Tutor response - content + optional structured output
// -----------------------------------------------------------------------------

export interface TutorResponse {
  content: string;
  /** For generate_flashcards */
  flashcards?: { front: string; back: string }[];
  /** Content IDs used in RAG retrieval - for attribution/audit */
  contentRefs?: string[];
}

// -----------------------------------------------------------------------------
// RAG integration (future) - chunk shape for retrieval
// -----------------------------------------------------------------------------

/**
 * Retrieval chunk - used when RAG is integrated.
 * Will be populated by retrieveChunks() from ai_chunks / vector store.
 */
export interface RetrievalChunk {
  contentId: string;
  chunkText: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
}
