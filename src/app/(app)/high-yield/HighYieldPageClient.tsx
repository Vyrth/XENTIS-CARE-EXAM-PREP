"use client";

import { Card } from "@/components/ui/Card";
import { HighYieldCard } from "@/components/high-yield/HighYieldCard";
import { TopTrapsCard } from "@/components/high-yield/TopTrapsCard";
import { CommonConfusionCard } from "@/components/high-yield/CommonConfusionCard";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import type { HighYieldTopic, TopTrap, CommonConfusion } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export interface HighYieldPageClientProps {
  track: TrackSlug;
  topics: HighYieldTopic[];
  traps: TopTrap[];
  confusions: CommonConfusion[];
}

export function HighYieldPageClient({
  track,
  topics,
  traps,
  confusions,
}: HighYieldPageClientProps) {
  const getPracticeHref = (topicId: string, systemId: string) => {
    const sys = MOCK_SYSTEMS.find((s) => s.id === systemId);
    return sys ? `/questions/system/${sys.slug}?topic=${topicId}` : "/questions";
  };

  const getStudyHref = (topicId: string) => `/study-guides?topic=${topicId}`;

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          High-Yield Intelligence
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Focus on what matters most for the {track.toUpperCase()} exam. Based on official blueprint weighting, internal performance data, and learner patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
              High-Yield Topics
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Ranked by blueprint weight, miss rates, and student engagement. Higher score = more important to master.
            </p>
            <div className="space-y-4">
              {topics.map((topic) => (
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

          <Link
            href="/high-yield/review"
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <span className="text-2xl">{Icons.sparkles}</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                High-Yield Review Mode
              </p>
              <p className="text-sm text-slate-500">
                Practice questions from high-yield topics only
              </p>
            </div>
            {Icons.chevronRight}
          </Link>
        </div>

        <div className="space-y-6">
          <TopTrapsCard traps={traps} maxItems={4} />
          <CommonConfusionCard confusions={confusions} maxItems={4} />
        </div>
      </div>
    </div>
  );
}
