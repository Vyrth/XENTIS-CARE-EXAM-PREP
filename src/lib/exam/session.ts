/**
 * Exam session state management and persistence
 * - In-memory state for active session
 * - localStorage for resume (client)
 * - Server actions for DB persistence (when integrated)
 */

import type { ExamSession, ExamConfig, ExamResponse } from "@/types/exam";

const STORAGE_KEY_PREFIX = "xentis_exam_";

export function getSessionStorageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function loadSessionFromStorage(sessionId: string): ExamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getSessionStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSession;
    parsed.flags = new Set(parsed.flags as unknown as string[]);
    return parsed;
  } catch {
    return null;
  }
}

export function saveSessionToStorage(session: ExamSession): void {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      ...session,
      flags: Array.from(session.flags),
    };
    localStorage.setItem(getSessionStorageKey(session.id), JSON.stringify(toSave));
  } catch {
    // quota exceeded or disabled
  }
}

export function createSession(
  userId: string,
  config: ExamConfig,
  questionIds: string[],
  sessionId?: string
): ExamSession {
  const now = new Date().toISOString();
  return {
    id: sessionId ?? `exam_${Date.now()}_${config.seed}`,
    userId,
    config,
    questionIds,
    responses: {},
    flags: new Set(),
    timeRemainingSeconds: config.timeLimitMinutes * 60,
    startedAt: now,
    lastSavedAt: now,
  };
}

export function isResponseValid(
  response: ExamResponse | undefined,
  itemType: string
): boolean {
  if (!response) return false;
  switch (response.type) {
    case "single":
      return typeof response.value === "string" && response.value.length > 0;
    case "multiple":
    case "ordered":
    case "hotspot":
    case "highlight":
      return Array.isArray(response.value) && response.value.length > 0;
    case "dropdown":
    case "matrix":
      return typeof response.value === "object" && Object.keys(response.value).length > 0;
    case "numeric":
      return typeof response.value === "number" && !Number.isNaN(response.value);
    default:
      return false;
  }
}
