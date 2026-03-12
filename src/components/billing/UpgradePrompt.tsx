"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

export interface UpgradePromptProps {
  /** Short reason (e.g. "Daily Jade Tutor limit reached") */
  reason?: string;
  /** Optional usage string (e.g. "3/3 actions today") */
  usage?: string;
  /** Compact inline vs full card */
  variant?: "inline" | "card";
  className?: string;
}

export function UpgradePrompt({
  reason = "You've hit a Free plan limit",
  usage,
  variant = "card",
  className = "",
}: UpgradePromptProps) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="text-amber-500 mt-0.5">{Icons.sparkles}</span>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {reason}
            {usage && (
              <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                ({usage})
              </span>
            )}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Upgrade to unlock unlimited questions, full Jade Tutor, system exams, and more.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View plans
            <span>{Icons.chevronRight}</span>
          </Link>
        </div>
      </div>
    </>
  );

  if (variant === "inline") {
    return (
      <div
        className={`rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Card variant="elevated" className={`p-4 ${className}`}>
      {content}
    </Card>
  );
}
