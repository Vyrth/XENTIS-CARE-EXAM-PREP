"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ExamShell } from "@/components/exam/ExamShell";
import { ExamReviewNavigator } from "@/components/exam/ExamReviewNavigator";
import { ExamResultSummary } from "@/components/exam/ExamResultSummary";
import {
  loadSessionFromStorage,
  saveSessionToStorage,
  createSession,
} from "@/lib/exam/session";
import { getQuestionIdsForExam, getQuestionById } from "@/lib/exam/question-bank";
import { submitExamAndScore } from "@/app/(app)/actions/exam";
import type { ExamSession, ExamResponse } from "@/types/exam";
import { PRE_PRACTICE_CONFIG } from "@/types/exam";

type View = "exam" | "review" | "results";

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<View>("exam");
  const [scoreResult, setScoreResult] = useState<Awaited<ReturnType<typeof submitExamAndScore>>["result"]>(null);
  const [struckOut, setStruckOut] = useState<Record<string, string[]>>({});

  const parts = examId.split("-");
  const mode = parts[0] as "pre_practice" | "system" | "readiness";
  const seed = parseInt(parts[parts.length - 1] ?? "0", 10) || Date.now() % 100000;
  const track = parts.includes("rn") ? "rn" : parts.includes("lvn") ? "lvn" : parts.includes("fnp") ? "fnp" : "pmhnp";
  const systemId = mode === "system" ? parts.slice(1, -1).join("-") : undefined;

  useEffect(() => {
    const questionIds = getQuestionIdsForExam({
      mode: mode === "system" ? "system" : mode === "readiness" ? "readiness" : "pre_practice",
      track: mode !== "system" ? (track as "lvn" | "rn" | "fnp" | "pmhnp") : undefined,
      systemId,
      seed,
    });

    const loaded = loadSessionFromStorage(examId);
    if (loaded && loaded.questionIds.length === questionIds.length) {
      setSession(loaded);
      return;
    }

    const timeLimit =
      mode === "readiness" ? 45 : mode === "system" ? 120 : PRE_PRACTICE_CONFIG.timeLimitMinutes;
    const newSession = createSession(
      "mock-user",
      {
        id: examId,
        mode: mode === "system" ? "system" : mode === "readiness" ? "readiness" : "pre_practice",
        track: mode !== "system" ? (track as "lvn" | "rn" | "fnp" | "pmhnp") : undefined,
        systemId,
        questionCount: questionIds.length,
        timeLimitMinutes: timeLimit,
        seed,
      },
      questionIds,
      examId
    );
    setSession(newSession);
    saveSessionToStorage(newSession);
  }, [examId, track]);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => {
      setSession((s) => {
        if (!s || s.timeRemainingSeconds <= 0) return s;
        const next = { ...s, timeRemainingSeconds: s.timeRemainingSeconds - 1 };
        saveSessionToStorage(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [session?.id]);

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

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    const completed = {
      ...session,
      completedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    };
    setSession(completed);
    saveSessionToStorage(completed);
    const { result } = await submitExamAndScore(completed);
    setScoreResult(result ?? null);
    setView("results");
  }, [session]);

  if (!session) {
    return <div className="p-8">Loading exam...</div>;
  }

  const questionIds = session.questionIds;
  const currentQuestionId = questionIds[currentIndex];
  const question = getQuestionById(currentQuestionId);
  const response = session.responses[currentQuestionId];

  if (view === "review") {
    return (
      <ExamReviewNavigator
        questionIds={questionIds}
        currentIndex={currentIndex}
        responses={session.responses}
        flaggedIds={Array.from(session.flags)}
        onSelectQuestion={(i) => {
          setCurrentIndex(i);
          setView("exam");
        }}
        onSubmit={handleSubmit}
      />
    );
  }

  if (view === "results" && scoreResult) {
    return (
      <ExamResultSummary
        result={scoreResult}
        onViewBreakdown={() => router.push(`/results/${examId}/breakdown`)}
        onReviewAnswers={() => router.push(`/results/${examId}/rationale/${questionIds[0]}`)}
      />
    );
  }

  if (!question) {
    return <div className="p-8">Question not found.</div>;
  }

  return (
    <ExamShell
      question={{
        id: question.id,
        stem: question.stem,
        type: question.type,
        options: question.options,
        imageUrl: question.imageUrl,
        caseStudyTabs: question.caseStudyTabs,
      }}
      questionNumber={currentIndex + 1}
      totalQuestions={questionIds.length}
      answeredCount={Object.keys(session.responses).length}
      timeRemainingSeconds={session.timeRemainingSeconds}
      isFlagged={session.flags.has(currentQuestionId)}
      response={response}
      struckOut={struckOut[currentQuestionId]}
      onResponse={(r) => setResponse(currentQuestionId, r)}
      onToggleFlag={() => toggleFlag(currentQuestionId)}
      onStrikeOut={(keys) => setStruckOut((s) => ({ ...s, [currentQuestionId]: keys }))}
      onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
      onNext={() => setCurrentIndex((i) => Math.min(questionIds.length - 1, i + 1))}
      onReview={() => setView("review")}
      isFirst={currentIndex === 0}
      isLast={currentIndex === questionIds.length - 1}
    />
  );
}
