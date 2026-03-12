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
  | "generate_mnemonic"
  | "notebook_summary";

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
  /** User's selected answer and correctness (for contextual tutoring) */
  selectedAnswer?: string;
  userCorrect?: boolean;
  /** Distractor options for "why others wrong" */
  distractors?: { key: string; text: string }[];
  /** Question metadata for track-specific context */
  systemName?: string;
  topicName?: string;
  /** explain_question mode */
  explainMode?: "simple" | "board_focus" | "why_others_wrong";
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
  weakSkills?: string[];
  weakItemTypes?: string[];
  readinessBand?: string;
  recentMistakes?: string[];
  currentStudyPlan?: string;
  coachingMode?: "explain_weakness" | "remediation_plan" | "teach_from_zero" | "exam_readiness";
  /** For generate_mnemonic */
  mnemonicType?: MnemonicType;
  topic?: string;
  /** For notebook_summary */
  noteText?: string;
  summaryMode?: "clean_summary" | "high_yield" | "study_outline" | "plain_language" | "board_focus";
  /** Conversation history for context */
  messageHistory?: { role: "user" | "assistant"; content: string }[];
  /** Optional analytics for adaptive AI - personalizes responses by readiness */
  analytics?: {
    readinessScore?: number;
    readinessBand?: string;
    weakSystems?: { name: string; percent?: number }[];
    weakDomains?: { name: string; percent?: number }[];
    weakSkills?: { name: string; percent?: number }[];
    weakItemTypes?: { name: string; percent?: number }[];
    overconfidentRanges?: string[];
    underconfidentRanges?: string[];
    confidenceCalibration?: number;
    recentMistakes?: string[];
    studyGuideCompletion?: number;
    videoCompletion?: number;
    lastStudyMaterialsCompleted?: string[];
  };
}

export interface AIResponse {
  content: string;
  /** For flashcards - structured output */
  flashcards?: { front: string; back: string }[];
  /** For quiz - structured output */
  quizQuestions?: { stem: string; options: string[]; correctKey: string }[];
  /** Content refs used in RAG */
  contentRefs?: string[];
  /** Saveable remediation suggestions when adaptive context is used */
  remediationSuggestions?: string[];
  /** Learner profile (beginner, developing, near_ready, exam_ready) when adaptive context is used */
  learnerProfile?: string;
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
