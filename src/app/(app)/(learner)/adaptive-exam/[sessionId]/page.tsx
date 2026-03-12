"use client";

import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { fetchQuestionById } from "@/lib/exam/question-bank";
import {
  AdaptiveProgressBar,
  AdaptiveQuestionView,
  AdaptiveCompletionSummary,
  AdaptiveRecommendedActions,
} from "@/components/adaptive";
import type { ExamResponse } from "@/types/exam";

type Phase = "loading" | "fetching_next" | "question" | "submitting" | "completed";

interface SessionData {
  session: {
    status: string;
    questionCount: number;
    thetaEstimate: number;
    standardError: number;
    readinessScore: number | null;
    confidenceBand: string | null;
    examTrackId: string;
    trackSlug?: string;
    configSlug?: string;
  };
  items: Array<{ id: string; questionId: string; servedOrder?: number; isCorrect: boolean | null }>;
  byDomain: Record<string, { correct: number; total: number; percent: number; name?: string }>;
  bySystem: Record<string, { correct: number; total: number; percent: number; name?: string }>;
  byTopic: Record<string, { correct: number; total: number; percent: number; name?: string }>;
}

const MIN_QUESTIONS = 75;
const MAX_QUESTIONS = 150;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AdaptiveExamSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentItem, setCurrentItem] = useState<{ itemId: string; questionId: string; servedOrder: number } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Record<string, unknown> | null>(null);
  const [response, setResponse] = useState<ExamResponse | undefined>(undefined);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [progress, setProgress] = useState<{ readinessScore: number | null; confidenceBand: string | null }>({
    readinessScore: null,
    confidenceBand: null,
  });
  const [error, setError] = useState<string | null>(null);

  const questionStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/adaptive/session/${sessionId}`);
    if (!res.ok) {
      setError("Session not found");
      setPhase("completed");
      return;
    }
    const data = await res.json();
    setSessionData(data);
    if (data.session?.status === "completed") {
      setPhase("completed");
      return;
    }
    return data;
  }, [sessionId]);

  const fetchNext = useCallback(async () => {
    setPhase("fetching_next");
    setError(null);
    const res = await fetch("/api/adaptive/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No next question");
      setPhase("completed");
      return;
    }
    setCurrentItem({
      itemId: data.itemId,
      questionId: data.questionId,
      servedOrder: data.servedOrder,
    });
    setResponse(undefined);
    questionStartRef.current = Date.now();
    setTimeSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeSeconds((s) => s + 1);
    }, 1000);

    const fullQ = await fetchQuestionById(data.questionId, { revealAnswers: false });
    setCurrentQuestion((fullQ ?? null) as Record<string, unknown> | null);
    setPhase("question");
  }, [sessionId]);

  const handleSubmit = useCallback(async () => {
    if (!currentItem || phase !== "question") return;
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
    setPhase("submitting");
    const res = await fetch("/api/adaptive/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        itemId: currentItem.itemId,
        answer: response,
        timeSpentSeconds: elapsed,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to submit");
      setPhase("question");
      return;
    }
    setProgress({
      readinessScore: data.readinessScore ?? null,
      confidenceBand: data.confidenceBand ?? null,
    });
    if (data.stop) {
      if (timerRef.current) clearInterval(timerRef.current);
      await loadSession();
      setPhase("completed");
      return;
    }
    setCurrentItem(null);
    setCurrentQuestion(null);
    await fetchNext();
  }, [sessionId, currentItem, response, phase, loadSession, fetchNext]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    loadSession().then((data) => {
      if (cancelled || !data) return;
      if (data.session?.status !== "in_progress") return;
      const unanswered = data.items?.find((i: { isCorrect: boolean | null }) => i.isCorrect == null);
      if (unanswered) {
        setCurrentItem({
          itemId: unanswered.id,
          questionId: unanswered.questionId,
          servedOrder: unanswered.servedOrder ?? data.items?.length ?? 0,
        });
        questionStartRef.current = Date.now();
        setTimeSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimeSeconds((s) => s + 1), 1000);
        fetchQuestionById(unanswered.questionId, { revealAnswers: false }).then((q) => {
          if (!cancelled) setCurrentQuestion((q ?? null) as Record<string, unknown> | null);
        });
        setPhase("question");
      } else {
        fetchNext();
      }
    });
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const canSubmit = useMemo(() => {
    if (!response) return false;
    if (response.type === "single" && response.value) return true;
    if ((response.type === "multiple" || response.type === "ordered") && response.value?.length) return true;
    if (response.type === "numeric" && typeof response.value === "number") return true;
    if ((response.type === "hotspot" || response.type === "highlight") && response.value?.length) return true;
    if ((response.type === "dropdown" || response.type === "matrix") && response.value && Object.keys(response.value).length) return true;
    return false;
  }, [response]);

  if (!sessionId) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Invalid session</p>
        <Link href="/adaptive-exam" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Adaptive Exam
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-600 dark:text-slate-400">Loading session…</p>
      </div>
    );
  }

  if (phase === "completed" && sessionData) {
    const s = sessionData.session;
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <AdaptiveCompletionSummary
          readinessScore={s.readinessScore ?? 0}
          confidenceBand={s.confidenceBand ?? "borderline"}
          questionCount={s.questionCount ?? 0}
          correctCount={sessionData.items.filter((i) => i.isCorrect).length}
          percentCorrect={
            (s.questionCount ?? 0) > 0
              ? Math.round((sessionData.items.filter((i) => i.isCorrect).length / (s.questionCount ?? 1)) * 100)
              : 0
          }
          byDomain={sessionData.byDomain ?? {}}
          bySystem={sessionData.bySystem ?? {}}
          byTopic={sessionData.byTopic ?? {}}
        />
        <AdaptiveRecommendedActions
          trackSlug={s.trackSlug ?? "rn"}
          weakSystemIds={Object.entries(sessionData.bySystem ?? {})
            .filter(([, d]) => d.percent < 70)
            .map(([id]) => id)}
          weakDomainIds={Object.entries(sessionData.byDomain ?? {})
            .filter(([, d]) => d.percent < 70)
            .map(([id]) => id)}
        />
        <div className="flex gap-4">
          <Link
            href="/adaptive-exam"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Start Another
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "completed" && error) {
    return (
      <div className="p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/adaptive-exam" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Adaptive Exam
        </Link>
      </div>
    );
  }

  if (phase === "fetching_next" || (phase === "question" && !currentQuestion)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-600 dark:text-slate-400">
          {phase === "fetching_next" ? "Loading next question…" : "Loading question…"}
        </p>
      </div>
    );
  }

  if ((phase === "question" || phase === "submitting") && currentQuestion && currentItem) {
    const q = currentQuestion as {
      id: string;
      stem: string;
      type: string;
      options?: { key: string; text: string }[];
      imageUrl?: string;
      caseStudyTabs?: { id: string; title: string; content: string }[];
      leadIn?: string;
      instructions?: string;
      chartTableData?: Record<string, unknown>;
      selectN?: number;
      matrixRows?: string[];
      matrixCols?: string[];
      clozeBlanks?: { id: string; options: string[] }[];
      hotspotRegions?: { id: string; label: string }[];
      highlightTargets?: { id: string; text: string }[];
      bowTieLeft?: string[];
      bowTieRight?: string[];
    };

    return (
      <div className="p-4 lg:p-6 space-y-6 min-h-screen max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
            Adaptive Exam
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{formatTime(timeSeconds)}</span>
          </div>
        </div>

        <AdaptiveProgressBar
          questionsAnswered={currentItem.servedOrder - 1}
          minQuestions={MIN_QUESTIONS}
          maxQuestions={MAX_QUESTIONS}
          readinessScore={progress.readinessScore}
          confidenceBand={progress.confidenceBand}
        />

        <AdaptiveQuestionView
          question={q}
          questionNumber={currentItem.servedOrder}
          response={response}
          onResponse={setResponse}
          disabled={phase === "submitting"}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || phase === "submitting"}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {phase === "submitting" ? "Submitting…" : "Submit & Next"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-slate-600">Loading…</p>
    </div>
  );
}
