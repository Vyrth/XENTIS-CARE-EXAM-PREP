/**
 * Trial status indicator for billing and profile
 * Shows days remaining and expiration date when user is on active trial
 */

import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export interface TrialStatusIndicatorProps {
  /** ISO date string for trial end */
  trialEndDate: string | null;
  /** Optional: show upgrade CTA */
  showUpgradeCta?: boolean;
  /** Compact variant for profile/sidebar */
  variant?: "default" | "compact";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysRemaining(end: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function TrialStatusIndicator({
  trialEndDate,
  showUpgradeCta = true,
  variant = "default",
}: TrialStatusIndicatorProps) {
  if (!trialEndDate) return null;

  const end = new Date(trialEndDate);
  const days = daysRemaining(end);

  if (days <= 0) return null;

  return (
    <div
      className={`rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 ${
        variant === "compact" ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
          {Icons.calendar}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            Free trial · {days} day{days !== 1 ? "s" : ""} remaining
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
            Ends {formatDate(end)}
          </p>
          {showUpgradeCta && variant === "default" && (
            <Link
              href="/pricing"
              className="mt-2 inline-block text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Upgrade to continue →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
