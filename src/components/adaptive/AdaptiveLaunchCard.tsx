"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

export interface AdaptiveConfigInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  minQuestions: number;
  maxQuestions: number;
  targetStandardError: number;
  passingTheta: number;
}

export interface AdaptiveLaunchCardProps {
  trackName: string;
  trackId: string;
  config: AdaptiveConfigInfo;
}

export function AdaptiveLaunchCard({ trackName, trackId, config }: AdaptiveLaunchCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/adaptive/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examTrackId: trackId,
          configSlug: config.slug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to start");
        return;
      }
      if (data.sessionId) {
        router.push(`/adaptive-exam/${data.sessionId}`);
      }
    } finally {
      setLoading(false);
    }
  }, [trackId, config.slug, router]);

  return (
    <Card padding="lg" className="max-w-2xl">
      <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-1">
        {config.name}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {trackName} · Computerized Adaptive Testing
      </p>
      {config.description && (
        <p className="text-slate-600 dark:text-slate-300 mb-6">{config.description}</p>
      )}

      <ul className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5 shrink-0">{Icons.check}</span>
          <span>
            <strong>{config.minQuestions}–{config.maxQuestions} questions</strong> — adapts to your level
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5 shrink-0">{Icons.check}</span>
          <span>
            <strong>Readiness score</strong> — 0–100 with confidence band (at_risk, borderline, likely_pass, strong_pass)
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5 shrink-0">{Icons.check}</span>
          <span>
            <strong>Timed flow</strong> — one question at a time, per-question timer, no backtracking
          </span>
        </li>
      </ul>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Starting…" : "Start Adaptive Exam"}
      </button>
    </Card>
  );
}
