"use client";

import { useState, useCallback } from "react";

export interface ExamQuestionState {
  questionId: string;
  response?: string | string[];
  isFlagged: boolean;
  isAnswered: boolean;
}

export interface ExamSessionState {
  questions: ExamQuestionState[];
  currentIndex: number;
  timeRemainingSeconds: number;
  startedAt: Date;
}

export function useExam(questionIds: string[]) {
  const [questions, setQuestions] = useState<ExamQuestionState[]>(() =>
    questionIds.map((id) => ({
      questionId: id,
      isFlagged: false,
      isAnswered: false,
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(3 * 60 * 60); // 3 hours

  const setResponse = useCallback((questionId: string, response: string | string[]) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? { ...q, response, isAnswered: true }
          : q
      )
    );
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId ? { ...q, isFlagged: !q.isFlagged } : q
      )
    );
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, questions.length - 1)));
  }, [questions.length]);

  const next = useCallback(() => goToQuestion(currentIndex + 1), [currentIndex, goToQuestion]);
  const prev = useCallback(() => goToQuestion(currentIndex - 1), [currentIndex, goToQuestion]);

  const answeredCount = questions.filter((q) => q.isAnswered).length;
  const flaggedIds = questions.filter((q) => q.isFlagged).map((q) => q.questionId);

  return {
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex],
    timeRemainingSeconds,
    setTimeRemainingSeconds,
    setResponse,
    toggleFlag,
    goToQuestion,
    next,
    prev,
    answeredCount,
    flaggedIds,
    totalQuestions: questions.length,
  };
}
