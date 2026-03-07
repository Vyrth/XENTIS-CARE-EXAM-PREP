"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { AIPopover } from "@/components/study/AIPopover";
import { ExplainHighlightPanel } from "@/components/study/ExplainHighlightPanel";
import { useAIPopover } from "@/hooks/useAIPopover";
import { useExplainHighlight } from "@/hooks/useExplainHighlight";
import { useTrack } from "@/hooks/useTrack";
import { useNotebook } from "@/hooks/useNotebook";
import { Icons } from "@/components/ui/icons";
import {
  MOCK_QUESTIONS,
  MOCK_IMAGE_QUESTION,
  MOCK_CASE_STUDY_QUESTION,
} from "@/data/mock/questions";

const ALL_QUESTIONS = [
  ...MOCK_QUESTIONS,
  MOCK_IMAGE_QUESTION,
  MOCK_CASE_STUDY_QUESTION,
];

export default function RationalePage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;
  const questionId = params.questionId as string;
  const track = useTrack();
  const { open, close, selectedText, position, isOpen } = useAIPopover();
  const { state, explain, reset } = useExplainHighlight(track);
  const { addNote } = useNotebook();

  const runExplain = useCallback(
    (mode: "explain_simple" | "board_focus" | "mnemonic") => {
      if (!selectedText) return;
      close();
      explain(selectedText, mode, {
        sourceType: "rationale",
        sourceId: questionId,
      });
    },
    [selectedText, close, explain, questionId]
  );

  const handleClosePanel = useCallback(() => {
    reset();
  }, [reset]);

  const question = ALL_QUESTIONS.find((q) => q.id === questionId);
  const index = ALL_QUESTIONS.findIndex((q) => q.id === questionId);
  const prevQuestion = index > 0 ? ALL_QUESTIONS[index - 1] : null;
  const nextQuestion = index < ALL_QUESTIONS.length - 1 ? ALL_QUESTIONS[index + 1] : null;

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
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          Correct answer: {question.correctAnswer}
        </p>
        <button
          type="button"
          onClick={() => {
            const p = new URLSearchParams({
              action: "explain_question",
              stem: question.stem.slice(0, 300),
              rationale: (question.rationale ?? "").slice(0, 500),
              correctAnswer: String(question.correctAnswer ?? ""),
            });
            router.push(`/ai-tutor?${p.toString()}`);
          }}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Explain this question (AI)
        </button>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Rationale
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Highlight text to Ask AI or Save to Notebook.
        </p>
        <HighlightableContent
          content={`<p>${question.rationale ?? "No rationale available."}</p>`}
          contentId={questionId}
          variant="html"
          onHighlight={handleHighlight}
          onSaveToNotebook={handleSaveToNotebook}
        />
      </Card>

      <div className="flex justify-between">
        {prevQuestion ? (
          <Link
            href={`/results/${resultId}/rationale/${prevQuestion.id}`}
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
            href={`/results/${resultId}/rationale/${nextQuestion.id}`}
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
        onMnemonic={() => runExplain("mnemonic")}
      />
      <ExplainHighlightPanel
        state={state}
        selectedText={selectedText}
        onClose={handleClosePanel}
        onRetry={() => selectedText && runExplain("explain_simple")}
      />
    </div>
  );
}
