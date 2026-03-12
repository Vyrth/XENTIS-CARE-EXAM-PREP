"use client";

import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MasteryRollup } from "@/types/readiness";

type CoachingMode =
  | "explain_weakness"
  | "remediation_plan"
  | "teach_from_zero"
  | "mnemonic"
  | "follow_up_questions";

interface WeakAreaCoachPayload {
  userId: string;
  examTrack: string;
  weakSystems: { name: string; percent: number; targetPercent: number; correct: number; total: number }[];
  weakDomains: { name: string; percent: number; targetPercent: number; correct: number; total: number }[];
  weakSkills: { name: string; percent: number; targetPercent: number; correct: number; total: number }[];
  weakItemTypes: { name: string; percent: number; targetPercent: number; correct: number; total: number }[];
  readinessBand?: string;
  readinessScore?: number;
  recentMistakes?: string[];
  focusAreaId?: string;
}

interface CoachResponse {
  summaryOfWeakAreas: string;
  likelyCausesOfMistakes: string;
  whatLearnerProbablyConfusing: string;
  recommendedContentToReview: string;
  recommendedQuestionVolume: string;
  suggestedNextStep: string;
  mnemonicSuggestion?: string;
  followUpQuestions?: string[];
}

export interface JadeTutorWeakAreaPanelProps {
  /** When coaching a single area, pass the area. Otherwise null = all weak areas */
  focusArea: MasteryRollup | null;
  payload: WeakAreaCoachPayload;
  drillHref?: string;
  onSaveToNotebook?: (content: string) => void;
  onSaveRemediationPlan?: (planData: Record<string, unknown>) => void;
  onClose: () => void;
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content?.trim()) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">{title}</h3>
      <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </section>
  );
}

export function JadeTutorWeakAreaPanel({
  focusArea,
  payload,
  drillHref,
  onSaveToNotebook,
  onSaveRemediationPlan,
  onClose,
}: JadeTutorWeakAreaPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mode, setMode] = useState<CoachingMode | null>(null);
  const [data, setData] = useState<CoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (coachingMode: CoachingMode) => {
      setMode(coachingMode);
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/ai/weak-area-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            coachingMode,
            focusAreaId: focusArea ? `${focusArea.type}:${focusArea.name}` : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Request failed");
          setStatus("error");
          return;
        }
        if (json.success && json.data) {
          setData(json.data);
          setStatus("success");
        } else {
          setError("Invalid response");
          setStatus("error");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    },
    [payload, focusArea]
  );

  const handleSaveNotebook = useCallback(() => {
    if (!data || !onSaveToNotebook) return;
    const content = [
      data.summaryOfWeakAreas,
      data.likelyCausesOfMistakes,
      data.recommendedContentToReview,
      data.recommendedQuestionVolume,
      data.suggestedNextStep,
      data.mnemonicSuggestion,
    ]
      .filter(Boolean)
      .join("\n\n");
    onSaveToNotebook(content);
  }, [data, onSaveToNotebook]);

  const handleSavePlan = useCallback(() => {
    if (!data || !onSaveRemediationPlan) return;
    onSaveRemediationPlan({
      summary: data.summaryOfWeakAreas,
      suggestedNextStep: data.suggestedNextStep,
      recommendedContentToReview: data.recommendedContentToReview,
      recommendedQuestionVolume: data.recommendedQuestionVolume,
    });
  }, [data, onSaveRemediationPlan]);

  const title = focusArea ? `Jade Tutor: ${focusArea.name}` : "Jade Tutor: Weak Areas";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col"
        role="dialog"
        aria-labelledby="jade-weak-area-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 id="jade-weak-area-title" className="font-heading font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {status === "idle" && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a coaching action:
              </p>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => run("explain_weakness")}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Explain why this is a weak area
                </button>
                <button
                  type="button"
                  onClick={() => run("teach_from_zero")}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Teach this concept simply
                </button>
                <button
                  type="button"
                  onClick={() => run("remediation_plan")}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Make a mini study plan for this weak area
                </button>
                <button
                  type="button"
                  onClick={() => run("mnemonic")}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Give me a mnemonic for this topic
                </button>
                <button
                  type="button"
                  onClick={() => run("follow_up_questions")}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Give me 5 follow-up questions
                </button>
              </div>
              {drillHref && (
                <a
                  href={drillHref}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Start weak-area drill →
                </a>
              )}
            </div>
          )}

          {status === "loading" && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-16 w-full mt-4" />
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium"
              >
                Back
              </button>
            </div>
          )}

          {status === "success" && data && (
            <div className="space-y-6">
              <Section title="Summary" content={data.summaryOfWeakAreas} />
              <Section title="Likely causes" content={data.likelyCausesOfMistakes} />
              <Section title="What you might be confusing" content={data.whatLearnerProbablyConfusing} />
              <Section title="Content to review" content={data.recommendedContentToReview} />
              <Section title="Question volume" content={data.recommendedQuestionVolume} />
              <Section title="Suggested next step" content={data.suggestedNextStep} />
              {data.mnemonicSuggestion && (
                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                    Mnemonic
                  </h3>
                  <p className="text-indigo-900 dark:text-indigo-100 font-medium">
                    {data.mnemonicSuggestion}
                  </p>
                </div>
              )}
              {data.followUpQuestions && data.followUpQuestions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    5 follow-up questions
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-800 dark:text-slate-200">
                    {data.followUpQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </section>
              )}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                {onSaveToNotebook && (
                  <button
                    type="button"
                    onClick={handleSaveNotebook}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save to notebook
                  </button>
                )}
                {mode === "remediation_plan" && onSaveRemediationPlan && (
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save remediation plan
                  </button>
                )}
                {drillHref && (
                  <a
                    href={drillHref}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    Start weak-area drill →
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
