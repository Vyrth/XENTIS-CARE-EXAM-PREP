"use client";

import { Icons } from "@/components/ui/icons";
import type { AutoPublishStatus } from "@/lib/admin/auto-publish-status-loader";

export interface AutoPublishStatusBadgeProps {
  status: AutoPublishStatus | null;
  className?: string;
}

export function AutoPublishStatusBadge({ status, className = "" }: AutoPublishStatusBadgeProps) {
  if (!status) return null;

  if (status.autoPublished) {
    const subLabel = status.publishReason === "high_confidence_auto_publish" ? " (high-confidence)" : "";
    const title =
      status.publishedAt
        ? `Auto-published${subLabel} ${new Date(status.publishedAt).toLocaleString()}`
        : `Auto-published by quality gate${subLabel}`;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ${className}`}
        title={title}
      >
        <span className="opacity-80">{Icons.check}</span>
        Auto-published{subLabel}
      </span>
    );
  }

  if (status.routedToReviewReason || status.routingReason) {
    const laneLabel =
      status.routingLane === "sme"
        ? "SME"
        : status.routingLane === "qa"
          ? "QA"
          : status.routingLane
            ? status.routingLane.charAt(0).toUpperCase() + status.routingLane.slice(1).replace("_", " ")
            : null;
    const label = laneLabel ? `Routed to ${laneLabel}` : "Routed to review";
    const tooltip = status.routingReason ?? status.routedToReviewReason ?? "";
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ${className}`}
        title={tooltip}
      >
        <span className="opacity-80">{Icons.alertTriangle}</span>
        {label}
      </span>
    );
  }

  if (status.qualityScore != null) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${className}`}
        title={`Quality score: ${status.qualityScore}`}
      >
        Score: {status.qualityScore}
      </span>
    );
  }

  return null;
}
