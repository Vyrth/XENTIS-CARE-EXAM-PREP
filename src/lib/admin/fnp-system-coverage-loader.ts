/**
 * FNP System Coverage Tracking
 *
 * Loads current question counts per system for FNP track vs FNP Mass Content Plan targets.
 * Used by AI Factory roadmap and batch presets.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  FNP_SYSTEM_TARGETS,
  type FNPSystemSlug,
} from "./fnp-mass-content-plan";

export interface FNPSystemCoverageRow {
  systemId: string;
  systemSlug: string;
  systemName: string;
  targetCount: number;
  currentCount: number;
  gap: number;
  progressPct: number;
  /** Topic count for diversity guardrail (min 2 recommended) */
  topicCount: number;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** FNP plan system slugs */
const PLAN_SLUGS: FNPSystemSlug[] = [
  "cardiovascular",
  "endocrine",
  "respiratory",
  "gastrointestinal",
  "renal",
  "dermatology",
  "musculoskeletal",
  "ob-gyn",
  "pediatrics",
  "psychiatric",
  "preventive-care",
  "infectious-disease",
];

/** Load FNP system coverage: current vs target per system */
export async function loadFNPSystemCoverage(): Promise<FNPSystemCoverageRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: track } = await supabase
      .from("exam_tracks")
      .select("id")
      .eq("slug", "fnp")
      .single();
    if (!track) return [];

    const { data: systems } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("exam_track_id", track.id);

    if (!systems?.length) return [];

    const rows: FNPSystemCoverageRow[] = [];
    const planSlugSet = new Set(PLAN_SLUGS);
    for (const sys of systems) {
      const planSlug = planSlugSet.has(sys.slug as FNPSystemSlug) ? (sys.slug as FNPSystemSlug) : null;
      const targetCount = planSlug ? FNP_SYSTEM_TARGETS[planSlug] : 0;
      if (!planSlug) continue;

      const [qRes, topicLinksRes] = await Promise.all([
        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("exam_track_id", track.id)
          .eq("system_id", sys.id)
          .in("status", ["draft", "editor_review", "approved", "published"]),
        supabase
          .from("topic_system_links")
          .select("topic_id")
          .eq("system_id", sys.id),
      ]);

      const currentCount = qRes.count ?? 0;
      const topicCount = topicLinksRes.data?.length ?? 0;
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
        topicCount,
      });
    }

    return rows.sort((a, b) => a.progressPct - b.progressPct);
  });
}
