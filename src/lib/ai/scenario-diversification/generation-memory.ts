/**
 * Scenario Diversification - Generation Memory
 *
 * Per-shard/scope memory so newly generated items do not repeat templates.
 * Stores recent archetypes, stem openings, and complaint patterns.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { ScenarioArchetype } from "./archetypes";

const MAX_RECENT_ARCHETYPES = 50;
const MAX_RECENT_OPENINGS = 30;
const MAX_RECENT_COMPLAINTS = 30;

/** Build scope key for memory lookup */
export function buildScopeKey(
  trackId: string,
  systemId?: string | null,
  topicId?: string | null
): string {
  const parts = [trackId, systemId ?? "all", topicId ?? "all"];
  return parts.join(":");
}

export interface GenerationMemory {
  recentArchetypes: ScenarioArchetype[];
  recentStemOpenings: string[];
  recentComplaintPatterns: string[];
}

/** Load generation memory for scope */
export async function loadGenerationMemory(scopeKey: string): Promise<GenerationMemory> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { recentArchetypes: [], recentStemOpenings: [], recentComplaintPatterns: [] };
  }
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("shard_generation_memory")
      .select("recent_archetypes, recent_stem_openings, recent_complaint_patterns")
      .eq("scope_key", scopeKey)
      .maybeSingle();

    const raw = data as {
      recent_archetypes?: unknown;
      recent_stem_openings?: unknown;
      recent_complaint_patterns?: unknown;
    } | null;

    return {
      recentArchetypes: (Array.isArray(raw?.recent_archetypes) ? raw.recent_archetypes : []) as ScenarioArchetype[],
      recentStemOpenings: (Array.isArray(raw?.recent_stem_openings) ? raw.recent_stem_openings : []) as string[],
      recentComplaintPatterns: (Array.isArray(raw?.recent_complaint_patterns) ? raw.recent_complaint_patterns : []) as string[],
    };
  } catch {
    return { recentArchetypes: [], recentStemOpenings: [], recentComplaintPatterns: [] };
  }
}

/** Append archetype to memory and persist */
export async function appendToGenerationMemory(
  scopeKey: string,
  archetype: ScenarioArchetype
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const memory = await loadGenerationMemory(scopeKey);
    const newArchetypes = [archetype, ...memory.recentArchetypes].slice(0, MAX_RECENT_ARCHETYPES);
    const newOpenings = archetype.stem_opening
      ? [archetype.stem_opening, ...memory.recentStemOpenings.filter((o) => o !== archetype.stem_opening)].slice(0, MAX_RECENT_OPENINGS)
      : memory.recentStemOpenings;
    const newComplaints = archetype.presenting_complaint_pattern
      ? [
          archetype.presenting_complaint_pattern,
          ...memory.recentComplaintPatterns.filter((c) => c !== archetype.presenting_complaint_pattern),
        ].slice(0, MAX_RECENT_COMPLAINTS)
      : memory.recentComplaintPatterns;

    const supabase = createServiceClient();
    await supabase.from("shard_generation_memory").upsert(
      {
        scope_key: scopeKey,
        recent_archetypes: newArchetypes,
        recent_stem_openings: newOpenings,
        recent_complaint_patterns: newComplaints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "scope_key" }
    );
  } catch {
    // best-effort
  }
}
