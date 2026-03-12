"use client";

import { Badge } from "@/components/ui/Badge";
import type { TrackSlug } from "@/data/mock/types";

export interface TrackBadgeProps {
  /** Track slug (lvn, rn, fnp, pmhnp) or null for unassigned */
  slug: string | null;
  /** Optional: show "Shared" for content available to all tracks */
  isShared?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const VALID_SLUGS: TrackSlug[] = ["lvn", "rn", "fnp", "pmhnp"];

export function TrackBadge({ slug, isShared, size = "sm", className = "" }: TrackBadgeProps) {
  if (isShared) {
    return (
      <Badge variant="neutral" size={size} className={className}>
        Shared
      </Badge>
    );
  }
  if (!slug || !VALID_SLUGS.includes(slug as TrackSlug)) {
    return (
      <Badge variant="error" size={size} className={className} title="No track assigned">
        —
      </Badge>
    );
  }
  return (
    <Badge track={slug as TrackSlug} size={size} className={className}>
      {slug.toUpperCase()}
    </Badge>
  );
}
