"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ExamToolButton } from "@/components/ui/ExamToolButton";
import { Icons } from "@/components/ui/icons";

export default function ExamPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const examTools = [
    { id: "flag", label: "Flag", icon: Icons["help-circle"] },
    { id: "calculator", label: "Calc", icon: Icons["help-circle"] },
    { id: "lab", label: "Lab", icon: Icons["clipboard-list"] },
    { id: "whiteboard", label: "Board", icon: Icons.notebook },
    { id: "highlight", label: "Highlight", icon: Icons["book-open"] },
    { id: "zoom", label: "Zoom", icon: Icons["bar-chart"] },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Practice Exam
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            1 of 50
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="text-lg">⏱️</span>
            <span className="font-mono text-sm">2:45:00</span>
          </div>
        </div>
      </div>

      {/* Exam tool bar */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-2">
          {examTools.map((tool) => (
            <ExamToolButton
              key={tool.id}
              icon={tool.icon}
              label={tool.label}
              active={activeTool === tool.id}
              onClick={() =>
                setActiveTool(activeTool === tool.id ? null : tool.id)
              }
            />
          ))}
        </div>
      </Card>

      {/* Question placeholder */}
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Question 1
        </p>
        <p className="text-slate-900 dark:text-white mb-6">
          A 65-year-old patient with a history of hypertension presents with
          chest pain. Which assessment finding is most indicative of an acute
          myocardial infarction?
        </p>
        <div className="space-y-3">
          {["A", "B", "C", "D"].map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <input type="radio" name="q1" value={opt} className="w-4 h-4" />
              <span className="text-slate-700 dark:text-slate-300">
                Option {opt} — Placeholder answer text
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
