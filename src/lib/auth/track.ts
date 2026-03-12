/**
 * Canonical Track Resolver - single source of truth for learner exam track.
 *
 * Resolution order:
 * 1. profile.primary_exam_track_id (from profiles table)
 * 2. null when not set (no fallback to other tracks)
 *
 * All learner pages must use getPrimaryTrack() or getLearnerTrackContext().
 * No duplicate track state in query params, local state, or context unless
 * explicitly synchronized with this resolver.
 */

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import type { TrackSlug } from "@/data/mock/types";

export type PrimaryTrack = {
  trackId: string;
  trackSlug: TrackSlug;
};

const DEFAULT_TRACK_SLUG: TrackSlug = "rn";

/** Display names for empty states and UI */
export const TRACK_DISPLAY_NAMES: Record<TrackSlug, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/**
 * Resolve primary_exam_track_id (UUID) to track slug via exam_tracks table.
 * Uses service client when available to ensure track lookup succeeds.
 */
async function resolveTrackSlugFromId(trackId: string | null): Promise<TrackSlug | null> {
  if (!trackId) return null;

  const { createServiceClient } = await import("@/lib/supabase/service");
  const { isSupabaseServiceRoleConfigured } = await import("@/lib/supabase/env");

  if (isSupabaseServiceRoleConfigured()) {
    const serviceSupabase = createServiceClient();
    const { data } = await serviceSupabase
      .from("exam_tracks")
      .select("slug")
      .eq("id", trackId)
      .single();
    const slug = data?.slug as TrackSlug | undefined;
    if (slug && ["lvn", "rn", "fnp", "pmhnp"].includes(slug)) {
      return slug;
    }
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("slug")
    .eq("id", trackId)
    .single();
  const slug = data?.slug as TrackSlug | undefined;
  if (slug && ["lvn", "rn", "fnp", "pmhnp"].includes(slug)) {
    return slug;
  }
  return null;
}

/**
 * Get the current user's primary exam track.
 * Use in Server Components and Route Handlers.
 * Returns null when no track is set (no fallback to other tracks).
 */
export async function getPrimaryTrack(userId: string | null): Promise<PrimaryTrack | null> {
  if (!userId) return null;
  const profile = await getProfile(userId);
  const trackId = profile?.primary_exam_track_id ?? null;
  if (!trackId) return null;

  const trackSlug = await resolveTrackSlugFromId(trackId);
  if (!trackSlug) return null;

  if (process.env.NODE_ENV === "development") {
    console.log("[track] resolved primary track for user", userId.slice(0, 8) + "...", {
      trackId,
      trackSlug,
    });
  }

  return { trackId, trackSlug };
}

/**
 * Get track display name for empty states and UI.
 */
export function getTrackDisplayName(trackSlug: TrackSlug | null): string {
  if (!trackSlug) return "your track";
  return TRACK_DISPLAY_NAMES[trackSlug] ?? trackSlug.toUpperCase();
}

/**
 * Learner track context - use in learner pages. Returns track or null.
 * When null, show onboarding prompt or redirect.
 */
export async function getLearnerTrackContext(
  userId: string | null
): Promise<PrimaryTrack | null> {
  return getPrimaryTrack(userId);
}

/**
 * Get primary track or return default. Use when track is required (e.g. after onboarding).
 * Prefer getPrimaryTrack + null check for learner pages to avoid accidental fallback.
 */
export async function requirePrimaryTrack(userId: string): Promise<PrimaryTrack> {
  const track = await getPrimaryTrack(userId);
  if (!track || !track.trackId) {
    return { trackId: "", trackSlug: DEFAULT_TRACK_SLUG };
  }
  return track;
}

/**
 * Clear orphaned primary_exam_track_id when it doesn't exist in exam_tracks (e.g. after migration).
 * Call before redirecting to onboarding so layout will also redirect on next load.
 */
export async function clearOrphanedPrimaryTrack(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  const trackId = profile?.primary_exam_track_id;
  if (!trackId) return;

  const slug = await resolveTrackSlugFromId(trackId);
  if (slug) return; // Track exists, not orphaned

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      primary_exam_track_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (process.env.NODE_ENV === "development") {
    console.log("[track] cleared orphaned primary_exam_track_id for user", userId.slice(0, 8) + "...");
  }
}

/**
 * Filter items by track. Use for systems, topics, guides, etc.
 */
export function filterByTrack<T>(
  items: T[],
  track: TrackSlug,
  getTrack: (item: T) => TrackSlug | undefined
): T[] {
  return items.filter((item) => {
    const itemTrack = getTrack(item);
    return itemTrack === track;
  });
}

/**
 * Route guard: ensure track param matches user's primary track.
 * Redirect to correct track if mismatch. Redirects to onboarding when no track.
 */
export async function guardTrackParam(
  userId: string | null,
  paramTrack: string,
  basePath: "practice" | "pre-practice"
): Promise<{ redirect: true; path: string } | { redirect: false; trackSlug: TrackSlug }> {
  const primary = await getPrimaryTrack(userId);
  if (!primary) {
    return { redirect: true, path: "/onboarding" };
  }
  const trackSlug = primary.trackSlug;
  const normalized = paramTrack?.toLowerCase();
  const validSlugs = ["lvn", "rn", "fnp", "pmhnp"] as const;
  if (!validSlugs.includes(normalized as (typeof validSlugs)[number])) {
    return { redirect: true, path: `/${basePath}/${trackSlug}` };
  }
  if (normalized !== trackSlug) {
    if (process.env.NODE_ENV === "development") {
      console.log("[track] guard redirect: param", paramTrack, "!= primary", trackSlug);
    }
    return { redirect: true, path: `/${basePath}/${trackSlug}` };
  }
  return { redirect: false, trackSlug };
}
