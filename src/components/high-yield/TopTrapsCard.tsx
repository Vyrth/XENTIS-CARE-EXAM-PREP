"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TopTrap } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";

export interface TopTrapsCardProps {
  traps: TopTrap[];
  track?: TrackSlug;
  maxItems?: number;
}

const frequencyColors = {
  extremely_common: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
  very_common: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
  common: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
};

export function TopTrapsCard({ traps, track = "rn", maxItems = 4 }: TopTrapsCardProps) {
  const display = traps.slice(0, maxItems);
  const trackName = getTrackDisplayName(track);

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
        Top Traps
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Common {trackName} exam pitfalls. Know these to avoid losing easy points.
      </p>
      {display.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
          No traps data yet for {trackName}. Content will appear as it is added.
        </div>
      ) : (
      <div className="space-y-4">
        {display.map((trap) => (
          <div
            key={trap.id}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-l-red-400"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-slate-900 dark:text-white">
                {trap.topicName}
              </span>
              <Badge
                variant="neutral"
                size="sm"
                className={frequencyColors[trap.frequency]}
              >
                {trap.frequency.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Trap: {trap.trapDescription}
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              ✓ {trap.correctApproach}
            </p>
          </div>
        ))}
      </div>
      )}
      {display.length > 0 && (
        <Link
          href="/high-yield/traps"
          className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          See all traps →
        </Link>
      )}
    </Card>
  );
}
