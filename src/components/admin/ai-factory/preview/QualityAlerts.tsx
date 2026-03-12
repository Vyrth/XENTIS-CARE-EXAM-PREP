"use client";

import { Icons } from "@/components/ui/icons";

export interface QualityAlertsProps {
  /** Blocking errors - prevent save */
  errors: string[];
  /** Non-blocking warnings */
  warnings?: string[];
  /** Duplicate detection message - shown as warning when similar */
  duplicateMessage?: string;
  /** When true, duplicate blocks save (identical match) - show as error */
  duplicateBlocksSave?: boolean;
  /** Optional board relevance 0-1 */
  boardRelevance?: number;
  className?: string;
}

export function QualityAlerts({
  errors,
  warnings = [],
  duplicateMessage,
  duplicateBlocksSave = false,
  boardRelevance,
  className = "",
}: QualityAlertsProps) {
  const blockingDuplicate = duplicateBlocksSave && duplicateMessage;
  const effectiveErrors = blockingDuplicate ? [...errors, duplicateMessage] : errors;
  const effectiveWarnings = blockingDuplicate ? warnings : (duplicateMessage ? [duplicateMessage, ...warnings] : warnings);
  const hasErrors = effectiveErrors.length > 0;
  const hasWarnings = effectiveWarnings.length > 0;

  if (!hasErrors && !hasWarnings) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {hasErrors && (
        <div
          className="flex gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3"
          role="alert"
          aria-live="polite"
        >
          <span className="text-red-600 dark:text-red-400 shrink-0 mt-0.5">{Icons.alertTriangle}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Fix before saving</p>
            <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-0.5">
              {effectiveErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {hasWarnings && (
        <div
          className="flex gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3"
          role="status"
          aria-live="polite"
        >
          <span className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">{Icons.alertTriangle}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Warnings</p>
            <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
              {effectiveWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {boardRelevance != null && boardRelevance < 0.6 && !hasErrors && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Board relevance: {Math.round(boardRelevance * 100)}% — consider adding more detail for exam prep.
        </p>
      )}
    </div>
  );
}
