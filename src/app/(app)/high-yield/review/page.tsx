import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { getHighYieldTopics } from "@/lib/high-yield";
import {
  MOCK_TOPIC_BLUEPRINT,
  MOCK_BLUEPRINT_BY_TRACK,
  MOCK_TELEMETRY,
  MOCK_STUDENT_SIGNAL,
} from "@/data/mock/high-yield";
import { MOCK_TOPICS, MOCK_SYSTEMS } from "@/data/mock/systems";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";

function trackIdToSlug(trackId: string | null): "lvn" | "rn" | "fnp" | "pmhnp" {
  if (!trackId) return "rn";
  const map: Record<string, "lvn" | "rn" | "fnp" | "pmhnp"> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function HighYieldReviewPage() {
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

  const systemsWithHighYield = [...new Set(highYieldTopics.map((t) => t.systemId))];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <Link
          href="/high-yield"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4"
        >
          <span className="rotate-180">{Icons.chevronRight}</span>
          Back to High-Yield
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          High-Yield Review Mode
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Practice questions from high-yield topics only. Focus your study time where it matters most.
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Start a Session
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Questions will be drawn from: {highYieldTopics.map((t) => t.topicName).join(", ")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemsWithHighYield.map((sysId) => {
            const sys = MOCK_SYSTEMS.find((s) => s.id === sysId);
            const topicCount = highYieldTopics.filter((t) => t.systemId === sysId).length;
            if (!sys) return null;
            return (
              <Link key={sysId} href={`/questions/system/${sys.slug}?highYield=1`}>
                <ActionTile
                  href={`/questions/system/${sys.slug}?highYield=1`}
                  title={sys.name}
                  description={`${topicCount} high-yield topic(s)`}
                  icon={Icons["help-circle"]}
                />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
