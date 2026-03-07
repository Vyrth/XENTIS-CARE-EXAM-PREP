"use client";

import type { ExamResponse } from "@/types/exam";
import type { QuestionRendererProps } from "./index";

export function MultipleResponseRenderer({
  question,
  response,
  onChange,
  struckOut = [],
  onStrikeOut,
  disabled,
}: QuestionRendererProps) {
  const selected = response?.type === "multiple" ? response.value : [];

  const toggle = (key: string) => {
    if (disabled) return;
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange({ type: "multiple", value: next });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Select all that apply.</p>
      {question.options?.map((opt) => {
        const isStruck = struckOut.includes(opt.key);
        return (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              selected.includes(opt.key)
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            } ${isStruck ? "line-through opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.key)}
              onChange={() => toggle(opt.key)}
              disabled={disabled}
              className="w-4 h-4 rounded"
            />
            <span className="flex-1 text-slate-700 dark:text-slate-300">{opt.text}</span>
          </label>
        );
      })}
    </div>
  );
}
