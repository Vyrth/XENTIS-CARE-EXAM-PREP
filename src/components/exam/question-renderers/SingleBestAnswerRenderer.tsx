"use client";

import type { ExamResponse } from "@/types/exam";
import type { QuestionRendererProps } from "./index";

export function SingleBestAnswerRenderer({
  question,
  response,
  onChange,
  struckOut = [],
  onStrikeOut,
  disabled,
}: QuestionRendererProps) {
  const selected = response?.type === "single" ? response.value : undefined;

  const handleSelect = (key: string) => {
    if (disabled) return;
    onChange({ type: "single", value: key });
  };

  const handleStrikeOut = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onStrikeOut) {
      const next = struckOut.includes(key) ? struckOut.filter((k) => k !== key) : [...struckOut, key];
      onStrikeOut(next);
    }
  };

  return (
    <div className="space-y-3">
      {question.options?.map((opt) => {
        const isStruck = struckOut.includes(opt.key);
        return (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              selected === opt.key
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            } ${isStruck ? "line-through opacity-60" : ""}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              value={opt.key}
              checked={selected === opt.key}
              onChange={() => handleSelect(opt.key)}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="flex-1 text-slate-700 dark:text-slate-300">{opt.text}</span>
            {onStrikeOut && (
              <button
                type="button"
                onClick={(e) => handleStrikeOut(e, opt.key)}
                className="text-xs text-slate-500 hover:text-slate-700"
                title="Strike out"
              >
                S
              </button>
            )}
          </label>
        );
      })}
    </div>
  );
}
