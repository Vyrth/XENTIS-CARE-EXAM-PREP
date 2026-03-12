"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import type { TrackReadiness, ReadinessItem, ReadinessStatus } from "@/lib/admin/launch-readiness";
import { Icons } from "@/components/ui/icons";
import { buildAIFactoryUrl } from "@/lib/admin/ai-factory-gap-links";

const STATUS_COLORS: Record<ReadinessStatus, string> = {
  ready: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  blocked: "text-red-600 dark:text-red-400",
};

const STATUS_BG: Record<ReadinessStatus, string> = {
  ready: "bg-emerald-100 dark:bg-emerald-900/30",
  partial: "bg-amber-100 dark:bg-amber-900/30",
  blocked: "bg-red-100 dark:bg-red-900/30",
};

const BLOCKED_ITEM_TO_TAB: Record<string, "questions" | "study-guides" | "flashcards" | "high-yield"> = {
  questions: "questions",
  guides: "study-guides",
  flashcards: "flashcards",
  high_yield: "high-yield",
};

function StatusBadge({ status }: { status: ReadinessStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BG[status]} ${STATUS_COLORS[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function LaunchReadinessCard({
  readiness,
  defaultExpanded = false,
}: {
  readiness: TrackReadiness;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const blockedItems = readiness.items.filter((i) => i.status === "blocked");
  const partialItems = readiness.items.filter((i) => i.status === "partial");

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <TrackBadge slug={readiness.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
          <span className="font-medium text-slate-900 dark:text-white">{readiness.trackName}</span>
          <StatusBadge status={readiness.overallStatus} />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{readiness.readyCount} ready</span>
          {readiness.partialCount > 0 && <span>{readiness.partialCount} partial</span>}
          {readiness.blockedCount > 0 && (
            <span className="text-red-600 dark:text-red-400">{readiness.blockedCount} blocked</span>
          )}
        </div>
        <span className="text-slate-400">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          {readiness.items.map((item) => {
            const generateTab = BLOCKED_ITEM_TO_TAB[item.id];
            const generateHref = generateTab && item.status !== "ready"
              ? buildAIFactoryUrl({ tab: generateTab, trackId: readiness.trackId })
              : null;
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                  {item.blockReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      {Icons.alertTriangle}
                      {item.blockReason}
                    </p>
                  )}
                </div>
                {generateHref && (
                  <Link
                    href={generateHref}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 shrink-0"
                  >
                    {Icons.sparkles} Generate
                  </Link>
                )}
              </div>
            );
          })}

          {blockedItems.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Blocked items — drill-down
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {blockedItems.map((i) => (
                  <li key={i.id}>
                    <strong>{i.label}:</strong> {i.blockReason ?? i.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
