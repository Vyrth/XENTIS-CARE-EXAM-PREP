"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { CommonConfusion } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";

export interface CommonConfusionCardProps {
  confusions: CommonConfusion[];
  track?: TrackSlug;
  maxItems?: number;
}

export function CommonConfusionCard({ confusions, track = "rn", maxItems = 3 }: CommonConfusionCardProps) {
  const display = confusions.slice(0, maxItems);
  const trackName = getTrackDisplayName(track);

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
        Students Commonly Confuse This With…
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Key distinctions for the {trackName} exam. Avoid mix-ups.
      </p>
      {display.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
          No confusions data yet for {trackName}. Content will appear as it is added.
        </div>
      ) : (
      <div className="space-y-4">
        {display.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
          >
            <p className="font-medium text-slate-900 dark:text-white">
              {c.topicName}: {c.conceptA} vs {c.conceptB}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {c.keyDifference}
            </p>
          </div>
        ))}
      </div>
      )}
      {display.length > 0 && (
        <Link
          href="/high-yield/confusions"
          className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          See all →
        </Link>
      )}
    </Card>
  );
}
