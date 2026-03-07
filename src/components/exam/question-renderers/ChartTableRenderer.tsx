"use client";

import type { QuestionRendererProps } from "./index";

export function ChartTableRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const selected = response?.type === "single" ? response.value : undefined;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
        <p className="text-sm text-slate-500 mb-2">[Chart/Table exhibit placeholder]</p>
        <div className="min-w-[300px] h-32 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-slate-500">
          Table or chart data
        </div>
      </div>
      <div className="space-y-3">
        {question.options?.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${
              selected === opt.key ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              value={opt.key}
              checked={selected === opt.key}
              onChange={() => !disabled && onChange({ type: "single", value: opt.key })}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="text-slate-700 dark:text-slate-300">{opt.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
