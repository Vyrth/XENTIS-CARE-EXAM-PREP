"use client";

import { useState } from "react";

export function ResetContentButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeAiJobs, setIncludeAiJobs] = useState(true);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAiJobs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20"
      >
        Reset content to zero
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Reset content to zero
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Clears all generated content, learner progress, exam sessions, and recommendations.
              Preserves exam tracks, systems, topics, question types, and user accounts.
            </p>
            <label className="flex items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={includeAiJobs}
                onChange={(e) => setIncludeAiJobs(e.target.checked)}
                className="rounded border-slate-300"
              />
              Also clear AI jobs, campaigns, batch plans, and dedupe registry
            </label>
            {error && (
              <p className="text-rose-600 dark:text-rose-400 text-sm mb-4">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Resetting…" : "Reset content"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
