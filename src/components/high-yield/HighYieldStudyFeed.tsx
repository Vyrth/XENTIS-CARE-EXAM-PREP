"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HighYieldCard } from "./HighYieldCard";
import type { HighYieldTopic } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export interface HighYieldStudyFeedProps {
  topics: HighYieldTopic[];
  track: TrackSlug;
  maxItems?: number;
}

export function HighYieldStudyFeed({
  topics,
  track,
  maxItems = 5,
}: HighYieldStudyFeedProps) {
  const display = topics.slice(0, maxItems);

  const getPracticeHref = (topicId: string, systemId: string) => {
    const sys = MOCK_SYSTEMS.find((s) => s.id === systemId);
    return sys ? `/questions/system/${sys.slug}?topic=${topicId}` : "/questions";
  };

  const getStudyHref = (topicId: string) => `/study-guides?topic=${topicId}`;

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
        Focus on what matters most for the {track.toUpperCase()} exam. Ranked by blueprint weight, miss rates, and learner patterns.
      </p>
      <div className="space-y-3">
        {display.map((topic) => (
          <HighYieldCard
            key={topic.topicId}
            topic={topic}
            practiceHref={getPracticeHref(topic.topicId, topic.systemId)}
            studyHref={getStudyHref(topic.topicId)}
            showWhy={true}
          />
        ))}
      </div>
    </Card>
  );
}
