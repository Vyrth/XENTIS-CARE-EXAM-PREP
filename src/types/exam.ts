/**
 * Exam engine types - aligned with DB schema for persistence
 */

import type { TrackSlug } from "@/data/mock/types";

/** All supported item types */
export const ITEM_TYPES = [
  "single_best_answer",
  "multiple_response",
  "select_n",
  "image_based",
  "chart_table_exhibit",
  "matrix",
  "dropdown_cloze",
  "ordered_response",
  "hotspot",
  "highlight_text_table",
  "case_study",
  "dosage_calc",
  "bow_tie_analog",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/** Exam mode - determines question selection and rules */
export type ExamMode =
  | "pre_practice"   // 150 questions, track-based (legacy)
  | "pre_practice_i" | "pre_practice_ii" | "pre_practice_iii" | "pre_practice_iv" | "pre_practice_v"
  | "system"        // 50+ per system
  | "custom_quiz"   // user-selected filters
  | "readiness";    // shorter diagnostic

export interface ExamConfig {
  id: string;
  mode: ExamMode;
  track?: TrackSlug;
  systemId?: string;
  questionCount: number;
  timeLimitMinutes: number;
  /** Stable seed for question ordering - enables resume */
  seed: number;
  [key: string]: unknown;
}

export interface ExamSession {
  id: string;
  userId: string;
  config: ExamConfig;
  /** Stable ordered question IDs - never changes during session */
  questionIds: string[];
  /** Per-question state */
  responses: Record<string, ExamResponse>;
  flags: Set<string>;
  /** Per-question time spent in seconds (for exam_session_questions.time_spent_seconds) */
  timeSpentPerQuestion?: Record<string, number>;
  /** Timer state at last save */
  timeRemainingSeconds: number;
  startedAt: string;
  lastSavedAt: string;
  /** Completed = submitted for scoring */
  completedAt?: string;
}

export type ExamResponse =
  | { type: "single"; value: string }
  | { type: "multiple"; value: string[] }
  | { type: "ordered"; value: string[] }
  | { type: "dropdown"; value: Record<string, string> }
  | { type: "hotspot"; value: string[] }
  | { type: "highlight"; value: string[] }
  | { type: "numeric"; value: number }
  | { type: "matrix"; value: Record<string, string> };

export interface ExamQuestionState {
  questionId: string;
  response?: ExamResponse;
  isFlagged: boolean;
  isAnswered: boolean;
  /** For strikeout - option keys user struck out */
  struckOut?: string[];
}

/** Pre-practice: 150 questions, 3 hours */
export const PRE_PRACTICE_CONFIG = {
  questionCount: 150,
  timeLimitMinutes: 180,
} as const;

/** Re-export from central config */
export {
  SYSTEM_EXAM_MIN_QUESTIONS,
  SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS,
  SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS,
  SYSTEM_EXAM_FORMAL_MIN_QUESTIONS,
} from "@/config/exam";

/** Readiness exam: shorter diagnostic */
export const READINESS_CONFIG = {
  questionCount: 30,
  timeLimitMinutes: 45,
} as const;
