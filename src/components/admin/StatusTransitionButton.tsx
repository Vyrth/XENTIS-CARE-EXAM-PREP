"use client";

import type { WorkflowStatus } from "@/types/admin";
import { STATUS_LABELS } from "@/types/admin";
import { getAllowedTransitions } from "@/lib/admin/workflow";

type StatusTransitionButtonProps = {
  currentStatus: WorkflowStatus;
  onTransition: (to: WorkflowStatus) => void;
  disabled?: boolean;
  /** When set, blocks Approve and Publish transitions (e.g. missing track) */
  blockPublishReason?: string | null;
};

const PUBLISH_STATUSES: WorkflowStatus[] = ["approved", "published"];

export function StatusTransitionButton({
  currentStatus,
  onTransition,
  disabled = false,
  blockPublishReason,
}: StatusTransitionButtonProps) {
  const allowed = getAllowedTransitions(currentStatus);
  if (allowed.length === 0) return null;

  const isBlocked = !!blockPublishReason;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((to) => {
        const isPublishTransition = PUBLISH_STATUSES.includes(to);
        const isDisabled = disabled || (isBlocked && isPublishTransition);
        return (
          <button
            key={to}
            type="button"
            onClick={() => onTransition(to)}
            disabled={isDisabled}
            title={isDisabled && blockPublishReason ? blockPublishReason : undefined}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            → {STATUS_LABELS[to]}
          </button>
        );
      })}
      {isBlocked && (
        <span className="text-xs text-amber-600 dark:text-amber-400 self-center" title={blockPublishReason}>
          {blockPublishReason}
        </span>
      )}
    </div>
  );
}
