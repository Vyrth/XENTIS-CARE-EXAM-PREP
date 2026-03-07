"use client";

import type { WorkflowStatus } from "@/types/admin";
import { STATUS_LABELS } from "@/types/admin";
import { getAllowedTransitions } from "@/lib/admin/workflow";

type StatusTransitionButtonProps = {
  currentStatus: WorkflowStatus;
  onTransition: (to: WorkflowStatus) => void;
  disabled?: boolean;
};

export function StatusTransitionButton({
  currentStatus,
  onTransition,
  disabled = false,
}: StatusTransitionButtonProps) {
  const allowed = getAllowedTransitions(currentStatus);
  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((to) => (
        <button
          key={to}
          type="button"
          onClick={() => onTransition(to)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          → {STATUS_LABELS[to]}
        </button>
      ))}
    </div>
  );
}
