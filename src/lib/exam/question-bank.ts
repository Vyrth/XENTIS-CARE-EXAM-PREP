/**
 * Question bank - fetches questions for exam modes
 * Uses mock data; replace with Supabase queries for production
 */

import type { TrackSlug } from "@/data/mock/types";
import type { ExamMode } from "@/types/exam";
import { PRE_PRACTICE_CONFIG, SYSTEM_EXAM_MIN_QUESTIONS, READINESS_CONFIG } from "@/types/exam";
import { MOCK_QUESTIONS, MOCK_IMAGE_QUESTION, MOCK_CASE_STUDY_QUESTION } from "@/data/mock/questions";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

/** Stable shuffle using seed - same seed = same order */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const ALL_MOCK_QUESTIONS = [
  ...MOCK_QUESTIONS,
  MOCK_IMAGE_QUESTION,
  MOCK_CASE_STUDY_QUESTION,
];

export interface QuestionBankOptions {
  mode: ExamMode;
  track?: TrackSlug;
  systemId?: string;
  questionCount?: number;
  seed: number;
}

export function getQuestionIdsForExam(options: QuestionBankOptions): string[] {
  let pool = ALL_MOCK_QUESTIONS;

  if (options.track) {
    const systemIds = MOCK_SYSTEMS.filter((s) => s.track === options.track).map((s) => s.id);
    pool = pool.filter((q) => systemIds.includes(q.systemId));
  }

  if (options.systemId) {
    pool = pool.filter((q) => q.systemId === options.systemId);
  }

  const count =
    options.questionCount ??
    (options.mode === "pre_practice"
      ? PRE_PRACTICE_CONFIG.questionCount
      : options.mode === "readiness"
        ? READINESS_CONFIG.questionCount
        : options.mode === "system"
          ? Math.max(SYSTEM_EXAM_MIN_QUESTIONS, pool.length)
          : pool.length);

  const shuffled = seededShuffle(pool, options.seed);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map((q) => q.id);
}

export function getQuestionById(id: string) {
  return ALL_MOCK_QUESTIONS.find((q) => q.id === id);
}

export function getQuestionsByIds(ids: string[]) {
  return ids.map((id) => getQuestionById(id)).filter(Boolean);
}
