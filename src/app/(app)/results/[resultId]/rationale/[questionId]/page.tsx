"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { AIPopover } from "@/components/study/AIPopover";
import { ExplainHighlightPanel } from "@/components/study/ExplainHighlightPanel";
import { MnemonicPanel } from "@/components/study/MnemonicPanel";
import { JadeTutorReviewPanel } from "@/components/study/JadeTutorReviewPanel";
import { useAIPopover } from "@/hooks/useAIPopover";
import { useExplainHighlight } from "@/hooks/useExplainHighlight";
import { useMnemonic } from "@/hooks/useMnemonic";
import { useTrack } from "@/hooks/useTrack";
import { useNotebook } from "@/hooks/useNotebook";
import { useQuestion } from "@/hooks/useQuestion";
import { useExamSession } from "@/hooks/useExamSession";
import { Icons } from "@/components/ui/icons";
import type { ExamResponse } from "@/types/exam";

function formatUserResponse(r: ExamResponse): string {
  switch (r.type) {
    case "single":
      return String(r.value);
    case "multiple":
    case "ordered":
      return Array.isArray(r.value) ? r.value.join(", ") : String(r.value);
    case "numeric":
      return String(r.value);
    case "dropdown":
    case "matrix":
      return typeof r.value === "object" && r.value !== null
        ? Object.entries(r.value)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ")
        : String(r.value);
    case "hotspot":
    case "highlight":
      return Array.isArray(r.value) ? r.value.join(", ") : String(r.value);
    default:
      return String((r as { value?: unknown }).value ?? "—");
  }
}

function computeIsCorrect(
  response: ExamResponse | undefined,
  correctAnswer: string | string[] | undefined
): boolean {
  if (!response || correctAnswer == null) return false;
  const correct = Array.isArray(correctAnswer)
    ? correctAnswer.map(String)
    : [String(correctAnswer)];
  if (response.type === "single") {
    return correct.includes(String(response.value));
  }
  if (response.type === "multiple" || response.type === "ordered") {
    const user = (response.value as unknown[]).map(String);
    return (
      correct.length === user.length &&
      correct.every((c) => user.includes(c)) &&
      user.every((u) => correct.includes(u))
    );
  }
  if (response.type === "numeric") {
    const exp = correct.map((c) => parseFloat(c)).find((n) => !Number.isNaN(n));
    return exp != null && Math.abs((response.value as number) - exp) < 0.01;
  }
  return false;
}

export default function RationalePage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const questionId = params.questionId as string;
  const track = useTrack();
  const { question, loading } = useQuestion(questionId, { revealAnswers: true });
  const { session: examSession, loading: sessionLoading } = useExamSession(resultId);
  const { open, close, selectedText, position, isOpen } = useAIPopover();
  const { state, explain, reset } = useExplainHighlight(track ?? "rn");
  const { state: mnemonicState, generate: generateMnemonic, reset: resetMnemonic } = useMnemonic(track ?? "rn");
  const { addNote } = useNotebook();

  const { index, prevQuestion, nextQuestion } = useMemo(() => {
    const ids = examSession?.questionIds ?? [];
    const idx = ids.indexOf(questionId);
    return {
      index: idx >= 0 ? idx : 0,
      prevQuestion: idx > 0 ? ids[idx - 1] : null,
      nextQuestion: idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null,
    };
  }, [examSession?.questionIds, questionId]);

  const runExplain = useCallback(
    (mode: "explain_simple" | "board_focus") => {
      if (!selectedText) return;
      close();
      resetMnemonic();
      explain(selectedText, mode, {
        sourceType: "rationale",
        sourceId: questionId,
      });
    },
    [selectedText, close, resetMnemonic, explain, questionId]
  );

  const runMnemonic = useCallback(() => {
    if (!selectedText) return;
    close();
    reset();
    generateMnemonic(selectedText, {
      sourceType: "rationale",
      sourceId: questionId,
    });
  }, [selectedText, close, reset, generateMnemonic, questionId]);

  const handleClosePanel = useCallback(() => {
    reset();
    resetMnemonic();
  }, [reset, resetMnemonic]);

  if (loading || sessionLoading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Question not found.</p>
        <Link href={`/exam/${resultId}/results`} className="text-indigo-600 mt-4 inline-block">
          Back to results
        </Link>
      </div>
    );
  }

  const handleHighlight = (text: string, rect: DOMRect) => {
    open(text, rect.left, rect.top);
  };

  const handleSaveToNotebook = (text: string) => {
    addNote(text, questionId);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Answer Explanation
      </h1>

      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Question {index + 1}
        </p>
        <p className="text-slate-900 dark:text-white mb-6">{question.stem}</p>
        {examSession?.responses && examSession.responses[questionId] && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Your answer: {formatUserResponse(examSession.responses[questionId])}
          </p>
        )}
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          Correct answer: {Array.isArray(question.correctAnswer)
            ? question.correctAnswer.join(", ")
            : String(question.correctAnswer ?? "—")}
        </p>
      </Card>

      {!computeIsCorrect(examSession?.responses?.[questionId], question.correctAnswer) && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            You missed this question — remediate below with Jade Tutor
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Get explanations, mnemonics, and follow-up questions tailored to your track.
          </p>
        </div>
      )}

      <JadeTutorReviewPanel
        questionId={questionId}
        questionStem={question.stem}
        rationale={question.rationale ?? ""}
        correctAnswer={Array.isArray(question.correctAnswer)
          ? question.correctAnswer.join(", ")
          : String(question.correctAnswer ?? "")}
        selectedAnswer={
          examSession?.responses?.[questionId]
            ? formatUserResponse(examSession.responses[questionId])
            : ""
        }
        isCorrect={computeIsCorrect(
          examSession?.responses?.[questionId],
          question.correctAnswer
        )}
        systemName={(question as { systemName?: string }).systemName}
        systemSlug={(question as { systemSlug?: string }).systemSlug}
        topicName={(question as { topicName?: string }).topicName}
        options={question.options}
        track={track ?? "rn"}
        onSaveToNotebook={async (content, contentRef) => {
          await addNote(content, contentRef ?? questionId);
        }}
        onSaveFlashcards={async (cards) => {
          const res = await fetch("/api/flashcards/save-deck", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flashcards: cards,
              sourceContentType: "rationale",
            }),
          });
          const json = await res.json();
          if (json.success && json.deckId) {
            window.location.href = `/flashcards/${json.deckId}`;
          }
        }}
      />

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Rationale
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Highlight text to ask Jade Tutor or save to notebook.
        </p>
        <HighlightableContent
          content={`<p>${question.rationale?.trim() || "No rationale available for this question."}</p>`}
          contentId={questionId}
          variant="html"
          onHighlight={handleHighlight}
          onSaveToNotebook={handleSaveToNotebook}
        />
      </Card>

      <div className="flex justify-between">
        {prevQuestion ? (
          <Link
            href={`/results/${resultId}/rationale/${prevQuestion}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="inline-block rotate-180">{Icons.chevronRight}</span>
            Previous
          </Link>
        ) : (
          <span />
        )}
        {nextQuestion ? (
          <Link
            href={`/results/${resultId}/rationale/${nextQuestion}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Next
            {Icons.chevronRight}
          </Link>
        ) : (
          <Link
            href={`/exam/${resultId}/results`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Back to Results
          </Link>
        )}
      </div>

      <AIPopover
        isOpen={isOpen}
        onClose={close}
        selectedText={selectedText}
        position={position}
        onExplainSimply={() => runExplain("explain_simple")}
        onBoardTip={() => runExplain("board_focus")}
        onMnemonic={runMnemonic}
      />
      <ExplainHighlightPanel
        state={state}
        selectedText={selectedText}
        onClose={handleClosePanel}
        onRetry={() => selectedText && runExplain("explain_simple")}
      />
      <MnemonicPanel
        state={mnemonicState}
        selectedText={selectedText}
        onClose={handleClosePanel}
        onRetry={runMnemonic}
      />
    </div>
  );
}
