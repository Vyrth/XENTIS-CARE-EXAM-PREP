/**
 * Track-specific display names and copy for High-Yield and other UI.
 * Ensures RN users see "RN exam", FNP users see "FNP exam", etc.
 */

import type { TrackSlug } from "@/data/mock/types";
import { EXAM_TRACKS } from "@/config/auth";

const TRACK_DISPLAY: Record<TrackSlug, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Human-readable track name (e.g. "LVN/LPN", "RN", "FNP", "PMHNP") */
export function getTrackDisplayName(track: TrackSlug): string {
  return TRACK_DISPLAY[track] ?? track.toUpperCase();
}

/** "for the RN exam" / "for the FNP exam" - track-specific phrase */
export function getExamPhrase(track: TrackSlug): string {
  return `for the ${getTrackDisplayName(track)} exam`;
}

/** "RN track" / "FNP track" */
export function getTrackPhrase(track: TrackSlug): string {
  return `${getTrackDisplayName(track)} track`;
}
