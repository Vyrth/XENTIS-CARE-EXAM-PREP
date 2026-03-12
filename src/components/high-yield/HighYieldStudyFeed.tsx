"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HighYieldCard } from "./HighYieldCard";
import type { HighYieldTopic } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";

export interface HighYieldStudyFeedProps {
  topics: HighYieldTopic[];
  track: TrackSlug;
  maxItems?: number;
  /** systemId -> guideId for "Open guide" links */
  guideBySystem?: Map<string, string> | Record<string, string>;
}

export function HighYieldStudyFeed({
  topics,
  track,
  maxItems = 5,
  guideBySystem: guideBySystemProp,
}: HighYieldStudyFeedProps) {
  const display = useMemo(
    () => topics.slice(0, maxItems),
    [topics, maxItems]
  );
  const trackName = getTrackDisplayName(track);
  const guideBySystem = useMemo(
    () =>
      guideBySystemProp instanceof Map
        ? guideBySystemProp
        : new Map(Object.entries(guideBySystemProp ?? {})),
    [guideBySystemProp]
  );

  const getPracticeHref = (topicId: string, systemSlug?: string) => {
    if (systemSlug) return `/questions/system/${systemSlug}?topic=${topicId}`;
    return `/questions?topic=${topicId}`;
  };

  const getGuideHref = (systemId: string) => guideBySystem.get(systemId) ? `/study-guides/${guideBySystem.get(systemId)}` : undefined;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
          High-Yield Study Feed
        </h2>
        <Link
          href="/high-yield"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View all
        </Link>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Focus on what matters most for the {trackName} exam. Ranked by blueprint weight, miss rates, and learner patterns.
      </p>
      <div className="space-y-3">
        {display.map((topic) => (
          <HighYieldCard
            key={topic.topicId}
            topic={topic}
            practiceHref={getPracticeHref(topic.topicId, topic.systemSlug)}
            studyHref={getGuideHref(topic.systemId) ? undefined : `/study-guides?topic=${topic.topicId}`}
            guideHref={getGuideHref(topic.systemId)}
            showWhy={true}
          />
        ))}
      </div>
    </Card>
  );
}
