"use client";

import { Icons } from "@/components/ui/icons";

export interface ValidationWarningsProps {
  errors: string[];
  className?: string;
}

export function ValidationWarnings({ errors, className = "" }: ValidationWarningsProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className={`flex gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">{Icons.alertTriangle}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Validation warnings</p>
        <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
