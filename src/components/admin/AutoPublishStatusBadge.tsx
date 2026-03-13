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
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ${className}`}
        title={status.publishedAt ? `Auto-published ${new Date(status.publishedAt).toLocaleString()}` : "Auto-published by quality gate"}
      >
        <span className="opacity-80">{Icons.check}</span>
        Auto-published
      </span>
    );
  }

  if (status.routedToReviewReason) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ${className}`}
        title={status.routedToReviewReason}
      >
        <span className="opacity-80">{Icons.alertTriangle}</span>
        Routed to review
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
