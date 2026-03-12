"use client";

import { Card } from "@/components/ui/Card";
import { HighYieldCard } from "@/components/high-yield/HighYieldCard";
import { TopTrapsCard } from "@/components/high-yield/TopTrapsCard";
import { CommonConfusionCard } from "@/components/high-yield/CommonConfusionCard";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import type { HighYieldTopic, TopTrap, CommonConfusion } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { getTrackDisplayName, getExamPhrase } from "@/lib/high-yield/track-display";

export interface HighYieldPageClientProps {
  track: TrackSlug;
  topics: HighYieldTopic[];
  traps: TopTrap[];
  confusions: CommonConfusion[];
  /** systemId -> guideId (serializable object for client) */
  guideBySystem: Record<string, string>;
}

export function HighYieldPageClient({
  track,
  topics,
  traps,
  confusions,
  guideBySystem: guideBySystemObj,
}: HighYieldPageClientProps) {
  const guideBySystem = new Map(Object.entries(guideBySystemObj ?? {}));
  const trackName = getTrackDisplayName(track);
  const examPhrase = getExamPhrase(track);

  const getPracticeHref = (topicId: string, systemSlug?: string) => {
    if (systemSlug) return `/questions/system/${systemSlug}?topic=${topicId}`;
    return `/questions?topic=${topicId}`;
  };

  const getGuideHref = (systemId: string) => {
    const guideId = guideBySystem.get(systemId);
    return guideId ? `/study-guides/${guideId}` : undefined;
  };

  const getStudyHref = (topicId: string) => `/study-guides?topic=${topicId}`;

  const hasContent = topics.length > 0 || traps.length > 0 || confusions.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          High-Yield Intelligence
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Focus on what matters most {examPhrase}. Based on blueprint weighting, internal performance data, and learner patterns.
        </p>
      </div>

      {!hasContent ? (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="text-center py-12">
            <div className="text-4xl mb-4 opacity-60">{Icons.sparkles}</div>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
              No high-yield content yet for {trackName}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              High-yield topics, traps, and confusions will appear here as content is added for your track. In the meantime, build your readiness with practice and study guides.
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Try these instead:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/questions" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Practice Questions
                {Icons.chevronRight}
              </Link>
              <Link href="/study-guides" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Study Guides
                {Icons.chevronRight}
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
                High-Yield Topics
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Ranked by blueprint weight, miss rates, and learner patterns. Higher score = more important to master.
              </p>
              {topics.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No high-yield topics yet for {trackName}. Content will appear as your track is populated.
                </div>
              ) : (
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <HighYieldCard
                      key={topic.topicId}
                      topic={topic}
                      practiceHref={getPracticeHref(topic.topicId, topic.systemSlug)}
                      studyHref={getStudyHref(topic.topicId)}
                      guideHref={getGuideHref(topic.systemId)}
                      showWhy={true}
                    />
                  ))}
                </div>
              )}
            </Card>

            {topics.length > 0 && (
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
            )}
          </div>

          <div className="space-y-6">
            <TopTrapsCard traps={traps} track={track} maxItems={4} />
            <CommonConfusionCard confusions={confusions} track={track} maxItems={4} />
          </div>
        </div>
      )}
    </div>
  );
}
