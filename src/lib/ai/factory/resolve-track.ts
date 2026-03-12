/**
 * AI Content Factory - track resolution helper.
 * Single source of truth for resolving selected track from id, slug, or URL param.
 * Never allows form submission with display-only track text.
 * Canonical value: exam_tracks.id (UUID). All API payloads must use UUID.
 */

import type { ExamTrackSlug } from "./types";

/** Basic UUID format check - ensures we use exam_tracks.id, not slug */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isTrackIdUuid(value: string | undefined): boolean {
  return !!value?.trim() && UUID_REGEX.test(value.trim());
}

export interface ResolvedTrack {
  id: string;
  slug: ExamTrackSlug;
  name: string;
}

export type TrackOption = { id: string; slug: string; name: string };

const VALID_SLUGS: ExamTrackSlug[] = ["lvn", "rn", "fnp", "pmhnp"];

function normalizeSlug(slug: string | undefined): ExamTrackSlug | null {
  if (!slug?.trim()) return null;
  const lower = slug.trim().toLowerCase();
  if (VALID_SLUGS.includes(lower as ExamTrackSlug)) return lower as ExamTrackSlug;
  return null;
}

/**
 * Resolve selected track from tracks list, selectedTrackId, and optional slug fallback.
 * Supports URL param trackId (UUID) and fallback by slug for legacy URLs.
 * Returns { id, slug, name } or null if no valid track.
 */
export function resolveSelectedTrack(
  tracks: TrackOption[],
  selectedTrackId: string | undefined,
  selectedTrackSlug?: string | undefined
): ResolvedTrack | null {
  if (!tracks.length) return null;

  // 1. Resolve by ID (primary - UUID)
  const byId = selectedTrackId?.trim()
    ? tracks.find((t) => t.id === selectedTrackId.trim())
    : null;
  if (byId) {
    const slug = normalizeSlug(byId.slug) ?? "rn";
    return { id: byId.id, slug, name: byId.name };
  }

  // 2. Fallback by slug (legacy URLs with ?trackId=rn)
  const slug = normalizeSlug(selectedTrackSlug);
  if (slug) {
    const bySlug = tracks.find((t) => t.slug?.toLowerCase() === slug);
    if (bySlug) return { id: bySlug.id, slug, name: bySlug.name };
  }

  // 3. If selectedTrackId looks like a slug (not UUID), try to resolve
  const maybeSlug = selectedTrackId?.trim().toLowerCase();
  if (maybeSlug && VALID_SLUGS.includes(maybeSlug as ExamTrackSlug)) {
    const bySlug = tracks.find((t) => t.slug?.toLowerCase() === maybeSlug);
    if (bySlug) return { id: bySlug.id, slug: maybeSlug as ExamTrackSlug, name: bySlug.name };
  }

  return null;
}

/**
 * Resolve config to ensure trackId is always a valid exam_track UUID.
 * Use before any generate/save action. Returns config with trackId/trackSlug normalized, or null if no valid track.
 */
export function resolveConfigTrack<T extends { trackId?: string; trackSlug?: string }>(
  config: T,
  tracks: TrackOption[]
): (T & { trackId: string; trackSlug: ExamTrackSlug }) | null {
  const resolved = resolveSelectedTrack(tracks, config.trackId, config.trackSlug);
  if (!resolved) return null;
  return { ...config, trackId: resolved.id, trackSlug: resolved.slug };
}

export type ResolveTrackSelectionSource =
  | { source: "form"; trackId: string }
  | { source: "url"; trackId: string }
  | { source: "preset"; trackSlug: ExamTrackSlug }
  | { source: "roadmap"; trackId: string };

/**
 * Resolve track selection from multiple sources.
 * Canonical: always returns exam_tracks.id (UUID). Use for generation payload and validation.
 */
export function resolveTrackSelection(
  tracks: TrackOption[],
  sources: {
    formTrackId?: string;
    urlTrackId?: string;
    presetTrackSlug?: ExamTrackSlug;
    roadmapTrackId?: string;
  }
): { resolved: ResolvedTrack; source: ResolveTrackSelectionSource } | null {
  if (!tracks.length) return null;

  // 1. Form value (dropdown selection) - primary
  if (sources.formTrackId?.trim()) {
    const byId = tracks.find((t) => t.id === sources.formTrackId!.trim());
    if (byId) {
      const slug = normalizeSlug(byId.slug) ?? "rn";
      return {
        resolved: { id: byId.id, slug, name: byId.name },
        source: { source: "form", trackId: byId.id },
      };
    }
  }

  // 2. URL param
  if (sources.urlTrackId?.trim()) {
    const byId = tracks.find((t) => t.id === sources.urlTrackId!.trim());
    if (byId) {
      const slug = normalizeSlug(byId.slug) ?? "rn";
      return {
        resolved: { id: byId.id, slug, name: byId.name },
        source: { source: "url", trackId: byId.id },
      };
    }
    const maybeSlug = sources.urlTrackId!.trim().toLowerCase();
    if (VALID_SLUGS.includes(maybeSlug as ExamTrackSlug)) {
      const bySlug = tracks.find((t) => t.slug?.toLowerCase() === maybeSlug);
      if (bySlug) {
        return {
          resolved: { id: bySlug.id, slug: maybeSlug as ExamTrackSlug, name: bySlug.name },
          source: { source: "url", trackId: bySlug.id },
        };
      }
    }
  }

  // 3. Preset slug
  if (sources.presetTrackSlug) {
    const bySlug = tracks.find((t) => t.slug?.toLowerCase() === sources.presetTrackSlug);
    if (bySlug) {
      return {
        resolved: { id: bySlug.id, slug: sources.presetTrackSlug, name: bySlug.name },
        source: { source: "preset", trackSlug: sources.presetTrackSlug },
      };
    }
  }

  // 4. Roadmap card
  if (sources.roadmapTrackId?.trim()) {
    const byId = tracks.find((t) => t.id === sources.roadmapTrackId!.trim());
    if (byId) {
      const slug = normalizeSlug(byId.slug) ?? "rn";
      return {
        resolved: { id: byId.id, slug, name: byId.name },
        source: { source: "roadmap", trackId: byId.id },
      };
    }
  }

  return null;
}
