"use client";

import type { WorkflowStatus } from "@/types/admin";
import { STATUS_LABELS } from "@/types/admin";

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  editor_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  sme_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  legal_review: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  qa_review: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  retired: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  needs_revision: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
