import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { HighYieldPageClient } from "./HighYieldPageClient";
import { getHighYieldTopics } from "@/lib/high-yield";
import {
  MOCK_TOPIC_BLUEPRINT,
  MOCK_BLUEPRINT_BY_TRACK,
  MOCK_TELEMETRY,
  MOCK_STUDENT_SIGNAL,
  MOCK_TOP_TRAPS,
  MOCK_COMMON_CONFUSIONS,
} from "@/data/mock/high-yield";
import { MOCK_TOPICS, MOCK_SYSTEMS } from "@/data/mock/systems";
import type { TrackSlug } from "@/data/mock/types";

function trackIdToSlug(trackId: string | null): TrackSlug {
  if (!trackId) return "rn";
  const map: Record<string, TrackSlug> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function HighYieldPage() {
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

  const traps = MOCK_TOP_TRAPS.filter((t) => t.track === track);
  const confusions = MOCK_COMMON_CONFUSIONS.filter((c) => c.track === track);

  return (
    <HighYieldPageClient
      track={track}
      topics={highYieldTopics}
      traps={traps}
      confusions={confusions}
    />
  );
}
