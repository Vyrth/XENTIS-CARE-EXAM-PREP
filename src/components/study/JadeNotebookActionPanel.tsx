"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import {
  toStructuredNoteSections,
  toPlainTextNote,
} from "@/lib/ai/notebook-summary/summary-formatter";
import type { JadeNotebookState, NotebookAction } from "@/hooks/useJadeNotebookAction";
import type { NotebookSummaryResponse } from "@/lib/ai/notebook-summary/types";

type JadeNotebookActionPanelProps = {
  state: JadeNotebookState;
  originalText?: string;
  onClose: () => void;
  onRetry?: () => void;
  onSaveAsNote: (content: string) => void;
  onSaveAsFlashcards?: (flashcards: { front: string; back: string }[]) => void;
  onQuizMe?: (content: string) => void;
};

function SectionBlock({ title, content }: { title: string; content: string }) {
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

function getPanelTitle(action: NotebookAction): string {
  switch (action) {
    case "clean_up":
      return "Clean up note";
    case "summarize":
      return "Summary";
    case "high_yield_bullets":
      return "High-yield bullets";
    case "make_flashcards":
      return "Flashcards";
    case "create_mnemonic":
      return "Mnemonic";
    default:
      return "Jade Tutor";
  }
}

export function JadeNotebookActionPanel({
  state,
  originalText,
  onClose,
  onRetry,
  onSaveAsNote,
  onSaveAsFlashcards,
  onQuizMe,
}: JadeNotebookActionPanelProps) {
  const isVisible =
    state.status === "loading" ||
    state.status === "success" ||
    state.status === "error";

  if (!isVisible) return null;

  const action = "action" in state ? state.action : "summarize";

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
        aria-labelledby="jade-notebook-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="jade-notebook-panel-title"
            className="font-heading font-semibold text-slate-900 dark:text-white"
          >
            {getPanelTitle(action)}
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
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-16 w-full mt-4" />
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
              <button
                type="button"
                onClick={onClose}
                className="block px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium"
              >
                Discard
              </button>
            </div>
          )}

          {state.status === "success" && state.data && (
            <div className="space-y-6">
              {state.action !== "make_flashcards" &&
                state.action !== "create_mnemonic" &&
                "cleanedSummary" in state.data && (
                  <>
                    {toStructuredNoteSections(state.data as NotebookSummaryResponse).map(
                      (s) => (
                        <SectionBlock key={s.type} title={s.title} content={s.content} />
                      )
                    )}
                  </>
                )}

              {state.action === "make_flashcards" &&
                "flashcards" in state.data &&
                state.data.flashcards.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {state.data.flashcards.length} flashcards generated
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {state.data.flashcards.map((c, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {c.front}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            → {c.back}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {state.action === "create_mnemonic" && "mnemonic" in state.data && (
                <div className="space-y-4">
                  {state.data.conceptSummary && (
                    <SectionBlock title="Concept" content={state.data.conceptSummary} />
                  )}
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                      Mnemonic
                    </h3>
                    <p className="text-indigo-900 dark:text-indigo-100 font-medium">
                      {state.data.mnemonic}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                {state.action !== "make_flashcards" && (
                  <button
                    type="button"
                    onClick={() => {
                      if ("cleanedSummary" in state.data) {
                        onSaveAsNote(toPlainTextNote(state.data as NotebookSummaryResponse));
                      } else if ("mnemonic" in state.data) {
                        const d = state.data as { mnemonic: string; conceptSummary?: string };
                        onSaveAsNote([d.conceptSummary, d.mnemonic].filter(Boolean).join("\n\n"));
                      }
                      onClose();
                    }}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save as note
                  </button>
                )}
                {state.action === "make_flashcards" &&
                  "flashcards" in state.data &&
                  state.data.flashcards.length > 0 &&
                  onSaveAsFlashcards && (
                    <button
                      type="button"
                      onClick={() => {
                        const d = state.data as { flashcards: { front: string; back: string }[] };
                        onSaveAsFlashcards(d.flashcards);
                        onClose();
                      }}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      Save as flashcards
                    </button>
                  )}
                {onQuizMe && originalText && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuizMe(originalText);
                      onClose();
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    Quiz me
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
