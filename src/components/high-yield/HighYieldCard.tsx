"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import type { HighYieldTopic } from "@/types/high-yield";
import { HIGH_YIELD_THRESHOLDS } from "@/config/high-yield";

export interface HighYieldCardProps {
  topic: HighYieldTopic;
  practiceHref?: string;
  studyHref?: string;
  showWhy?: boolean;
}

export function HighYieldCard({
  topic,
  practiceHref,
  studyHref,
  showWhy = true,
}: HighYieldCardProps) {
  const tier =
    topic.score >= HIGH_YIELD_THRESHOLDS.topTier
      ? "top"
      : topic.score >= HIGH_YIELD_THRESHOLDS.highYield
        ? "high"
        : "notable";

  const tierColors = {
    top: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    high: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    notable: "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
              {topic.topicName}
            </h3>
            <Badge variant="neutral" size="sm" className={tierColors[tier]}>
              {topic.score}% high yield
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{topic.systemName}</p>
          {showWhy && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {topic.whyHighYield}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {practiceHref && (
            <Link
              href={practiceHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Practice
              {Icons.chevronRight}
            </Link>
          )}
          {studyHref && (
            <Link
              href={studyHref}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Study
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
