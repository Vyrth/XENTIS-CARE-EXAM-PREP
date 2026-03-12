"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchQuestionById } from "@/lib/exam/question-bank";
import type { Question } from "@/data/mock/types";

export function useQuestion(
  questionId: string | undefined,
  options?: { revealAnswers?: boolean }
) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!questionId) {
      setQuestion(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuestionById(questionId, {
        revealAnswers: options?.revealAnswers ?? true,
      });
      setQuestion(q ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load question");
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [questionId, options?.revealAnswers]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { question, loading, error, refetch };
}
