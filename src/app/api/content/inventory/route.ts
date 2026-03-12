/**
 * GET /api/content/inventory - Content counts by track (for admin/dev)
 * Returns { [trackSlug]: { guides, decks, videos } }
 * Uses LEARNER_VISIBLE_STATUSES (approved, published) for learner-facing counts.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";

export async function GET() {
  const supabase = await createClient();

  const { data: tracks } = await supabase
    .from("exam_tracks")
    .select("id, slug")
    .order("display_order", { ascending: true });

  if (!tracks || tracks.length === 0) {
    return NextResponse.json({});
  }

  const result: Record<string, { guides: number; decks: number; videos: number }> = {};

  for (const t of tracks) {
    const [guidesRes, decksRes, videosRes] = await Promise.all([
      supabase
        .from("study_guides")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", [...LEARNER_VISIBLE_STATUSES]),
      supabase
        .from("flashcard_decks")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", [...LEARNER_VISIBLE_STATUSES]),
      supabase
        .from("video_lessons")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", [...LEARNER_VISIBLE_STATUSES]),
    ]);

    result[t.slug] = {
      guides: guidesRes.count ?? 0,
      decks: decksRes.count ?? 0,
      videos: videosRes.count ?? 0,
    };
  }

  return NextResponse.json(result);
}
