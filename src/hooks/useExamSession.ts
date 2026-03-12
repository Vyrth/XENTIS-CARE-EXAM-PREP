"use client";

import { useState, useEffect, useCallback } from "react";
import { loadSessionFromStorage } from "@/lib/exam/session";
import type { ExamSession } from "@/types/exam";

/** Load exam session from localStorage first, then from API if empty (for cross-device rationale/review) */
export function useExamSession(examId: string | undefined) {
  const [session, setSession] = useState<{
    questionIds: string[];
    responses: Record<string, ExamSession["responses"][string]>;
    flags: Set<string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!examId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fromStorage = loadSessionFromStorage(examId);
    if (fromStorage && fromStorage.questionIds.length > 0) {
      setSession({
        questionIds: fromStorage.questionIds,
        responses: fromStorage.responses,
        flags: fromStorage.flags,
      });
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/exam/session?examId=${encodeURIComponent(examId)}`);
      if (!res.ok) {
        setSession(null);
        return;
      }
      const data = await res.json();
      setSession({
        questionIds: data.questionIds ?? [],
        responses: data.responses ?? {},
        flags: new Set(data.flags ?? []),
      });
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  return { session, loading, refetch: load };
}
