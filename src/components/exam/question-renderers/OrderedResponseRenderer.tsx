"use client";

import type { QuestionRendererProps } from "./index";

export function OrderedResponseRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const ordered = response?.type === "ordered" ? response.value : [];
  const remaining = question.options?.filter((o) => !ordered.includes(o.key)) ?? [];

  const add = (key: string) => {
    if (disabled) return;
    onChange({ type: "ordered", value: [...ordered, key] });
  };

  const remove = (key: string) => {
    if (disabled) return;
    onChange({ type: "ordered", value: ordered.filter((k) => k !== key) });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Drag or click to order. Selected order:</p>
      <div className="flex flex-wrap gap-2">
        {ordered.map((k) => {
          const opt = question.options?.find((o) => o.key === k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => remove(k)}
              disabled={disabled}
              className="px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 text-sm"
            >
              {opt?.text ?? k} ×
            </button>
          );
        })}
      </div>
      <p className="text-sm text-slate-500">Click to add to order:</p>
      <div className="flex flex-wrap gap-2">
        {remaining.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => add(opt.key)}
            disabled={disabled}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
