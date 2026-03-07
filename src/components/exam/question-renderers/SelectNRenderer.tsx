"use client";

import type { QuestionRendererProps } from "./index";

export function SelectNRenderer({
  question,
  response,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const selected = response?.type === "multiple" ? response.value : [];
  const n = question.selectN ?? 2;

  const toggle = (key: string) => {
    if (disabled) return;
    let next: string[];
    if (selected.includes(key)) {
      next = selected.filter((k) => k !== key);
    } else if (selected.length < n) {
      next = [...selected, key];
    } else {
      next = [...selected.slice(1), key];
    }
    onChange({ type: "multiple", value: next });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Select exactly {n}.</p>
      {question.options?.map((opt) => (
        <label
          key={opt.key}
          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
            selected.includes(opt.key)
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.key)}
            onChange={() => toggle(opt.key)}
            disabled={disabled}
            className="w-4 h-4 rounded"
          />
          <span className="text-slate-700 dark:text-slate-300">{opt.text}</span>
        </label>
      ))}
    </div>
  );
}
