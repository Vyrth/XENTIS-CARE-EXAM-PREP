"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { JadeHighlightState, JadeHighlightData } from "@/hooks/useJadeHighlight";

type JadeHighlightPanelProps = {
  state: JadeHighlightState;
  selectedText: string;
  onClose: () => void;
  onRetry?: () => void;
  onSaveToNotebook?: (content: string) => void;
  onSaveFlashcards?: (flashcards: { front: string; back: string }[]) => void;
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
      <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </section>
  );
}

function getPanelTitle(action: string): string {
  switch (action) {
    case "explain_simple":
      return "Simple explanation";
    case "board_focus":
      return "Board tip";
    case "deep_dive":
      return "Deep dive";
    case "mnemonic":
      return "Mnemonic";
    case "compare":
      return "Compare concepts";
    case "flashcards":
      return "Flashcards";
    case "summarize":
      return "Summary";
    default:
      return "Jade Tutor";
  }
}

function renderSuccessContent(data: JadeHighlightData) {
  if (data.type === "explain") {
    return (
      <div className="space-y-6">
        {data.simpleExplanation && (
          <ResponseSection title="Simple explanation" content={data.simpleExplanation} />
        )}
        {data.boardTip && (
          <ResponseSection title="Board tip" content={data.boardTip} />
        )}
        {data.memoryTrick && (
          <ResponseSection title="Memory trick" content={data.memoryTrick} />
        )}
        {data.suggestedNextStep && (
          <ResponseSection title="Suggested next step" content={data.suggestedNextStep} />
        )}
      </div>
    );
  }
  if (data.type === "mnemonic") {
    return (
      <div className="space-y-6">
        {data.conceptSummary && (
          <ResponseSection title="Concept summary" content={data.conceptSummary} />
        )}
        {data.mnemonic && (
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
              Mnemonic
            </h3>
            <p className="text-indigo-900 dark:text-indigo-100 font-medium leading-relaxed">
              {data.mnemonic}
            </p>
          </div>
        )}
        {data.whyItWorks && (
          <ResponseSection title="Why it works" content={data.whyItWorks} />
        )}
      </div>
    );
  }
  if (data.type === "flashcards" && data.flashcards?.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {data.flashcards.length} flashcards generated
        </p>
        <div className="space-y-3">
          {data.flashcards.map((c, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <p className="font-medium text-slate-900 dark:text-slate-100">{c.front}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">→ {c.back}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
      {data.content}
    </p>
  );
}

export function JadeHighlightPanel({
  state,
  selectedText,
  onClose,
  onRetry,
  onSaveToNotebook,
  onSaveFlashcards,
}: JadeHighlightPanelProps) {
  const isVisible =
    state.status === "loading" ||
    state.status === "success" ||
    state.status === "error";

  if (!isVisible) return null;

  const action = "action" in state ? state.action : "explain_simple";
  const canSaveNotebook =
    state.status === "success" &&
    (state.data.type === "explain" ||
      state.data.type === "mnemonic" ||
      state.data.type === "compare" ||
      state.data.type === "summarize");
  const canSaveFlashcards =
    state.status === "success" &&
    state.data.type === "flashcards" &&
    state.data.flashcards?.length;

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
        aria-labelledby="jade-highlight-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="jade-highlight-panel-title"
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

          {state.status === "success" && state.data && (
            <>
              {renderSuccessContent(state.data)}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                {canSaveNotebook && onSaveToNotebook && (
                  <button
                    type="button"
                    onClick={() => onSaveToNotebook(state.data!.content)}
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save to notebook
                  </button>
                )}
                {canSaveFlashcards && onSaveFlashcards && state.data.type === "flashcards" && (
                  <button
                    type="button"
                    onClick={() =>
                      onSaveFlashcards(
                        (state.data as { type: "flashcards"; flashcards: { front: string; back: string }[] })
                          .flashcards
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Save flashcards
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
