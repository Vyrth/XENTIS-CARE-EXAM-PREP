"use client";

import { useState } from "react";
import type { QuestionRendererProps } from "./index";

export function DosageCalcRenderer({
  question,
  response,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const [input, setInput] = useState(
    response?.type === "numeric" ? String(response.value) : ""
  );

  const handleBlur = () => {
    const num = parseFloat(input);
    if (!Number.isNaN(num)) {
      onChange({ type: "numeric", value: num });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Enter your calculated answer. Include units if specified.</p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="0"
          className="w-32 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-lg"
        />
        <span className="text-slate-500 text-sm">(use calculator tool if needed)</span>
      </div>
    </div>
  );
}
