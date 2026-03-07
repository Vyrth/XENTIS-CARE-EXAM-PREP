"use client";

import type { QuestionRendererProps } from "./index";

export function HighlightTextRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const selected = response?.type === "highlight" ? response.value : [];
  const targets = question.highlightTargets ?? [
    { id: "t1", text: "Option A" },
    { id: "t2", text: "Option B" },
    { id: "t3", text: "Option C" },
  ];

  const toggle = (id: string) => {
    if (disabled) return;
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ type: "highlight", value: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Select the text that answers the question.</p>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-sm ${
              selected.includes(t.id)
                ? "bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.text}
          </button>
        ))}
      </div>
    </div>
  );
}
