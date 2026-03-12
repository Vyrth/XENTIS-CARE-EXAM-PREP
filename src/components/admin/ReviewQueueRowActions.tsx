"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionContentStatus } from "@/app/(app)/actions/content-review";
import { getAllowedTransitions } from "@/lib/admin/workflow";
import { STATUS_LABELS } from "@/types/admin";
import type { WorkflowStatus } from "@/types/admin";

const ACTION_LABELS: Partial<Record<WorkflowStatus, string>> = {
  sme_review: "Approve → SME",
  legal_review: "Approve → Legal",
  qa_review: "Approve → QA",
  approved: "Approve",
  needs_revision: "Request revision",
  draft: "Send to generator",
};

export interface ReviewQueueRowActionsProps {
  entityType: string;
  entityId: string;
  currentStatus: WorkflowStatus;
  editHref: string;
}

export function ReviewQueueRowActions({
  entityType,
  entityId,
  currentStatus,
  editHref,
}: ReviewQueueRowActionsProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = getAllowedTransitions(currentStatus);

  const handleTransition = async (to: WorkflowStatus) => {
    setError(null);
    setTransitioning(to);
    try {
      const r = await transitionContentStatus(entityType, entityId, to, null);
      if (r.success) {
        router.refresh();
      } else {
        setError(r.error ?? r.blockPublishReason ?? "Failed");
      }
    } finally {
      setTransitioning(null);
    }
  };

  const primaryNext = allowed.find(
    (t) => t === "sme_review" || t === "legal_review" || t === "qa_review" || t === "approved"
  );
  const needsRevision = allowed.includes("needs_revision");
  const sendToGenerator = allowed.includes("draft");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
      {primaryNext && (
        <button
          type="button"
          onClick={() => handleTransition(primaryNext!)}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {transitioning === primaryNext ? "…" : STATUS_LABELS[primaryNext]}
        </button>
      )}
      {needsRevision && (
        <button
          type="button"
          onClick={() => handleTransition("needs_revision")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50"
        >
          {transitioning === "needs_revision" ? "…" : "Request revision"}
        </button>
      )}
      {sendToGenerator && (
        <button
          type="button"
          onClick={() => handleTransition("draft")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Send back to generator for regeneration"
        >
          {transitioning === "draft" ? "…" : "Send to generator"}
        </button>
      )}
      <Link
        href={editHref}
        className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium"
      >
        Review
      </Link>
    </div>
  );
}
