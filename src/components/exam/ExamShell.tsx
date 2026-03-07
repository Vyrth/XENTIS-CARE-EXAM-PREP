"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { ExamToolButton } from "@/components/ui/ExamToolButton";
import { LabReferenceDrawer } from "@/components/exam/LabReferenceDrawer";
import { CalculatorDrawer } from "@/components/exam/CalculatorDrawer";
import { WhiteboardDrawer } from "@/components/exam/WhiteboardDrawer";
import { getQuestionRenderer } from "@/components/exam/question-renderers";
import { Icons } from "@/components/ui/icons";
import type { ExamResponse } from "@/types/exam";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface ExamShellProps {
  question: {
    id: string;
    stem: string;
    type: string;
    options?: { key: string; text: string; isCorrect?: boolean }[];
    imageUrl?: string;
    caseStudyTabs?: { id: string; title: string; content: string }[];
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
  totalQuestions: number;
  answeredCount: number;
  timeRemainingSeconds: number;
  isFlagged: boolean;
  response?: ExamResponse;
  struckOut?: string[];
  onResponse: (response: ExamResponse) => void;
  onToggleFlag: () => void;
  onStrikeOut?: (keys: string[]) => void;
  onPrev: () => void;
  onNext: () => void;
  onReview: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ExamShell({
  question,
  questionNumber,
  totalQuestions,
  answeredCount,
  timeRemainingSeconds,
  isFlagged,
  response,
  struckOut = [],
  onResponse,
  onToggleFlag,
  onStrikeOut,
  onPrev,
  onNext,
  onReview,
  isFirst,
  isLast,
}: ExamShellProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [time, setTime] = useState(timeRemainingSeconds);

  useEffect(() => {
    setTime(timeRemainingSeconds);
  }, [timeRemainingSeconds]);

  useEffect(() => {
    const t = setInterval(() => setTime((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const Renderer = getQuestionRenderer(question.type);

  const examTools = [
    { id: "flag", label: "Flag", icon: Icons["help-circle"] },
    { id: "strikeout", label: "Strike", icon: Icons["help-circle"] },
    { id: "calculator", label: "Calc", icon: Icons["help-circle"] },
    { id: "lab", label: "Labs", icon: Icons["clipboard-list"] },
    { id: "whiteboard", label: "Board", icon: Icons.notebook },
  ];

  const handleToolClick = (id: string) => {
    if (id === "flag") {
      onToggleFlag();
      return;
    }
    setActiveTool(activeTool === id ? null : id);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
          Exam
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {questionNumber} of {totalQuestions}
          </span>
          <span className="text-sm text-slate-500">{answeredCount} answered</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="font-mono text-sm">{formatTime(time)}</span>
          </div>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap gap-2">
          {examTools.map((tool) => (
            <ExamToolButton
              key={tool.id}
              icon={tool.icon}
              label={tool.label}
              active={tool.id === "flag" ? isFlagged : activeTool === tool.id}
              onClick={() => handleToolClick(tool.id)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Question {questionNumber} · {question.type.replace(/_/g, " ")}
        </p>
        <p className="text-slate-900 dark:text-white mb-6">{question.stem}</p>
        <Renderer
          question={question}
          response={response}
          onChange={onResponse}
          struckOut={struckOut}
          onStrikeOut={onStrikeOut}
        />
      </Card>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onReview}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Review
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>

      <LabReferenceDrawer isOpen={activeTool === "lab"} onClose={() => setActiveTool(null)} />
      <CalculatorDrawer isOpen={activeTool === "calculator"} onClose={() => setActiveTool(null)} />
      <WhiteboardDrawer isOpen={activeTool === "whiteboard"} onClose={() => setActiveTool(null)} />
    </div>
  );
}
