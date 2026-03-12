/**
 * High-Yield loaders - DB-backed feed for track-specific content.
 * Only approved/published content is visible to learners.
 */

import { createClient } from "@/lib/supabase/server";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";
import type { TrackSlug } from "@/data/mock/types";
import type { HighYieldTopic, TopTrap, CommonConfusion } from "@/types/high-yield";
import { loadHighYieldTopics } from "@/lib/dashboard/loaders";
import { loadStudyGuides } from "@/lib/content";

export interface HighYieldFeedData {
  topics: HighYieldTopic[];
  traps: TopTrap[];
  confusions: CommonConfusion[];
  /** systemId -> guideId for "Open guide" links */
  guideBySystem: Map<string, string>;
}

/**
 * Load common confusions. Prefers approved high_yield_content rows.
 * Falls back to topic_summaries-derived. Returns [] when none exist.
 */
async function loadConfusionsFromTopicSummaries(
  trackId: string | null,
  trackSlug: TrackSlug
): Promise<CommonConfusion[]> {
  if (trackId) {
    const supabase = await createClient();
    const { data: curated } = await supabase
      .from("high_yield_content")
      .select("id, topic_id, title, concept_a, concept_b, key_difference")
      .eq("exam_track_id", trackId)
      .eq("content_type", "common_confusion")
      .in("status", [...LEARNER_VISIBLE_STATUSES])
      .order("display_order", { ascending: true });

    if (curated && curated.length > 0) {
      return curated.map((r) => ({
        id: r.id,
        topicId: r.topic_id ?? "",
        topicName: r.title ?? "Untitled",
        conceptA: r.concept_a ?? "",
        conceptB: r.concept_b ?? "",
        keyDifference: r.key_difference ?? "",
        track: trackSlug,
      }));
    }

    const { data: rows } = await supabase
      .from("topic_summaries")
      .select("topic_id, summary_text, key_points, topics(id, name)")
      .eq("exam_track_id", trackId);

    const confusions: CommonConfusion[] = [];
    for (const r of rows ?? []) {
      const keyPoints = (r.key_points as string[] | null) ?? [];
      if (keyPoints.length < 2) continue;
      const topicsRaw = r.topics;
      const topic = Array.isArray(topicsRaw) ? topicsRaw[0] : topicsRaw;
      if (!topic || typeof topic !== "object" || !("id" in topic) || !("name" in topic)) continue;
      const conceptA = String(keyPoints[0]);
      const conceptB = String(keyPoints[1]);
      confusions.push({
        id: `conf-${r.topic_id}-${conceptA}-${conceptB}`,
        topicId: r.topic_id,
        topicName: String(topic.name),
        conceptA,
        conceptB,
        keyDifference: (r.summary_text as string)?.slice(0, 300) ?? "",
        track: trackSlug,
      });
    }
    if (confusions.length > 0) return confusions;
  }

  return [];
}

/**
 * Load traps. Prefers approved high_yield_content board_trap rows.
 * Returns [] when none exist.
 */
async function loadTrapsForTrack(
  trackId: string | null,
  trackSlug: TrackSlug
): Promise<TopTrap[]> {
  if (trackId) {
    const supabase = await createClient();
    const { data: curated } = await supabase
      .from("high_yield_content")
      .select("id, topic_id, title, trap_description, correct_approach, trap_severity")
      .eq("exam_track_id", trackId)
      .eq("content_type", "board_trap")
      .in("status", [...LEARNER_VISIBLE_STATUSES])
      .order("display_order", { ascending: true })
      .order("trap_severity", { ascending: false });

    if (curated && curated.length > 0) {
      return curated.map((r) => {
        const sev = typeof r.trap_severity === "number" ? r.trap_severity : 2;
        const frequency: "common" | "very_common" | "extremely_common" =
          sev >= 4 ? "extremely_common" : sev >= 3 ? "very_common" : "common";
        return {
          id: r.id,
          topicId: r.topic_id ?? "",
          topicName: r.title ?? "Untitled",
          trapDescription: r.trap_description ?? "",
          correctApproach: r.correct_approach ?? "",
          track: trackSlug,
          frequency,
        };
      });
    }
  }

  return [];
}

/**
 * Build systemId -> first study guide id map for "Open guide" links.
 */
async function loadGuideBySystem(trackId: string | null): Promise<Map<string, string>> {
  if (!trackId) return new Map();

  const guides = await loadStudyGuides(trackId);
  const map = new Map<string, string>();
  for (const g of guides) {
    if (g.systemId && !map.has(g.systemId)) {
      map.set(g.systemId, g.id);
    }
  }
  return map;
}

/**
 * Load full high-yield feed for a track.
 * Topics from blueprint + topic_system_links.
 * Traps and confusions prefer approved high_yield_content; fall back to topic_summaries. Returns [] when none exist.
 */
export async function loadHighYieldFeed(
  trackId: string | null,
  trackSlug: TrackSlug,
  topicLimit = 15
): Promise<HighYieldFeedData> {
  const [topics, traps, confusions, guideBySystem] = await Promise.all([
    loadHighYieldTopics(trackId, trackSlug, topicLimit),
    loadTrapsForTrack(trackId, trackSlug),
    loadConfusionsFromTopicSummaries(trackId, trackSlug),
    loadGuideBySystem(trackId),
  ]);

  return {
    topics,
    traps,
    confusions,
    guideBySystem,
  };
}
