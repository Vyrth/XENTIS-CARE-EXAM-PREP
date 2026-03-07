"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { ExplainHighlightResponse } from "@/hooks/useExplainHighlight";
import type { ExplainHighlightState } from "@/hooks/useExplainHighlight";

type ExplainHighlightPanelProps = {
  state: ExplainHighlightState;
  selectedText: string;
  onClose: () => void;
  onRetry?: () => void;
};

function ResponseSection({
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
      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
        {content}
      </p>
    </section>
  );
}

export function ExplainHighlightPanel({
  state,
  selectedText,
  onClose,
  onRetry,
}: ExplainHighlightPanelProps) {
  const isVisible =
    state.status === "loading" ||
    state.status === "success" ||
    state.status === "error";

  if (!isVisible) return null;

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
        aria-labelledby="explain-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="explain-panel-title"
            className="font-heading font-semibold text-slate-900 dark:text-white"
          >
            AI Explanation
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
          {selectedText && (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 italic">
              &quot;{selectedText.length > 120 ? `${selectedText.slice(0, 120)}...` : selectedText}&quot;
            </div>
          )}

          {state.status === "loading" && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-16 w-full mt-4" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {state.status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600 dark:text-red-400">
                {state.error}
              </p>
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
              <ResponseSection
                title="Simple explanation"
                content={(state.data as ExplainHighlightResponse).simpleExplanation}
              />
              <ResponseSection
                title="Board tip"
                content={(state.data as ExplainHighlightResponse).boardTip}
              />
              <ResponseSection
                title="Memory trick"
                content={(state.data as ExplainHighlightResponse).memoryTrick}
              />
              <ResponseSection
                title="Suggested next step"
                content={(state.data as ExplainHighlightResponse).suggestedNextStep}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
