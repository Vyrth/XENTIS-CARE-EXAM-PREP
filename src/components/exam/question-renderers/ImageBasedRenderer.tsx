"use client";

import { useState } from "react";
import type { QuestionRendererProps } from "./index";

export function ImageBasedRenderer({
  question,
  response,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const [zoom, setZoom] = useState(false);
  const selected = response?.type === "single" ? response.value : undefined;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          className={`rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[200px] cursor-pointer ${
            zoom ? "fixed inset-4 z-50 bg-white dark:bg-slate-900" : ""
          }`}
          onClick={() => setZoom((z) => !z)}
        >
          {question.imageUrl ? (
            <img src={question.imageUrl} alt="Question exhibit" className={zoom ? "max-h-[90vh] object-contain" : "max-h-64"} />
          ) : (
            <span className="text-slate-500">[Image / ECG placeholder]</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800/80 text-white text-xs"
        >
          {zoom ? "Zoom out" : "Zoom"}
        </button>
      </div>
      <div className="space-y-3">
        {question.options?.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              selected === opt.key
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
