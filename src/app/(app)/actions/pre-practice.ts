"use server";

import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface PrePracticeSeriesStatus {
  trackId: string;
  trackSlug: string;
  trackName: string;
  seriesId: string | null;
  versionCount: number;
  versions: { versionKey: string; displayName: string }[];
}

/** Load Pre-Practice series status per track for admin */
export async function loadPrePracticeSeriesStatus(): Promise<PrePracticeSeriesStatus[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];

  try {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .in("slug", ["rn", "fnp", "pmhnp", "lvn"])
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const { data: series } = await supabase
      .from("pre_practice_series")
      .select("id, exam_track_id")
      .in("exam_track_id", tracks.map((t) => t.id));

    const seriesByTrack = new Map<string, { id: string }>();
    for (const s of series ?? []) {
      seriesByTrack.set(s.exam_track_id, { id: s.id });
    }

    const seriesIds = (series ?? []).map((s) => s.id);
    const { data: versions } = seriesIds.length
      ? await supabase
          .from("pre_practice_versions")
          .select("series_id, version_key, display_name")
          .in("series_id", seriesIds)
          .order("display_order", { ascending: true })
      : { data: [] };

    const versionsBySeries = new Map<string, { versionKey: string; displayName: string }[]>();
    for (const v of versions ?? []) {
      const list = versionsBySeries.get(v.series_id) ?? [];
      list.push({ versionKey: v.version_key, displayName: v.display_name });
      versionsBySeries.set(v.series_id, list);
    }

    return tracks.map((t) => {
      const s = seriesByTrack.get(t.id);
      const vers = s ? versionsBySeries.get(s.id) ?? [] : [];
      return {
        trackId: t.id,
        trackSlug: t.slug,
        trackName: t.name ?? t.slug,
        seriesId: s?.id ?? null,
        versionCount: vers.length,
        versions: vers,
      };
    });
  } catch {
    return [];
  }
}
