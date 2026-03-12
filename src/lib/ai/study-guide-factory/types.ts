/**
 * Study Guide Factory - typed output schema for board-focused study guide generation.
 * Chunk-friendly, section-based structure for RAG and display.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

/** Single section - chunkable unit for RAG and display */
export interface StudyGuideSectionPayload {
  title: string;
  slug?: string;
  contentMarkdown: string;
  /** Plain-language explanation (chunkable) */
  plainExplanation?: string;
  /** Board-focused takeaways */
  keyTakeaways?: string[];
  /** Board traps / common mistakes */
  commonTraps?: string[];
  /** Quick review bullets */
  quickReviewBullets?: string[];
  /** Mnemonic ideas if relevant */
  mnemonics?: string[];
  /** High-yield flag for prioritization */
  highYield?: boolean;
}

/** Full study guide - title, description, sections */
export interface StudyGuidePayload {
  title: string;
  slugSuggestion?: string;
  description: string;
  /** Board focus area (e.g., "NCLEX prioritization", "FNP differentials") */
  boardFocus?: string;
  sections: StudyGuideSectionPayload[];
}

/** Section pack - multiple sections for adding to existing guide */
export interface StudyGuideSectionPackPayload {
  sections: StudyGuideSectionPayload[];
}
