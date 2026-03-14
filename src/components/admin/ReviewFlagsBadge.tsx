"use client";

import { Card } from "@/components/ui/Card";

const LANE_LABELS: Record<string, string> = {
  requires_editorial_review: "Editorial",
  requires_sme_review: "SME",
  requires_legal_review: "Legal",
  requires_qa_review: "QA",
};

export interface ReviewFlagsBadgeProps {
  reviewFlags: {
    requires_editorial_review: boolean;
    requires_sme_review: boolean;
    requires_legal_review: boolean;
    requires_qa_review: boolean;
  };
  className?: string;
}

export function ReviewFlagsBadge({ reviewFlags, className }: ReviewFlagsBadgeProps) {
  const active = (
    ["requires_editorial_review", "requires_sme_review", "requires_legal_review", "requires_qa_review"] as const
  ).filter((k) => reviewFlags[k]);

  if (active.length === 0) return null;

  return (
    <Card className={`p-3 ${className ?? ""}`}>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Review required (exception-only)
      </h3>
      <div className="flex flex-wrap gap-2">
        {active.map((key) => (
          <span
            key={key}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {LANE_LABELS[key]}
          </span>
        ))}
      </div>
    </Card>
  );
}
