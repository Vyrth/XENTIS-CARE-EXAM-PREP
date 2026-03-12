"use client";

import { Icons } from "@/components/ui/icons";

export interface PreviewActionsProps {
  onSave: () => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  saving?: boolean;
  regenerating?: boolean;
  saveLabel?: string;
  discardLabel?: string;
  regenerateLabel?: string;
  /** Disable save (e.g. validation failed) */
  saveDisabled?: boolean;
  className?: string;
}

export function PreviewActions({
  onSave,
  onDiscard,
  onRegenerate,
  saving = false,
  regenerating = false,
  saveLabel = "Save draft",
  discardLabel = "Discard",
  regenerateLabel = "Regenerate",
  saveDisabled = false,
  className = "",
}: PreviewActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || saveDisabled}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        aria-busy={saving}
        aria-label={saving ? "Saving" : saveLabel}
      >
        {saving && <span className="text-white">{Icons.loader}</span>}
        {saving ? "Saving…" : saveLabel}
      </button>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          aria-busy={regenerating}
          aria-label={regenerating ? "Regenerating" : regenerateLabel}
        >
          {regenerating && <span>{Icons.loader}</span>}
          {regenerating ? "Regenerating…" : regenerateLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onDiscard}
        disabled={saving || regenerating}
        className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        aria-label={discardLabel}
      >
        {discardLabel}
      </button>
    </div>
  );
}
