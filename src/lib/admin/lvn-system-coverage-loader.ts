/**
 * LVN System/Category Coverage Tracking
 *
 * Loads current question counts per category for LVN track vs LVN Mass Content Plan targets.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  LVN_CATEGORY_TARGETS,
  type LVNCategorySlug,
} from "./lvn-mass-content-plan";

export interface LVNSystemCoverageRow {
  systemId: string;
  systemSlug: string;
  systemName: string;
  targetCount: number;
  currentCount: number;
  gap: number;
  progressPct: number;
}

/** LVN plan category slugs (direct system slugs) */
const PLAN_SLUGS: LVNCategorySlug[] = [
  "fundamentals",
  "pharmacology-basics",
  "medical-surgical",
  "pediatrics-basics",
  "ob-basics",
  "safety-infection-control",
];

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load LVN category coverage: current vs target per system */
export async function loadLVNSystemCoverage(): Promise<LVNSystemCoverageRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: track } = await supabase
      .from("exam_tracks")
      .select("id")
      .eq("slug", "lvn")
      .single();
    if (!track) return [];

    const { data: systems } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("exam_track_id", track.id);

    if (!systems?.length) return [];

    const planSlugSet = new Set(PLAN_SLUGS);
    const rows: LVNSystemCoverageRow[] = [];

    for (const sys of systems) {
      const categorySlug = planSlugSet.has(sys.slug as LVNCategorySlug) ? (sys.slug as LVNCategorySlug) : null;
      const targetCount = categorySlug ? LVN_CATEGORY_TARGETS[categorySlug] : 0;
      if (!categorySlug) continue;

      const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", track.id)
        .eq("system_id", sys.id)
        .in("status", ["draft", "editor_review", "approved", "published"]);

      const currentCount = count ?? 0;
      const gap = Math.max(0, targetCount - currentCount);
      const progressPct = targetCount > 0 ? Math.min(100, (currentCount / targetCount) * 100) : 100;

      rows.push({
        systemId: sys.id,
        systemSlug: sys.slug,
        systemName: sys.name,
        targetCount,
        currentCount,
        gap,
        progressPct: Math.round(progressPct * 10) / 10,
      });
    }

    return rows.sort((a, b) => a.progressPct - b.progressPct);
  });
}
