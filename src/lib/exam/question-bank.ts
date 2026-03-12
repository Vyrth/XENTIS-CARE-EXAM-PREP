/**
 * Question bank - fetches questions for exam modes
 * Uses API for DB-backed questions; returns [] when empty (no mock fallback)
 */

import type { TrackSlug } from "@/data/mock/types";
import type { ExamMode } from "@/types/exam";
import { PRE_PRACTICE_CONFIG, SYSTEM_EXAM_MIN_QUESTIONS, READINESS_CONFIG } from "@/types/exam";
import type { Question } from "@/data/mock/types";

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

export interface QuestionBankOptions {
  mode: ExamMode;
  track?: TrackSlug;
  systemId?: string;
  systemSlug?: string;
  domainSlug?: string;
  topicSlug?: string;
  questionCount?: number;
  seed: number;
}

/** Sync fallback - returns empty. Use fetchQuestionIdsForExam for DB-backed questions. */
export function getQuestionIdsForExam(_options: QuestionBankOptions): string[] {
  return [];
}

/** Thrown when user hits entitlement limit (402) */
export class EntitlementLimitError extends Error {
  constructor(
    message: string,
    public readonly code = "ENTITLEMENT_LIMIT",
    public readonly upgradeRequired = true
  ) {
    super(message);
    this.name = "EntitlementLimitError";
  }
}

/** Fetch question IDs from API (DB-backed, track-scoped). Returns [] when empty or on error. Throws EntitlementLimitError on 402. */
export async function fetchQuestionIdsForExam(options: QuestionBankOptions): Promise<string[]> {
  try {
    const params = new URLSearchParams();
    params.set("mode", options.mode);
    params.set("seed", String(options.seed));
    if (options.systemId) params.set("systemId", options.systemId);
    if (options.systemSlug) params.set("systemSlug", options.systemSlug);
    if (options.domainSlug) params.set("domainSlug", options.domainSlug);
    if (options.topicSlug) params.set("topicSlug", options.topicSlug);
    const isPrePractice = options.mode === "pre_practice" || options.mode.startsWith("pre_practice_");
    const limit =
      options.questionCount ??
      (isPrePractice
        ? PRE_PRACTICE_CONFIG.questionCount
        : options.mode === "readiness"
          ? READINESS_CONFIG.questionCount
          : options.mode === "system"
            ? Math.max(SYSTEM_EXAM_MIN_QUESTIONS, 50)
            : 20);
    params.set("limit", String(limit));

    const res = await fetch(`/api/questions/ids?${params.toString()}`);
    if (res.status === 402) {
      const body = await res.json().catch(() => ({}));
      throw new EntitlementLimitError(
        body.error ?? "Daily question limit reached. Upgrade for unlimited access."
      );
    }
    if (!res.ok) return [];
    const { ids } = await res.json();
    return Array.isArray(ids) ? ids : [];
  } catch (e) {
    if (e instanceof EntitlementLimitError) throw e;
    return [];
  }
}

/** Sync - returns undefined. Use fetchQuestionById for DB. */
export function getQuestionById(_id: string): Question | undefined {
  return undefined;
}

/** Fetch single question from API (track-scoped). Returns undefined when not found. */
export async function fetchQuestionById(
  id: string,
  options?: { revealAnswers?: boolean }
): Promise<Question | undefined> {
  try {
    const params = new URLSearchParams();
    if (options?.revealAnswers === false) params.set("revealAnswers", "false");
    const url = `/api/questions/${id}${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const q = await res.json();
    return q as Question;
  } catch {
    return undefined;
  }
}

export function getQuestionsByIds(ids: string[]) {
  return ids.map((id) => getQuestionById(id)).filter(Boolean);
}
