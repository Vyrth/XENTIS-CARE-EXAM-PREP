/**
 * Truthful Empty State - production-ready empty states.
 * No mock data, no placeholder metrics, no synthetic values.
 * Use when there is no content: show 0 or empty, with clear next steps.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export interface TruthfulEmptyStateProps {
  /** Icon key from Icons (e.g. "help-circle", "book-open") */
  icon?: keyof typeof Icons;
  /** Primary message (e.g. "No questions yet") */
  title: string;
  /** Explanation of why it's empty and what to do */
  description?: string;
  /** Optional CTA (href + label) */
  action?: { href: string; label: string };
  /** Or custom action element */
  actionElement?: ReactNode;
}

/**
 * Generic truthful empty state. Use when list/section has no items.
 */
export function TruthfulEmptyState({
  icon = "inbox",
  title,
  description,
  action,
  actionElement,
}: TruthfulEmptyStateProps) {
  const IconComponent = Icons[icon];
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="mb-4 text-slate-400 dark:text-slate-500 [&>svg]:w-12 [&>svg]:h-12">
        {IconComponent}
      </div>
      <h3 className="text-base font-medium text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          {description}
        </p>
      )}
      {(action || actionElement) && (
        <div className="mt-4">
          {action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {action.label}
              {Icons.chevronRight}
            </Link>
          ) : (
            actionElement
          )}
        </div>
      )}
    </div>
  );
}

/** Preset: no content for a track yet. Admin-only: pass actionHref for "Go to admin" CTA. */
export function NoContentEmptyState({
  contentType,
  trackName,
  actionHref,
}: {
  contentType: string;
  trackName?: string;
  /** Only set in admin context; never expose /admin to learners */
  actionHref?: string;
}) {
  return (
    <TruthfulEmptyState
      icon="inbox"
      title={`No ${contentType} yet`}
      description={
        trackName
          ? `Content will appear here once ${contentType.toLowerCase()} are added for ${trackName}.`
          : `Content will appear here once ${contentType.toLowerCase()} are added.`
      }
      action={actionHref ? { href: actionHref, label: "Go to admin" } : undefined}
    />
  );
}

/** Preset: no activity / zero metrics */
export function NoActivityEmptyState({
  message = "No activity yet",
  subtext = "Start practicing to see your progress.",
  action,
}: {
  message?: string;
  subtext?: string;
  action?: { href: string; label: string };
}) {
  return (
    <TruthfulEmptyState
      icon="trending-up"
      title={message}
      description={subtext}
      action={action}
    />
  );
}
