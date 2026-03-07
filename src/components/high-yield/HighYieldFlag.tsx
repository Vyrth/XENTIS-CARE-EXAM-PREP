"use client";

import { Badge } from "@/components/ui/Badge";

export interface HighYieldFlagProps {
  score?: number;
  compact?: boolean;
  className?: string;
}

/** Small badge to flag high-yield content in guides and question banks */
export function HighYieldFlag({ score = 0, compact = false, className = "" }: HighYieldFlagProps) {
  if (score < 45) return null;

  const label = compact ? "HY" : "High Yield";

  return (
    <Badge
      variant="neutral"
      size="sm"
      className={`bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ${className}`}
      title={score >= 60 ? `High-yield topic (${score}% score)` : `Notable topic (${score}% score)`}
    >
      {label}
    </Badge>
  );
}
