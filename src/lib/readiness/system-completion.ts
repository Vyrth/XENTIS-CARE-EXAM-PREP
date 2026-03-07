/**
 * System completion logic - unlocks 50+ question system exams after study progression
 */

import { SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS } from "@/config/readiness";

export interface SystemProgress {
  systemId: string;
  questionsAnswered: number;
  lastPracticeDate?: string;
}

/** Check if system exam (50+ questions) is unlocked for a system */
export function isSystemExamUnlocked(
  progress: SystemProgress | undefined,
  minQuestions = SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS
): boolean {
  if (!progress) return false;
  return progress.questionsAnswered >= minQuestions;
}

/** Get systems that are unlocked for full system exams */
export function getUnlockedSystems(
  allProgress: SystemProgress[],
  minQuestions = SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS
): string[] {
  return allProgress
    .filter((p) => p.questionsAnswered >= minQuestions)
    .map((p) => p.systemId);
}

/** Get systems that are locked and how many more questions needed */
export function getLockedSystemsWithGap(
  allProgress: SystemProgress[],
  systemIds: string[],
  minQuestions = SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS
): { systemId: string; remaining: number }[] {
  const bySystem = new Map(allProgress.map((p) => [p.systemId, p]));
  return systemIds
    .map((sysId) => {
      const p = bySystem.get(sysId);
      const answered = p?.questionsAnswered ?? 0;
      const remaining = Math.max(0, minQuestions - answered);
      return { systemId: sysId, remaining };
    })
    .filter((x) => x.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining);
}
