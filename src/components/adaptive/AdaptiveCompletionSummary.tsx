"use client";

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export interface AdaptiveCompletionSummaryProps {
  readinessScore: number;
  confidenceBand: string;
  questionCount: number;
  correctCount: number;
  percentCorrect: number;
  byDomain: Record<string, { correct: number; total: number; percent: number; slug?: string; name?: string }>;
  bySystem: Record<string, { correct: number; total: number; percent: number; slug?: string; name?: string }>;
  byTopic: Record<string, { correct: number; total: number; percent: number; slug?: string; name?: string }>;
}

const BAND_LABELS: Record<string, string> = {
  at_risk: "At Risk",
  borderline: "Borderline",
  likely_pass: "Likely Pass",
  strong_pass: "Strong Pass",
};

const BAND_VARIANTS: Record<string, "error" | "warning" | "success" | "default"> = {
  at_risk: "error",
  borderline: "warning",
  likely_pass: "success",
  strong_pass: "success",
};

function PerformanceSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, { correct: number; total: number; percent: number; name?: string }>;
}) {
  const entries = Object.entries(data).filter(([k]) => k !== "_unknown");
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="space-y-2">
        {entries.map(([id, d]) => (
          <div key={id} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {d.name ?? id.slice(0, 8)}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, d.percent)}%` }}
                />
              </div>
              <span className="text-sm w-10">{d.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AdaptiveCompletionSummary = memo(function AdaptiveCompletionSummary({
  readinessScore,
  confidenceBand,
  questionCount,
  correctCount,
  percentCorrect,
  byDomain,
  bySystem,
  byTopic,
}: AdaptiveCompletionSummaryProps) {
  const bandLabel = BAND_LABELS[confidenceBand] ?? confidenceBand;
  const bandVariant = BAND_VARIANTS[confidenceBand] ?? "default";
  const WEAK_THRESHOLD = 70;
  const weakSystems = Object.entries(bySystem).filter(([, d]) => d.percent < WEAK_THRESHOLD);
  const weakDomains = Object.entries(byDomain).filter(([, d]) => d.percent < WEAK_THRESHOLD);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Adaptive Exam Complete
      </h1>

      <Card padding="lg" className="text-center">
        <p className="text-4xl font-heading font-bold text-slate-900 dark:text-white">
          {readinessScore}%
        </p>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Readiness Score</p>
        <Badge variant={bandVariant} className="mt-2">
          {bandLabel}
        </Badge>
        <p className="text-sm text-slate-500 mt-3">
          {correctCount} of {questionCount} correct ({percentCorrect}%)
        </p>
      </Card>

      {(weakSystems.length > 0 || weakDomains.length > 0) && (
        <Card padding="lg">
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-3">
            Areas to Review
          </h2>
          <Link
            href="/ai-tutor"
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Remediate with Jade Tutor
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Below {WEAK_THRESHOLD}% — consider extra practice.
          </p>
          <div className="flex flex-wrap gap-2">
            {weakSystems.map(([id, d]) => (
              <Badge key={id} variant="warning" size="sm">
                {d.name ?? id.slice(0, 8)}: {d.percent}%
              </Badge>
            ))}
            {weakDomains.map(([id, d]) => (
              <Badge key={`d-${id}`} variant="warning" size="sm">
                {d.name ?? id.slice(0, 8)}: {d.percent}%
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card padding="lg">
        <div className="space-y-6">
          <PerformanceSection title="By System" data={bySystem} />
          <PerformanceSection title="By Domain" data={byDomain} />
          {Object.keys(byTopic).length > 0 && (
            <PerformanceSection title="By Topic" data={byTopic} />
          )}
        </div>
      </Card>
    </div>
  );
});
