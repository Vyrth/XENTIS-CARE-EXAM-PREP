"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  explainQuestion,
  compareConcepts,
  generateFlashcards,
  summarizeToNotebook,
  generateMnemonic,
  quizFollowup,
} from "@/app/actions/ai";
import type { TrackSlug } from "@/data/mock/types";

export interface JadeTutorReviewPanelProps {
  questionId: string;
  questionStem: string;
  rationale: string;
  correctAnswer: string;
  selectedAnswer: string;
  isCorrect: boolean;
  systemName?: string;
  systemSlug?: string;
  topicName?: string;
  options?: { key: string; text: string; isCorrect?: boolean }[];
  track: TrackSlug;
  onSaveToNotebook?: (content: string, contentRef?: string) => void;
  onSaveFlashcards?: (cards: { front: string; back: string }[]) => void;
}

type PanelState = "idle" | "loading" | "success" | "error";

export function JadeTutorReviewPanel({
  questionId,
  questionStem,
  rationale,
  correctAnswer,
  selectedAnswer,
  isCorrect,
  systemName,
  systemSlug,
  topicName,
  options = [],
  track,
  onSaveToNotebook,
  onSaveFlashcards,
}: JadeTutorReviewPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [content, setContent] = useState("");
  const [lastFlashcards, setLastFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [lastSummary, setLastSummary] = useState("");
  const [remediationSuggestions, setRemediationSuggestions] = useState<string[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<{ stem: string; options: string[]; correctKey: string }[]>([]);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const distractors = options.filter((o) => !o.isCorrect).map((o) => ({ key: o.key, text: o.text }));

  const runAction = useCallback(
    async (
      action: "explain" | "board" | "why_wrong" | "mnemonic" | "compare" | "flashcards" | "summarize" | "quiz"
    ) => {
      setState("loading");
      setError("");
      setContent("");
      setLastFlashcards([]);
      setLastSummary("");
      setRemediationSuggestions([]);
      setQuizQuestions([]);
      setIsExpanded(true);

      try {
        if (action === "explain" || action === "board" || action === "why_wrong") {
          const result = await explainQuestion({
            questionStem,
            rationale,
            correctAnswer,
            selectedAnswer,
            userCorrect: isCorrect,
            systemName,
            topicName,
            distractors: action === "why_wrong" ? distractors : undefined,
            explainMode:
              action === "board"
                ? "board_focus"
                : action === "why_wrong"
                  ? "why_others_wrong"
                  : "simple",
            questionId,
          });
          if (result.success && result.data?.content) {
            setContent(result.data.content);
            setRemediationSuggestions(result.data.remediationSuggestions ?? []);
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }

        if (action === "quiz") {
          const sourceContent = `${questionStem}\n\nRationale: ${rationale}`;
          const result = await quizFollowup({ content: sourceContent });
          if (result.success && result.data) {
            setContent(result.data.content ?? "");
            setQuizQuestions(result.data.quizQuestions ?? []);
            setRemediationSuggestions(result.data.remediationSuggestions ?? []);
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }

        if (action === "mnemonic") {
          const topic = topicName || systemName || questionStem.slice(0, 100);
          const result = await generateMnemonic({ topic });
          if (result.success && result.data?.content) {
            setContent(result.data.content);
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }

        if (action === "compare") {
          const concepts = [systemName, topicName].filter((x): x is string => !!x);
          if (concepts.length < 2) {
            setError("Need system and topic for compare. Try another action.");
            setState("error");
            return;
          }
          const result = await compareConcepts({ concepts });
          if (result.success && result.data?.content) {
            setContent(result.data.content);
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }

        if (action === "flashcards") {
          const sourceContent = `${questionStem}\n\nRationale: ${rationale}`;
          const result = await generateFlashcards({ content: sourceContent });
          if (result.success && result.data) {
            setContent(result.data.content ?? "");
            if (result.data.flashcards?.length) {
              setLastFlashcards(result.data.flashcards);
            }
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }

        if (action === "summarize") {
          const sourceContent = `${questionStem}\n\nCorrect: ${correctAnswer}\n\nRationale: ${rationale}`;
          const result = await summarizeToNotebook({ notebookContent: sourceContent });
          if (result.success && result.data?.content) {
            setContent(result.data.content);
            setLastSummary(result.data.content);
            setState("success");
          } else {
            setError((result as { error?: string }).error ?? "Request failed");
            setState("error");
          }
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setState("error");
      }
    },
    [
      questionStem,
      rationale,
      correctAnswer,
      selectedAnswer,
      isCorrect,
      systemName,
      topicName,
      distractors,
      questionId,
    ]
  );

  const handleSaveToNotebook = useCallback(() => {
    if (lastSummary && onSaveToNotebook) {
      onSaveToNotebook(lastSummary, questionId);
      setLastSummary("");
    }
  }, [lastSummary, onSaveToNotebook, questionId]);

  const handleSaveFlashcards = useCallback(() => {
    if (lastFlashcards.length > 0 && onSaveFlashcards) {
      onSaveFlashcards(lastFlashcards);
      setLastFlashcards([]);
    }
  }, [lastFlashcards, onSaveFlashcards]);

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-3">
        Remediate with Jade Tutor
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Get explanations, mnemonics, and study tips for this question.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => runAction("explain")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50"
        >
          Teach this concept simply
        </button>
        {!isCorrect && distractors.length > 0 && (
          <button
            type="button"
            onClick={() => runAction("why_wrong")}
            disabled={state === "loading"}
            className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
          >
            Explain why answer was wrong
          </button>
        )}
        <button
          type="button"
          onClick={() => runAction("board")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Board tip
        </button>
        <button
          type="button"
          onClick={() => runAction("mnemonic")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Give me a mnemonic
        </button>
        {systemName && topicName && (
          <button
            type="button"
            onClick={() => runAction("compare")}
            disabled={state === "loading"}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Compare two confusing diagnoses/drugs
          </button>
        )}
        <button
          type="button"
          onClick={() => runAction("flashcards")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Convert to flashcards
        </button>
        <button
          type="button"
          onClick={() => runAction("summarize")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Save to notebook
        </button>
        <button
          type="button"
          onClick={() => runAction("quiz")}
          disabled={state === "loading"}
          className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50"
        >
          Quiz me with 3 follow-up questions
        </button>
      </div>

      {!isCorrect && systemSlug && (
        <div className="mb-4">
          <Link
            href={`/questions/system/${systemSlug}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50"
          >
            Study this weak area
            {Icons.chevronRight}
          </Link>
        </div>
      )}

      {state === "loading" && (
        <div className="py-4 text-slate-500 dark:text-slate-400">
          <span className="animate-pulse">Jade is thinking...</span>
        </div>
      )}

      {state === "error" && (
        <div className="py-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {state === "success" && content && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Jade&apos;s response
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded((e) => !e)}
              className="text-slate-500 hover:text-slate-700"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <div
            className={`prose prose-sm dark:prose-invert max-w-none ${
              !isExpanded ? "max-h-48 overflow-y-auto" : ""
            }`}
          >
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{content}</p>
          </div>

          {remediationSuggestions.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                What to review next
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                {remediationSuggestions.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {quizQuestions.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-2">
                Follow-up questions
              </p>
              <ol className="text-sm text-indigo-700 dark:text-indigo-300 list-decimal list-inside space-y-2">
                {quizQuestions.slice(0, 5).map((q, i) => (
                  <li key={i}>{q.stem}</li>
                ))}
              </ol>
            </div>
          )}

          {lastFlashcards.length > 0 && onSaveFlashcards && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Save {lastFlashcards.length} flashcards?
              </p>
              <button
                type="button"
                onClick={handleSaveFlashcards}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Save to deck
              </button>
            </div>
          )}

          {lastSummary && onSaveToNotebook && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Save to notebook?
              </p>
              <button
                type="button"
                onClick={handleSaveToNotebook}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
