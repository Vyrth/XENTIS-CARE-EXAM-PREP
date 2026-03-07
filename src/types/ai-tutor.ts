/**
 * AI Tutor types - board-prep tutor, not generic chatbot
 */

import type { TrackSlug } from "@/data/mock/types";

export type AITrack = TrackSlug; // lvn | rn | fnp | pmhnp

export type AIAction =
  | "explain_question"
  | "explain_highlight"
  | "compare_concepts"
  | "generate_flashcards"
  | "summarize_to_notebook"
  | "weak_area_coaching"
  | "quiz_followup"
  | "generate_mnemonic";

export type MnemonicType =
  | "simple"
  | "acronym"
  | "visual_hook"
  | "story"
  | "compare_contrast";

export interface RetrievalChunk {
  contentType: "rationale" | "distractor" | "study_guide" | "topic_summary" | "flashcard" | "video_transcript";
  contentId: string;
  chunkText: string;
  metadata?: Record<string, unknown>;
}

export interface AIRequest {
  action: AIAction;
  track: AITrack;
  userId?: string;
  /** For explain_question */
  questionId?: string;
  questionStem?: string;
  rationale?: string;
  correctAnswer?: string;
  /** For explain_highlight */
  highlightedText?: string;
  contentRef?: string;
  /** For compare_concepts */
  concepts?: string[];
  /** For summarize_to_notebook */
  notebookContent?: string;
  /** For weak_area_coaching */
  weakSystems?: string[];
  weakDomains?: string[];
  /** For generate_mnemonic */
  mnemonicType?: MnemonicType;
  topic?: string;
  /** Conversation history for context */
  messageHistory?: { role: "user" | "assistant"; content: string }[];
}

export interface AIResponse {
  content: string;
  /** For flashcards - structured output */
  flashcards?: { front: string; back: string }[];
  /** For quiz - structured output */
  quizQuestions?: { stem: string; options: string[]; correctKey: string }[];
  /** Content refs used in RAG */
  contentRefs?: string[];
}

export interface AILogEntry {
  userId?: string;
  action: AIAction;
  track: AITrack;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  contentRefs?: string[];
  error?: string;
}
