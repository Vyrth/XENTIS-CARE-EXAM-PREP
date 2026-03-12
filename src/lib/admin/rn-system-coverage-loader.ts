/**
 * RN System Coverage Tracking
 *
 * Loads current question counts per system for RN track vs RN Mass Content Plan targets.
 * Used by AI Factory roadmap and batch presets.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  RN_SYSTEM_TARGETS,
  type RNSystemSlug,
} from "./rn-mass-content-plan";

export interface RNSystemCoverageRow {
  systemId: string;
  systemSlug: string;
  systemName: string;
  targetCount: number;
  currentCount: number;
  gap: number;
  progressPct: number;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** RN plan system slugs (excludes psychiatric - not in 14-system plan) */
const PLAN_SLUGS: RNSystemSlug[] = [
  "cardiovascular",
  "respiratory",
  "neurological",
  "endocrine",
  "renal",
  "gastrointestinal",
  "infectious-disease",
  "pharmacology",
  "pediatrics",
  "ob-gyn",
  "musculoskeletal",
  "dermatology",
  "hematology",
  "safety-prioritization-delegation",
];

/** Load RN system coverage: current vs target per system */
export async function loadRNSystemCoverage(): Promise<RNSystemCoverageRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: track } = await supabase
      .from("exam_tracks")
      .select("id")
      .eq("slug", "rn")
      .single();
    if (!track) return [];

    const { data: systems } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("exam_track_id", track.id);

    if (!systems?.length) return [];

    const rows: RNSystemCoverageRow[] = [];
    const planSlugSet = new Set(PLAN_SLUGS);
    for (const sys of systems) {
      const planSlug = planSlugSet.has(sys.slug as RNSystemSlug) ? (sys.slug as RNSystemSlug) : null;
      const targetCount = planSlug ? RN_SYSTEM_TARGETS[planSlug] : 0;
      if (!planSlug) continue;

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
