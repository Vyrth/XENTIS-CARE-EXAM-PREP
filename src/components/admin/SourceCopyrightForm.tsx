"use client";

import type { ContentSource } from "@/types/admin";

type SourceCopyrightFormProps = {
  sources: ContentSource[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAddSource?: () => void;
};

export function SourceCopyrightForm({
  sources,
  selectedIds,
  onToggle,
  onAddSource,
}: SourceCopyrightFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-white">Sources & Copyright</h3>
        {onAddSource && (
          <button
            type="button"
            onClick={onAddSource}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add source
          </button>
        )}
      </div>
      <div className="space-y-2">
        {sources.map((src) => (
          <label
            key={src.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(src.id)}
              onChange={() => onToggle(src.id)}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{src.title}</p>
              <p className="text-sm text-slate-500">
                {[src.author, src.publisher, src.year].filter(Boolean).join(" · ")}
              </p>
              {src.url && (
                <a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                  {src.url}
                </a>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
