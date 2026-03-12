import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { ActionTile } from "@/components/ui/ActionTile";
import { HighYieldFlag } from "@/components/high-yield/HighYieldFlag";
import { Icons } from "@/components/ui/icons";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import {
  loadQuestionCounts,
  loadSystemsForTrack,
  loadDomains,
  loadTopicsForTrack,
  loadSubtopicsForTrack,
  loadQuestionTypes,
} from "@/lib/questions";
import { loadHighYieldTopics } from "@/lib/dashboard/loaders";
import { QuestionBrowse } from "@/components/questions/QuestionBrowse";
import { EmptyContentState } from "@/components/content/EmptyContentState";

type Props = { searchParams: Promise<{ domain?: string; topic?: string; system?: string }> };

export default async function QuestionBankPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasBrowseParams = !!(params.domain || params.topic || params.system);
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const [counts, systems, domains, topics, subtopics, questionTypes] = await Promise.all([
    loadQuestionCounts(trackId),
    loadSystemsForTrack(trackId),
    loadDomains(),
    loadTopicsForTrack(trackId),
    hasBrowseParams ? loadSubtopicsForTrack(trackId) : Promise.resolve([]),
    hasBrowseParams ? loadQuestionTypes() : Promise.resolve([]),
  ]);

  const hyScoreByTopic = new Map<string, number>();
  if (trackId) {
    const hy = await loadHighYieldTopics(trackId, track, 200);
    hy.forEach((t) => hyScoreByTopic.set(t.topicId, t.score));
  }

  const hasQuestions = counts.total > 0;

  if (hasBrowseParams) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Link
          href="/questions"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <span className="inline-block rotate-180">{Icons.chevronRight}</span>
          Back to Question Bank
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Browse Questions
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Filter by system, domain, topic, and more. {primary && `${track.toUpperCase()} track`}
        </p>
        <QuestionBrowse
          initialFilters={{ system: params.system, domain: params.domain, topic: params.topic }}
          filterOptions={{
            systems,
            domains,
            topics,
            subtopics,
            questionTypes,
          }}
          trackSlug={track}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Question Bank
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Practice by system, domain, or topic. Filter and customize your sessions.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      {!hasQuestions ? (
        <EmptyContentState
          title="No questions yet for your track"
          description={`The question bank for ${track.toUpperCase()} is empty. Questions will appear here once content is added and approved.`}
          trackSlug={track}
          contentType="questions"
        />
      ) : (
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">By System</TabsTrigger>
            <TabsTrigger value="domain">By Domain</TabsTrigger>
            <TabsTrigger value="topic">By Topic</TabsTrigger>
          </TabsList>
          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {counts.bySystem.length === 0 ? (
                <p className="text-slate-500 col-span-full">No systems with questions.</p>
              ) : (
                counts.bySystem.map((sys) => (
                  <ActionTile
                    key={sys.systemId}
                    href={`/questions/system/${sys.systemSlug}`}
                    title={sys.systemName}
                    description={`${sys.count} question${sys.count === 1 ? "" : "s"} available`}
                    icon={Icons["help-circle"]}
                    badge={track.toUpperCase()}
                    trackColor={track as "lvn" | "rn" | "fnp" | "pmhnp"}
                  />
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="domain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {counts.byDomain.length === 0 ? (
                <p className="text-slate-500 col-span-full">No domains with questions.</p>
              ) : (
                counts.byDomain.map((dom) => (
                  <ActionTile
                    key={dom.domainId}
                    href={`/questions/domain/${dom.domainSlug}`}
                    title={dom.domainName}
                    description={`${dom.count} question${dom.count === 1 ? "" : "s"} · Mixed systems`}
                    icon={Icons["help-circle"]}
                  />
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="topic">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {counts.byTopic.length === 0 ? (
                <p className="text-slate-500 col-span-full">No topics with questions.</p>
              ) : (
                counts.byTopic.map((top) => (
                  <div key={top.topicId} className="relative">
                    <ActionTile
                      href={`/questions/topic/${top.topicSlug}`}
                      title={top.topicName}
                      description={`${top.count} question${top.count === 1 ? "" : "s"}`}
                      icon={Icons["help-circle"]}
                    />
                    <span className="absolute top-3 right-3">
                      <HighYieldFlag score={hyScoreByTopic.get(top.topicId) ?? 0} compact />
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
