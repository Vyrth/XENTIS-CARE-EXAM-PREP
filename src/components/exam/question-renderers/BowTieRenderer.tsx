"use client";

import type { QuestionRendererProps } from "./index";

export function BowTieRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const selected = response?.type === "single" ? response.value : undefined;
  const left = question.bowTieLeft ?? ["Cause A", "Cause B"];
  const right = question.bowTieRight ?? ["Effect 1", "Effect 2"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Bow-tie style: match causes to effects or select the best analogy.</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-2">
          {left.map((l) => (
            <div key={l} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
              {l}
            </div>
          ))}
        </div>
        <span className="text-slate-400">→</span>
        <div className="space-y-2">
          {right.map((r) => (
            <div key={r} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
              {r}
            </div>
          ))}
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
