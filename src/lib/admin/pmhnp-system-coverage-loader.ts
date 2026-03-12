/**
 * PMHNP System/Category Coverage Tracking
 *
 * Loads current question counts per category for PMHNP track vs PMHNP Mass Content Plan targets.
 * Categories map to systems (psychiatric-disorders → psychiatric).
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  PMHNP_CATEGORY_TARGETS,
  type PMHNPCategorySlug,
} from "./pmhnp-mass-content-plan";

export interface PMHNPSystemCoverageRow {
  systemId: string;
  systemSlug: string;
  systemName: string;
  targetCount: number;
  currentCount: number;
  gap: number;
  progressPct: number;
}

/** Map DB system slugs to PMHNP plan category slugs */
const SLUG_TO_CATEGORY: Record<string, PMHNPCategorySlug> = {
  psychiatric: "psychiatric-disorders",
  "psychiatric-disorders": "psychiatric-disorders",
  psychopharmacology: "psychopharmacology",
  "therapy-modalities": "therapy-modalities",
  "substance-use": "substance-use",
  "child-adolescent-psychiatry": "child-adolescent-psychiatry",
  "sleep-disorders": "sleep-disorders",
  "crisis-management": "crisis-management",
};

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load PMHNP category coverage: current vs target per system */
export async function loadPMHNPSystemCoverage(): Promise<PMHNPSystemCoverageRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: track } = await supabase
      .from("exam_tracks")
      .select("id")
      .eq("slug", "pmhnp")
      .single();
    if (!track) return [];

    const { data: systems } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("exam_track_id", track.id);

    if (!systems?.length) return [];

    const rows: PMHNPSystemCoverageRow[] = [];
    for (const sys of systems) {
      const categorySlug = SLUG_TO_CATEGORY[sys.slug];
      const targetCount = categorySlug ? PMHNP_CATEGORY_TARGETS[categorySlug] : 0;
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
