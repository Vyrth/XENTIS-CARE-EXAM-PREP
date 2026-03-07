"use client";

import type { QuestionRendererProps } from "./index";

export function DropdownClozeRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const value = response?.type === "dropdown" ? response.value : {};
  const blanks = question.clozeBlanks ?? [{ id: "b1", options: ["Option A", "Option B", "Option C"] }];

  const setBlank = (id: string, val: string) => {
    if (disabled) return;
    onChange({ type: "dropdown", value: { ...value, [id]: val } });
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-700 dark:text-slate-300">
        [Cloze stem with blanks — select from dropdowns]
      </p>
      <div className="flex flex-wrap gap-2">
        {blanks.map((b) => (
          <select
            key={b.id}
            value={value[b.id] ?? ""}
            onChange={(e) => setBlank(b.id, e.target.value)}
            disabled={disabled}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            <option value="">Select...</option>
            {b.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
