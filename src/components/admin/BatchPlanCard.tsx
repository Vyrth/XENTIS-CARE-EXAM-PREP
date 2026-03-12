"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { updateBatchPlan } from "@/app/(app)/actions/batch-plans";
import type { BatchPlanWithProgress, BatchPlanStatus } from "@/lib/admin/batch-planner-loaders";

const STATUS_OPTIONS: { value: BatchPlanStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "under_review", label: "Under review" },
  { value: "completed", label: "Completed" },
];

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            value >= 100 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-slate-400"
          }`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function TargetRow({
  label,
  target,
  actual,
  createHref,
  trackId,
  systemId,
  topicId,
}: {
  label: string;
  target: number;
  actual: number;
  createHref: string;
  trackId: string;
  systemId?: string | null;
  topicId?: string | null;
}) {
  const missing = Math.max(0, target - actual);
  const href = `${createHref}?trackId=${trackId}${systemId ? `&systemId=${systemId}` : ""}${topicId ? `&topicId=${topicId}` : ""}`;
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-slate-600 dark:text-slate-400">
        {label}: <span className="font-mono tabular-nums">{actual}</span> / {target}
      </span>
      {missing > 0 && (
        <Link href={href} className="text-indigo-600 hover:underline text-xs">
          + Add
        </Link>
      )}
    </div>
  );
}

export function BatchPlanCard({
  plan,
  onStatusChange,
}: {
  plan: BatchPlanWithProgress;
  onStatusChange?: () => void;
}) {
  const router = useRouter();
  const handleStatusChange = async (status: BatchPlanStatus) => {
    const r = await updateBatchPlan(plan.id, { status });
    if (r.success) {
      router.refresh();
      onStatusChange?.();
    }
  };

  const scopeLabel = [plan.trackName, plan.systemName, plan.topicName].filter(Boolean).join(" › ") || "Track";

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">{scopeLabel}</h3>
          <div className="flex items-center gap-2 mt-1">
            {plan.trackSlug && (
              <TrackBadge slug={plan.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
            )}
            <select
              value={plan.status}
              onChange={(e) => handleStatusChange(e.target.value as BatchPlanStatus)}
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {plan.overallProgress}%
          </span>
          <p className="text-xs text-slate-500">overall</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <ProgressBar value={plan.questionsProgress} label="Questions" />
        <ProgressBar value={plan.guidesProgress} label="Guides" />
        <ProgressBar value={plan.decksProgress} label="Decks" />
        <ProgressBar value={plan.videosProgress} label="Videos" />
        <ProgressBar value={plan.highYieldProgress} label="High-yield" />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1">
        <TargetRow
          label="Questions"
          target={plan.targetQuestions}
          actual={plan.actualQuestions}
          createHref="/admin/questions/new"
          trackId={plan.examTrackId}
          systemId={plan.systemId}
          topicId={plan.topicId}
        />
        <TargetRow
          label="Guides"
          target={plan.targetGuides}
          actual={plan.actualGuides}
          createHref="/admin/study-guides/new"
          trackId={plan.examTrackId}
          systemId={plan.systemId}
          topicId={plan.topicId}
        />
        <TargetRow
          label="Decks"
          target={plan.targetDecks}
          actual={plan.actualDecks}
          createHref="/admin/flashcards/new"
          trackId={plan.examTrackId}
          systemId={plan.systemId}
          topicId={plan.topicId}
        />
        <TargetRow
          label="Videos"
          target={plan.targetVideos}
          actual={plan.actualVideos}
          createHref="/admin/videos/new"
          trackId={plan.examTrackId}
          systemId={plan.systemId}
          topicId={plan.topicId}
        />
        <TargetRow
          label="High-yield"
          target={plan.targetHighYield}
          actual={plan.actualHighYield}
          createHref="/admin/high-yield/new"
          trackId={plan.examTrackId}
          systemId={plan.systemId}
          topicId={plan.topicId}
        />
      </div>

      {plan.notes && (
        <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
          {plan.notes}
        </p>
      )}
    </Card>
  );
}
