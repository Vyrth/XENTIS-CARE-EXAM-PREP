"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { ExamShell } from "@/components/exam/ExamShell";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { ExamReviewNavigator } from "@/components/exam/ExamReviewNavigator";
import { ExamResultSummary } from "@/components/exam/ExamResultSummary";
import {
  loadSessionFromStorage,
  saveSessionToStorage,
  createSession,
} from "@/lib/exam/session";
import { fetchQuestionIdsForExam, fetchQuestionById, EntitlementLimitError } from "@/lib/exam/question-bank";
import { submitExamAndScore, saveExamSession } from "@/app/(app)/actions/exam";
import type { ExamSession, ExamResponse } from "@/types/exam";
import { PRE_PRACTICE_CONFIG } from "@/types/exam";

type View = "exam" | "review" | "results";

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;

  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<View>("exam");
  const [entitlementError, setEntitlementError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<Awaited<ReturnType<typeof submitExamAndScore>>["result"]>(null);
  const [systemNames, setSystemNames] = useState<Record<string, string>>({});
  const [struckOut, setStruckOut] = useState<Record<string, string[]>>({});
  const [question, setQuestion] = useState<Awaited<ReturnType<typeof fetchQuestionById>>>(undefined);
  const questionEnteredAtRef = useRef<number>(Date.now());

  const parts = examId.split("-");
  const mode = parts[0] as "pre_practice" | "system" | "readiness" | "custom";
  const seed = parseInt(parts[parts.length - 1] ?? "0", 10) || Date.now() % 100000;
  const track = parts.includes("rn") ? "rn" : parts.includes("lvn") ? "lvn" : parts.includes("fnp") ? "fnp" : "pmhnp";
  const systemId = mode === "system" ? parts.slice(1, -1).join("-") : undefined;
  const systemSlug = mode === "custom" ? searchParams.get("systemSlug") ?? undefined : undefined;
  const domainSlug = mode === "custom" ? searchParams.get("domainSlug") ?? undefined : undefined;
  const topicSlug = mode === "custom" ? searchParams.get("topicSlug") ?? undefined : undefined;

  useEffect(() => {
    let cancelled = false;
    setEntitlementError(null);
    (async () => {
      const meRes = await fetch("/api/me");
      const { userId } = await meRes.json().catch(() => ({}));
      const effectiveUserId = userId ?? "anonymous";

      let questionIds: string[];
      try {
        questionIds = await fetchQuestionIdsForExam({
        mode: mode === "system" ? "system" : mode === "readiness" ? "readiness" : mode === "custom" ? "custom_quiz" : (mode.startsWith("pre_practice") ? mode : "pre_practice"),
        track: mode !== "system" ? (track as "lvn" | "rn" | "fnp" | "pmhnp") : undefined,
        systemId: mode === "system" ? systemId : undefined,
        systemSlug,
        domainSlug,
        topicSlug,
        seed,
      });
      } catch (e) {
        if (e instanceof EntitlementLimitError && !cancelled) {
          setEntitlementError(e.message);
        }
        return;
      }

      if (cancelled) return;

      const loaded = loadSessionFromStorage(examId);
      if (loaded && loaded.questionIds.length === questionIds.length) {
        setSession(loaded);
        return;
      }

      const timeLimit =
        mode === "readiness" ? 45 : mode === "system" ? 120 : mode === "custom" ? 120 : PRE_PRACTICE_CONFIG.timeLimitMinutes;
      const newSession = createSession(
        effectiveUserId,
        {
          id: examId,
          mode: mode === "system" ? "system" : mode === "readiness" ? "readiness" : mode === "custom" ? "custom_quiz" : "pre_practice",
          track: mode !== "system" ? (track as "lvn" | "rn" | "fnp" | "pmhnp") : undefined,
          systemId: mode === "system" ? systemId : undefined,
          questionCount: questionIds.length,
          timeLimitMinutes: timeLimit,
          seed,
        },
        questionIds,
        examId
      );
      setSession(newSession);
      saveSessionToStorage(newSession);
      saveExamSession(newSession).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [examId, track, mode, systemId, seed, systemSlug, domainSlug, topicSlug]);

  const currentQuestionId = session?.questionIds[currentIndex] ?? undefined;
  useEffect(() => {
    questionEnteredAtRef.current = Date.now();
  }, [currentIndex]);

  useEffect(() => {
    if (!currentQuestionId) {
      setQuestion(undefined);
      return;
    }
    let cancelled = false;
    fetchQuestionById(currentQuestionId, { revealAnswers: false }).then((q) => {
      if (!cancelled) setQuestion(q);
    });
    return () => { cancelled = true; };
  }, [currentQuestionId]);

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

  useEffect(() => {
    if (!session || session.completedAt) return;
    const t = setInterval(() => {
      const latest = loadSessionFromStorage(examId);
      if (latest && latest.questionIds.length === session.questionIds.length) {
        saveExamSession(latest).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(t);
  }, [examId, session?.id, session?.questionIds.length, session?.completedAt]);

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

  const recordTimeOnNavigate = useCallback((questionId: string, then: () => void) => {
    const elapsed = Math.floor((Date.now() - questionEnteredAtRef.current) / 1000);
    if (elapsed > 0 && questionId) {
      setSession((s) => {
        if (!s) return s;
        const next = {
          ...s,
          timeSpentPerQuestion: {
            ...(s.timeSpentPerQuestion ?? {}),
            [questionId]: (s.timeSpentPerQuestion?.[questionId] ?? 0) + elapsed,
          },
          lastSavedAt: new Date().toISOString(),
        };
        saveSessionToStorage(next);
        return next;
      });
    }
    then();
  }, []);

  const recordTimeSpentAndGetSession = useCallback((questionId: string, base: ExamSession): ExamSession => {
    const elapsed = Math.floor((Date.now() - questionEnteredAtRef.current) / 1000);
    if (elapsed <= 0) return base;
    return {
      ...base,
      timeSpentPerQuestion: {
        ...(base.timeSpentPerQuestion ?? {}),
        [questionId]: (base.timeSpentPerQuestion?.[questionId] ?? 0) + elapsed,
      },
      lastSavedAt: new Date().toISOString(),
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    const activeId = session.questionIds[currentIndex];
    const withTime = activeId ? recordTimeSpentAndGetSession(activeId, session) : session;
    const completed = {
      ...withTime,
      completedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    };
    setSession(completed);
    saveSessionToStorage(completed);
    const { result, systemNames: names } = await submitExamAndScore(completed);
    setScoreResult(result ?? null);
    setSystemNames(names ?? {});
    setView("results");
  }, [session, currentIndex, recordTimeSpentAndGetSession]);

  if (entitlementError) {
    return (
      <div className="p-6 lg:p-8 max-w-xl mx-auto">
        <UpgradePrompt
          reason="Daily question limit reached"
          usage={entitlementError}
          variant="card"
        />
      </div>
    );
  }

  if (!session) {
    return <div className="p-8">Loading exam...</div>;
  }

  const questionIds = session.questionIds;
  if (questionIds.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <p className="text-slate-600 dark:text-slate-400">
          No content available yet for your track.
        </p>
      </div>
    );
  }
  const activeQuestionId = questionIds[currentIndex];
  const response = activeQuestionId ? session.responses[activeQuestionId] : undefined;

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
    const firstId = questionIds[0];
    return (
      <ExamResultSummary
        result={scoreResult}
        systemNames={systemNames}
        onViewBreakdown={() => router.push(`/results/${examId}/breakdown`)}
        onReviewAnswers={() => firstId && router.push(`/results/${examId}/rationale/${firstId}`)}
      />
    );
  }

  if (!question && !activeQuestionId) {
    return <div className="p-8">Loading question...</div>;
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
        leadIn: (question as { leadIn?: string }).leadIn,
        instructions: (question as { instructions?: string }).instructions,
        chartTableData: (question as { chartTableData?: Record<string, unknown> }).chartTableData,
        matrixRows: (question as { matrixRows?: string[] }).matrixRows,
        matrixCols: (question as { matrixCols?: string[] }).matrixCols,
        clozeBlanks: (question as { clozeBlanks?: { id: string; options: string[] }[] }).clozeBlanks,
        hotspotRegions: (question as { hotspotRegions?: { id: string; label: string }[] }).hotspotRegions,
        highlightTargets: (question as { highlightTargets?: { id: string; text: string }[] }).highlightTargets,
        bowTieLeft: (question as { bowTieLeft?: string[] }).bowTieLeft,
        bowTieRight: (question as { bowTieRight?: string[] }).bowTieRight,
        selectN: (question as { selectN?: number }).selectN,
      }}
      questionNumber={currentIndex + 1}
      totalQuestions={questionIds.length}
      answeredCount={Object.keys(session.responses).length}
      timeRemainingSeconds={session.timeRemainingSeconds}
      isFlagged={activeQuestionId ? session.flags.has(activeQuestionId) : false}
      response={response}
      struckOut={activeQuestionId ? struckOut[activeQuestionId] : undefined}
      onResponse={(r) => { if (activeQuestionId) setResponse(activeQuestionId, r); }}
      onToggleFlag={() => { if (activeQuestionId) toggleFlag(activeQuestionId); }}
      onStrikeOut={(keys) => { if (activeQuestionId) setStruckOut((s) => ({ ...s, [activeQuestionId]: keys })); }}
      onPrev={() => recordTimeOnNavigate(activeQuestionId ?? "", () => setCurrentIndex((i) => Math.max(0, i - 1)))}
      onNext={() => recordTimeOnNavigate(activeQuestionId ?? "", () => setCurrentIndex((i) => Math.min(questionIds.length - 1, i + 1)))}
      onReview={() => recordTimeOnNavigate(activeQuestionId ?? "", () => setView("review"))}
      isFirst={currentIndex === 0}
      isLast={currentIndex === questionIds.length - 1}
    />
  );
}
