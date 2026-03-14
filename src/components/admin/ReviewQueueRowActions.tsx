"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionContentStatus } from "@/app/(app)/actions/content-review";
import { getAllowedTransitions } from "@/lib/admin/workflow";
import type { WorkflowStatus } from "@/types/admin";

export interface ReviewQueueRowActionsProps {
  entityType: string;
  entityId: string;
  currentStatus: WorkflowStatus;
  editHref: string;
  /** Routing reason for tooltip / context (exception-based triage) */
  routingReason?: string | null;
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
  const canPublish = allowed.includes("published");
  const sendToSme = allowed.includes("sme_review");
  const sendToLegal = allowed.includes("legal_review");
  const sendToQa = allowed.includes("qa_review");
  const requestRevision = allowed.includes("needs_revision");
  const regenerate = allowed.includes("draft");

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400" title={error}>
          {error.length > 40 ? `${error.slice(0, 40)}…` : error}
        </span>
      )}
      {canPublish && (
        <button
          type="button"
          onClick={() => handleTransition("published")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
          title="Approve and publish (one-click when content is complete)"
        >
          {transitioning === "published" ? "…" : "Approve and publish"}
        </button>
      )}
      {sendToSme && (
        <button
          type="button"
          onClick={() => handleTransition("sme_review")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {transitioning === "sme_review" ? "…" : "Send to SME"}
        </button>
      )}
      {sendToLegal && (
        <button
          type="button"
          onClick={() => handleTransition("legal_review")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {transitioning === "legal_review" ? "…" : "Send to legal"}
        </button>
      )}
      {sendToQa && (
        <button
          type="button"
          onClick={() => handleTransition("qa_review")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {transitioning === "qa_review" ? "…" : "Send to QA"}
        </button>
      )}
      {requestRevision && (
        <button
          type="button"
          onClick={() => handleTransition("needs_revision")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50"
        >
          {transitioning === "needs_revision" ? "…" : "Request revision"}
        </button>
      )}
      {regenerate && (
        <button
          type="button"
          onClick={() => handleTransition("draft")}
          disabled={!!transitioning}
          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Send back for regeneration"
        >
          {transitioning === "draft" ? "…" : "Regenerate"}
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
