"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import {
  toStructuredNoteSections,
  toPlainTextNote,
} from "@/lib/ai/notebook-summary/summary-formatter";
import type { NotebookSummaryState } from "@/hooks/useNotebookSummary";

type NotebookSummaryPanelProps = {
  state: NotebookSummaryState;
  originalText?: string;
  onClose: () => void;
  onRetry?: () => void;
  onSave?: (plainText: string) => void;
};

function SectionBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  if (!content?.trim()) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
        {title}
      </h3>
      <div className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </section>
  );
}

export function NotebookSummaryPanel({
  state,
  originalText,
  onClose,
  onRetry,
  onSave,
}: NotebookSummaryPanelProps) {
  const isVisible =
    state.status === "loading" ||
    state.status === "success" ||
    state.status === "error";

  if (!isVisible) return null;

  const sections =
    state.status === "success"
      ? toStructuredNoteSections(state.data)
      : [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col"
        role="dialog"
        aria-labelledby="notebook-summary-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="notebook-summary-panel-title"
            className="font-heading font-semibold text-slate-900 dark:text-white"
          >
            Summary
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {originalText && (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 italic">
              &quot;{originalText.length > 120 ? `${originalText.slice(0, 120)}...` : originalText}&quot;
            </div>
          )}

          {state.status === "loading" && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-16 w-full mt-4" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {state.status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600 dark:text-red-400">{state.error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {state.status === "success" && (
            <div className="space-y-6">
              {sections.map((s) => (
                <SectionBlock key={s.type} title={s.title} content={s.content} />
              ))}
              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave(toPlainTextNote(state.data))}
                  className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Save to notebook
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
