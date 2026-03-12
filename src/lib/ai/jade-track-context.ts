/**
 * Jade Tutor Track Context - strict track constraint for all AI actions.
 * Resolves the signed-in user's primary track and enforces track-specific tutoring.
 * Prevents cross-track leakage (e.g., RN users must not receive FNP-style explanations).
 */

import { getPrimaryTrack } from "@/lib/auth/track";
import type { TrackSlug } from "@/data/mock/types";

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Strict track-specific instruction for prompts - prevents cross-track leakage */
export const TRACK_STRICT_INSTRUCTION: Record<ExamTrack, string> = {
  lvn: `CRITICAL: You are tutoring for the LVN/LPN exam ONLY. Use simple, foundational language. Focus on basic nursing care, safety, vital signs, when to report. Do NOT include RN-level scope, FNP diagnosis/management, or PMHNP psychopharmacology. Keep explanations appropriate for LVN scope.`,
  rn: `CRITICAL: You are tutoring for the RN (NCLEX-RN) exam ONLY. Focus on safety, prioritization, delegation, scope of practice. Do NOT include FNP primary-care diagnosis/management or PMHNP psychopharmacology depth. RN-level explanations only.`,
  fnp: `CRITICAL: You are tutoring for the FNP (primary care NP) exam ONLY. Focus on diagnosis, management, first-line treatments, red flags, differentials, when to refer. Do NOT use RN delegation language or PMHNP psychiatric depth. Primary-care/outpatient board focus.`,
  pmhnp: `CRITICAL: You are tutoring for the PMHNP (psychiatric NP) exam ONLY. Focus on DSM criteria, psychopharmacology, safety (suicide, violence), therapeutic communication. Do NOT use RN or FNP general-medicine framing. Psych-focused explanations only.`,
};

/**
 * Resolve the user's primary track for Jade Tutor.
 * Requires authenticated user. Returns null if no user or no track.
 */
export async function resolveTrackForJade(userId: string | null): Promise<{
  track: ExamTrack;
  trackName: string;
} | null> {
  if (!userId) return null;

  const primary = await getPrimaryTrack(userId);
  if (!primary?.trackId || !primary?.trackSlug) return null;

  const track = primary.trackSlug as ExamTrack;
  if (!["lvn", "rn", "fnp", "pmhnp"].includes(track)) return null;

  const trackName = TRACK_NAMES[track];

  if (process.env.NODE_ENV === "development") {
    console.log("[Jade Tutor] Resolved track for user", userId.slice(0, 8) + "...", {
      track,
      trackName,
    });
  }

  return { track, trackName };
}

/**
 * Enforce track context: use primary track, reject/correct client-provided track mismatch.
 * Returns { track, trackName } or null if auth required and no user.
 */
export async function enforceJadeTrackContext(
  userId: string | null,
  clientTrack?: string | null,
  action?: string
): Promise<{ track: ExamTrack; trackName: string } | null> {
  const resolved = await resolveTrackForJade(userId);
  if (!resolved) return null;

  const { track, trackName } = resolved;

  if (clientTrack && clientTrack !== track) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Jade Tutor] Track mismatch detected:",
        { action, clientTrack, resolvedTrack: track },
        "- Using primary track (corrected)"
      );
    }
  }

  return { track, trackName };
}

/**
 * Append strict track instruction to a system prompt.
 */
export function appendTrackStrictInstruction(systemPrompt: string, track: ExamTrack): string {
  return `${systemPrompt}\n\n${TRACK_STRICT_INSTRUCTION[track]}`;
}
