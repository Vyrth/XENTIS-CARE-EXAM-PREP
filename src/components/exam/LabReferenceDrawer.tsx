"use client";

import { useState, useEffect } from "react";

type LabSet = { id: string; name: string };
type LabValue = { id: string; name: string; abbreviation?: string; unit?: string; low?: number; high?: number; set: string };

type LabReferenceDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LabReferenceDrawer({ isOpen, onClose }: LabReferenceDrawerProps) {
  const [sets, setSets] = useState<LabSet[]>([]);
  const [values, setValues] = useState<LabValue[]>([]);
  const [activeSet, setActiveSet] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/lab-refs")
      .then((r) => r.json())
      .then((data) => {
        const s = data.sets ?? [];
        const v = data.values ?? [];
        setSets(s);
        setValues(v);
        setActiveSet((prev) => (prev && s.some((x: LabSet) => x.id === prev)) ? prev : (s[0]?.id ?? null));
      })
      .catch(() => {
        setSets([]);
        setValues([]);
        setActiveSet(null);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const labs = values.filter((l) => l.set === activeSet);
  const displaySet = activeSet ?? (sets[0]?.id ?? null);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
          Lab Reference
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-slate-800">
        {sets.length === 0 ? (
          <span className="text-sm text-slate-500">No lab sets</span>
        ) : (
          sets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => setActiveSet(set.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                displaySet === set.id
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {set.name}
            </button>
          ))
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {labs.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No content available yet for your track.
            </p>
          ) : (
            labs.map((lab) => (
              <div
                key={lab.id}
                className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800"
              >
                <div>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {lab.name}
                    {lab.abbreviation && (
                      <span className="text-slate-500 text-sm ml-1">
                        ({lab.abbreviation})
                      </span>
                    )}
                  </span>
                  {lab.unit && (
                    <span className="text-slate-500 text-sm ml-2">{lab.unit}</span>
                  )}
                </div>
                {lab.low != null && lab.high != null ? (
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">
                    {lab.low}–{lab.high}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
