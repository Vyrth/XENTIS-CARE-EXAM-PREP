"use client";

import { resolveSelectedTrack, type ResolvedTrack, type TrackOption } from "@/lib/ai/factory/resolve-track";

export interface TrackGuardProps {
  tracks: TrackOption[];
  selectedTrackId: string | undefined;
  selectedTrackSlug?: string | undefined;
  children: (resolved: ResolvedTrack) => React.ReactNode;
  /** Rendered when no valid track is selected */
  fallback?: React.ReactNode;
}

const DEFAULT_FALLBACK = (
  <p className="text-sm text-amber-600 dark:text-amber-400">
    Select a valid exam track to generate content.
  </p>
);

/**
 * Resolves the selected track and renders children only when valid.
 * Use to gate generation actions and show a message when track is missing.
 */
export function TrackGuard({
  tracks,
  selectedTrackId,
  selectedTrackSlug,
  children,
  fallback = DEFAULT_FALLBACK,
}: TrackGuardProps) {
  const resolved = resolveSelectedTrack(tracks, selectedTrackId, selectedTrackSlug);
  if (!resolved) return <>{fallback}</>;
  return <>{children(resolved)}</>;
}
