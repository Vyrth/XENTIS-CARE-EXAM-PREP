"use client";

import { memo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { getQuestionRenderer } from "@/components/exam/question-renderers";
import type { ExamResponse } from "@/types/exam";

export interface AdaptiveQuestionViewProps {
  question: {
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
  questionNumber: number;
  response?: ExamResponse;
  onResponse: (r: ExamResponse) => void;
  disabled?: boolean;
}

export const AdaptiveQuestionView = memo(function AdaptiveQuestionView({
  question,
  questionNumber,
  response,
  onResponse,
  disabled = false,
}: AdaptiveQuestionViewProps) {
  const Renderer = getQuestionRenderer(question.type);
  const handleChange = useCallback(
    (r: ExamResponse) => {
      if (!disabled) onResponse(r);
    },
    [disabled, onResponse]
  );

  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Question {questionNumber} · {question.type.replace(/_/g, " ")}
      </p>
      {question.leadIn && (
        <p className="text-slate-600 dark:text-slate-300 mb-4 italic">{question.leadIn}</p>
      )}
      <p className="text-slate-900 dark:text-white mb-6">{question.stem}</p>
      {question.instructions && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{question.instructions}</p>
      )}
      <Renderer
        question={question}
        response={response}
        onChange={handleChange}
        struckOut={[]}
        disabled={disabled}
      />
    </Card>
  );
});
