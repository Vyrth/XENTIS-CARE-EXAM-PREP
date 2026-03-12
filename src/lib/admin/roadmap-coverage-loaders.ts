/**
 * Production Roadmap - coverage gaps by system/topic.
 * Identifies systems and topics with lowest content coverage for batch generation.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { ExamTrackSlug } from "./production-targets";

export interface SystemCoverageGap {
  systemId: string;
  systemName: string;
  systemSlug: string;
  trackId: string;
  trackSlug: ExamTrackSlug;
  questionCount: number;
  guideCount: number;
  deckCount: number;
  flashcardCount: number;
  highYieldCount: number;
  /** 0-100, lower = more gap */
  coverageScore: number;
}

export interface TopicCoverageGap {
  topicId: string;
  topicName: string;
  topicSlug: string;
  systemId: string;
  systemName: string;
  trackId: string;
  trackSlug: ExamTrackSlug;
  questionCount: number;
  guideCount: number;
  deckCount: number;
  flashcardCount: number;
  highYieldCount: number;
  /** 0-100, lower = more gap */
  coverageScore: number;
}

export interface RoadmapCoverageGaps {
  trackId: string;
  trackSlug: ExamTrackSlug;
  trackName: string;
  /** Systems with lowest coverage, sorted by coverageScore asc */
  lowestSystems: SystemCoverageGap[];
  /** Topics with lowest coverage, sorted by coverageScore asc */
  lowestTopics: TopicCoverageGap[];
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Compute coverage score 0-100 from content counts (heuristic) */
function coverageScore(counts: {
  questions: number;
  guides: number;
  decks: number;
  flashcards: number;
  highYield: number;
}): number {
  const q = Math.min(100, counts.questions * 2);
  const g = Math.min(100, counts.guides * 5);
  const d = Math.min(100, counts.decks * 3);
  const f = Math.min(100, counts.flashcards / 20);
  const h = Math.min(100, counts.highYield * 2);
  return Math.round((q + g + d + f + h) / 5);
}

/** Load coverage gaps - systems and topics with lowest coverage per track */
export async function loadRoadmapCoverageGaps(
  maxSystemsPerTrack = 5,
  maxTopicsPerTrack = 8
): Promise<RoadmapCoverageGaps[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const results: RoadmapCoverageGaps[] = [];

    for (const track of tracks) {
      const trackSlug = track.slug as ExamTrackSlug;
      const { data: systems } = await supabase
        .from("systems")
        .select("id, slug, name")
        .eq("exam_track_id", track.id);

      if (!systems?.length) {
        results.push({
          trackId: track.id,
          trackSlug,
          trackName: track.name,
          lowestSystems: [],
          lowestTopics: [],
        });
        continue;
      }

      const systemGaps: SystemCoverageGap[] = [];

      for (const sys of systems) {
        const [qRes, sgRes, deckRes, hyRes] = await Promise.all([
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("exam_track_id", track.id)
            .eq("system_id", sys.id)
            .in("status", ["approved", "published"]),
          supabase
            .from("study_guides")
            .select("id", { count: "exact", head: true })
            .eq("exam_track_id", track.id)
            .eq("system_id", sys.id)
            .in("status", ["approved", "published"]),
          supabase
            .from("flashcard_decks")
            .select("id")
            .eq("exam_track_id", track.id)
            .eq("system_id", sys.id),
          supabase
            .from("high_yield_content")
            .select("id", { count: "exact", head: true })
            .eq("exam_track_id", track.id)
            .eq("system_id", sys.id)
            .in("status", ["approved", "published"]),
        ]);

        const deckIds = (deckRes.data ?? []).map((d) => d.id);
        const cardRes =
          deckIds.length > 0
            ? await supabase
                .from("flashcards")
                .select("id", { count: "exact", head: true })
                .in("flashcard_deck_id", deckIds)
            : { count: 0 };

        const questionCount = qRes.count ?? 0;
        const guideCount = sgRes.count ?? 0;
        const deckCount = deckIds.length;
        const flashcardCount = cardRes.count ?? 0;
        const highYieldCount = hyRes.count ?? 0;

        const score = coverageScore({
          questions: questionCount,
          guides: guideCount,
          decks: deckCount,
          flashcards: flashcardCount,
          highYield: highYieldCount,
        });

        systemGaps.push({
          systemId: sys.id,
          systemName: sys.name,
          systemSlug: sys.slug,
          trackId: track.id,
          trackSlug,
          questionCount,
          guideCount,
          deckCount,
          flashcardCount,
          highYieldCount,
          coverageScore: score,
        });
      }

      systemGaps.sort((a, b) => a.coverageScore - b.coverageScore);
      const lowestSystems = systemGaps.slice(0, maxSystemsPerTrack);

      const topicGaps: TopicCoverageGap[] = [];
      const { data: links } = await supabase
        .from("topic_system_links")
        .select("topic_id, system_id")
        .in("system_id", systems.map((s) => s.id));

      const topicIds = [...new Set((links ?? []).map((l) => l.topic_id).filter(Boolean))];
      const systemMap = new Map(systems.map((s) => [s.id, s]));

      if (topicIds.length > 0) {
        const { data: topics } = await supabase
          .from("topics")
          .select("id, slug, name")
          .in("id", topicIds);

        const topicToSystem = new Map<string, string>();
        for (const l of links ?? []) {
          if (l.topic_id && l.system_id) {
            topicToSystem.set(l.topic_id, l.system_id);
          }
        }

        for (const t of topics ?? []) {
          const systemId = topicToSystem.get(t.id);
          const sys = systemId ? systemMap.get(systemId) : null;
          if (!sys) continue;

          const [qRes, sgRes, deckRes, hyRes] = await Promise.all([
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("exam_track_id", track.id)
              .eq("topic_id", t.id)
              .in("status", ["approved", "published"]),
            supabase
              .from("study_guides")
              .select("id", { count: "exact", head: true })
              .eq("exam_track_id", track.id)
              .eq("topic_id", t.id)
              .in("status", ["approved", "published"]),
            supabase
              .from("flashcard_decks")
              .select("id")
              .eq("exam_track_id", track.id)
              .eq("topic_id", t.id),
            supabase
              .from("high_yield_content")
              .select("id", { count: "exact", head: true })
              .eq("exam_track_id", track.id)
              .eq("topic_id", t.id)
              .in("status", ["approved", "published"]),
          ]);

          const deckIds = (deckRes.data ?? []).map((d) => d.id);
          const cardRes =
            deckIds.length > 0
              ? await supabase
                  .from("flashcards")
                  .select("id", { count: "exact", head: true })
                  .in("flashcard_deck_id", deckIds)
              : { count: 0 };

          const score = coverageScore({
            questions: qRes.count ?? 0,
            guides: sgRes.count ?? 0,
            decks: deckIds.length,
            flashcards: cardRes.count ?? 0,
            highYield: hyRes.count ?? 0,
          });

          topicGaps.push({
            topicId: t.id,
            topicName: t.name,
            topicSlug: t.slug,
            systemId: sys.id,
            systemName: sys.name,
            trackId: track.id,
            trackSlug,
            questionCount: qRes.count ?? 0,
            guideCount: sgRes.count ?? 0,
            deckCount: deckIds.length,
            flashcardCount: cardRes.count ?? 0,
            highYieldCount: hyRes.count ?? 0,
            coverageScore: score,
          });
        }
        topicGaps.sort((a, b) => a.coverageScore - b.coverageScore);
      }

      results.push({
        trackId: track.id,
        trackSlug,
        trackName: track.name,
        lowestSystems,
        lowestTopics: topicGaps.slice(0, maxTopicsPerTrack),
      });
    }

    return results;
  });
}
