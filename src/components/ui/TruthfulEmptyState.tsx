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
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm shadow-card-premium">
      <div className="mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 dark:from-indigo-400/20 dark:to-violet-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 [&>svg]:w-8 [&>svg]:h-8">
        {IconComponent}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          {description}
        </p>
      )}
      {(action || actionElement) && (
        <div className="mt-6">
          {action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
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
