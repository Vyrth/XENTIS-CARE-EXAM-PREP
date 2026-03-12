/**
 * Production planning - live counts vs targets for AI Content Factory panel.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";
import {
  PRODUCTION_TARGETS,
  type ExamTrackSlug,
  type ContentTypeKey,
  type ProductionTargets,
} from "./production-targets";

export interface TrackProductionRow {
  trackId: string;
  trackSlug: ExamTrackSlug;
  trackName: string;
  current: ProductionTargets;
  target: ProductionTargets;
  /** Content type with lowest progress (furthest behind) */
  furthestBehind: ContentTypeKey;
  /** Progress pct 0-100 per content type */
  progressPct: ProductionTargets;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load live production counts and compute progress vs targets */
export async function loadProductionPlanningData(): Promise<TrackProductionRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const rows: TrackProductionRow[] = [];

    for (const t of tracks) {
      const slug = t.slug as ExamTrackSlug;
      const targets = PRODUCTION_TARGETS[slug] ?? PRODUCTION_TARGETS.rn;

      const [
        qRes,
        sgRes,
        decksRes,
        hyRes,
      ] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).in("status", [...LEARNER_VISIBLE_STATUSES]),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).in("status", [...LEARNER_VISIBLE_STATUSES]),
        supabase.from("flashcard_decks").select("id").eq("exam_track_id", t.id),
        supabase.from("high_yield_content").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).in("status", [...LEARNER_VISIBLE_STATUSES]),
      ]);

      const deckIds = (decksRes.data ?? []).map((d) => d.id);
      const cardsRes = deckIds.length > 0
        ? await supabase.from("flashcards").select("id", { count: "exact", head: true }).in("flashcard_deck_id", deckIds)
        : { count: 0 };

      const current: ProductionTargets = {
        questions: qRes.count ?? 0,
        studyGuides: sgRes.count ?? 0,
        flashcardDecks: deckIds.length,
        flashcards: cardsRes.count ?? 0,
        highYield: hyRes.count ?? 0,
      };

      const progressPct: ProductionTargets = {
        questions: targets.questions > 0 ? Math.min(100, (current.questions / targets.questions) * 100) : 100,
        studyGuides: targets.studyGuides > 0 ? Math.min(100, (current.studyGuides / targets.studyGuides) * 100) : 100,
        flashcardDecks: targets.flashcardDecks > 0 ? Math.min(100, (current.flashcardDecks / targets.flashcardDecks) * 100) : 100,
        flashcards: targets.flashcards > 0 ? Math.min(100, (current.flashcards / targets.flashcards) * 100) : 100,
        highYield: targets.highYield > 0 ? Math.min(100, (current.highYield / targets.highYield) * 100) : 100,
      };

      const contentTypes: ContentTypeKey[] = ["questions", "studyGuides", "flashcardDecks", "flashcards", "highYield"];
      const furthestBehind = contentTypes.reduce((a, b) =>
        progressPct[a] < progressPct[b] ? a : b
      );

      rows.push({
        trackId: t.id,
        trackSlug: slug,
        trackName: t.name,
        current,
        target: targets,
        furthestBehind,
        progressPct,
      });
    }

    return rows;
  });
}
