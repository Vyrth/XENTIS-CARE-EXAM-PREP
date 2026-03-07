"use client";

import { useState, useCallback, useEffect } from "react";
import type { ExamSession, ExamResponse } from "@/types/exam";
import {
  loadSessionFromStorage,
  saveSessionToStorage,
  createSession,
} from "@/lib/exam/session";

const SAVE_INTERVAL_MS = 30_000; // 30 seconds

export function useExamSession(
  sessionId: string | null,
  config: { questionIds: string[]; timeLimitMinutes: number; seed: number } | null,
  userId: string = "mock-user"
) {
  const [session, setSession] = useState<ExamSession | null>(null);

  // Load or create session
  useEffect(() => {
    if (!sessionId || !config) return;

    const loaded = loadSessionFromStorage(sessionId);
    if (loaded) {
      setSession(loaded);
      return;
    }

    const newSession = createSession(
      userId,
      {
        id: sessionId,
        mode: "pre_practice",
        questionCount: config.questionIds.length,
        timeLimitMinutes: config.timeLimitMinutes,
        seed: config.seed,
      },
      config.questionIds
    );
    setSession(newSession);
    saveSessionToStorage(newSession);
  }, [sessionId, config, userId]);

  // Auto-save
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => {
      saveSessionToStorage({ ...session, lastSavedAt: new Date().toISOString() });
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [session?.id, session?.lastSavedAt]);

  const setResponse = useCallback((questionId: string, response: ExamResponse) => {
    setSession((s) => {
      if (!s) return s;
      const next = {
        ...s,
        responses: { ...s.responses, [questionId]: response },
        lastSavedAt: new Date().toISOString(),
      };
      saveSessionToStorage(next);
      return next;
    });
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setSession((s) => {
      if (!s) return s;
      const next = new Set(s.flags);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      const updated = { ...s, flags: next, lastSavedAt: new Date().toISOString() };
      saveSessionToStorage(updated);
      return updated;
    });
  }, []);

  const setTimeRemaining = useCallback((seconds: number) => {
    setSession((s) => {
      if (!s) return s;
      const next = { ...s, timeRemainingSeconds: seconds, lastSavedAt: new Date().toISOString() };
      saveSessionToStorage(next);
      return next;
    });
  }, []);

  const setStruckOut = useCallback((questionId: string, keys: string[]) => {
    // StruckOut stored per-question in a separate structure if needed
    // For now we don't persist strikeout - it's UI-only during session
  }, []);

  const completeSession = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      const next = {
        ...s,
        completedAt: new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
      };
      saveSessionToStorage(next);
      return next;
    });
  }, []);

  const currentIndex = 0;
  const goToQuestion = useCallback((index: number) => {
    // Current index is managed by parent - we just have session state
  }, []);

  return {
    session,
    setResponse,
    toggleFlag,
    setTimeRemaining,
    setStruckOut,
    completeSession,
    currentQuestionId: session?.questionIds[currentIndex],
    answeredCount: session
      ? Object.keys(session.responses).filter((id) => {
          const r = session.responses[id];
          return r && (r.type === "single" ? r.value : r.type === "multiple" ? r.value.length > 0 : true);
        }).length
      : 0,
    totalQuestions: session?.questionIds.length ?? 0,
    flaggedIds: session ? Array.from(session.flags) : [],
    isFlagged: (id: string) => session?.flags.has(id) ?? false,
    getResponse: (id: string) => session?.responses[id],
  };
}
