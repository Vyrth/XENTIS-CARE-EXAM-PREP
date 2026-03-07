import { Card } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { ActionTile } from "@/components/ui/ActionTile";
import { HighYieldFlag } from "@/components/high-yield/HighYieldFlag";
import { Icons } from "@/components/ui/icons";
import { MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS } from "@/data/mock/systems";
import { getHighYieldTopics } from "@/lib/high-yield";
import {
  MOCK_TOPIC_BLUEPRINT,
  MOCK_BLUEPRINT_BY_TRACK,
  MOCK_TELEMETRY,
  MOCK_STUDENT_SIGNAL,
} from "@/data/mock/high-yield";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";

function trackIdToSlug(trackId: string | null): "lvn" | "rn" | "fnp" | "pmhnp" {
  if (!trackId) return "rn";
  const map: Record<string, "lvn" | "rn" | "fnp" | "pmhnp"> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function QuestionBankPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const track = trackIdToSlug(profile?.primary_exam_track_id ?? null);

  const topicsWithSystem = MOCK_TOPICS.map((t) => ({
    id: t.id,
    name: t.name,
    systemId: t.systemId,
    systemName: MOCK_SYSTEMS.find((s) => s.id === t.systemId)?.name ?? t.systemId,
  }));
  const highYieldTopics = getHighYieldTopics(track, {
    topicBlueprint: MOCK_TOPIC_BLUEPRINT,
    systemBlueprint: MOCK_BLUEPRINT_BY_TRACK[track] ?? MOCK_BLUEPRINT_BY_TRACK.rn,
    telemetry: MOCK_TELEMETRY,
    studentSignal: MOCK_STUDENT_SIGNAL,
    topics: topicsWithSystem,
  });
  const hyScoreByTopic = new Map(highYieldTopics.map((t) => [t.topicId, t.score]));
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Question Bank
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Practice by system, domain, or topic. Filter and customize your sessions.
      </p>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">By System</TabsTrigger>
          <TabsTrigger value="domain">By Domain</TabsTrigger>
          <TabsTrigger value="topic">By Topic</TabsTrigger>
        </TabsList>
        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {MOCK_SYSTEMS.map((sys, i) => (
              <ActionTile
                key={sys.id}
                href={`/questions/system/${sys.slug}`}
                title={sys.name}
                description="45 questions available"
                icon={Icons["help-circle"]}
                badge="62%"
                trackColor={["rn", "lvn", "fnp", "pmhnp"][i] as "rn" | "lvn" | "fnp" | "pmhnp"}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="domain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {MOCK_DOMAINS.map((dom) => (
              <ActionTile
                key={dom.id}
                href={`/questions/domain/${dom.slug}`}
                title={dom.name}
                description="Mixed system questions"
                icon={Icons["help-circle"]}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="topic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {MOCK_TOPICS.map((top) => (
              <div key={top.id} className="relative">
                <ActionTile
                  href={`/questions/topic/${top.slug}`}
                  title={top.name}
                  description="12 questions"
                  icon={Icons["help-circle"]}
                />
                <span className="absolute top-3 right-3">
                  <HighYieldFlag score={hyScoreByTopic.get(top.id) ?? 0} compact />
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
