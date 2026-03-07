"use client";

import { useState } from "react";
import type { QuestionRendererProps } from "./index";

export function CaseStudyRenderer({
  question,
  response,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const [activeTab, setActiveTab] = useState(question.caseStudyTabs?.[0]?.id ?? "");
  const tab = question.caseStudyTabs?.find((t) => t.id === activeTab);
  const selected = response?.type === "single" ? response.value : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Case study</p>
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {question.caseStudyTabs?.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === t.id
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl text-slate-700 dark:text-slate-300 text-sm">
          {tab?.content}
        </div>
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
