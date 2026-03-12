"use client";

import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import {
  buildSystemGapLinks,
  buildTrackGapLinks,
} from "@/lib/admin/ai-factory-gap-links";

type ContentType = "questions" | "guide" | "flashcards" | "highYield";

const LABELS: Record<ContentType, string> = {
  questions: "Generate Questions",
  guide: "Generate Guide",
  flashcards: "Generate Flashcards",
  highYield: "Generate High-Yield",
};

/** Show only missing content types for a system */
export interface GenerateFromGapButtonsProps {
  trackId: string;
  systemId?: string;
  topicId?: string;
  domainId?: string;
  /** Which content types to show (default: all) */
  show?: ContentType[];
  /** Which are missing/low - only show those (default: show all in show prop) */
  missing?: ContentType[];
  /** Compact style for inline use */
  compact?: boolean;
}

export function GenerateFromGapButtons({
  trackId,
  systemId,
  topicId,
  domainId,
  show = ["questions", "guide", "flashcards", "highYield"],
  missing,
  compact = false,
}: GenerateFromGapButtonsProps) {
  const links = systemId
    ? buildSystemGapLinks(trackId, systemId, topicId, domainId)
    : buildTrackGapLinks(trackId);

  const toShow = show.filter((c) => !missing || missing.includes(c));

  if (toShow.length === 0) return null;

  const linkClass = compact
    ? "text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
    : "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors";

  const getHref = (c: ContentType) => links[c];

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "mt-2"}`}>
      {toShow.map((contentType) => {
        const href = getHref(contentType);
        if (!href) return null;
        return (
          <Link
            key={contentType}
            href={href}
            className={linkClass}
            title={LABELS[contentType]}
          >
            {!compact && (
              <span className="opacity-70">{Icons.sparkles}</span>
            )}
            {LABELS[contentType]}
          </Link>
        );
      })}
    </div>
  );
}
