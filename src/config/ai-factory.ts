/**
 * Xentis AI Factory – central config for workflow constants, review lanes,
 * and board generation profiles. Does not replace existing configs; centralizes
 * these workflow and generation settings in one place.
 */

// ─── Auto-publish & quality thresholds ───────────────────────────────────────

/** Minimum confidence (0–100) for high-confidence auto-publish. */
export const AUTO_PUBLISH_CONFIDENCE_MIN = 85;

/** Max allowed similarity (0–1) to existing content; above = duplicate / route to review. */
export const DUPLICATE_SIMILARITY_MAX = 0.82;

// ─── System exam practice (content ramp-up) ────────────────────────────────────

/** Minimum questions required to start a practice system exam. */
export const SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS = 5;

/** Ideal minimum questions for a full practice session (warn when below). */
export const SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS = 50;

// ─── Review lanes & generation profiles ──────────────────────────────────────

/** Lane to which content is routed when it does not auto-publish. */
export type ReviewLane =
  | "editorial"
  | "sme"
  | "legal"
  | "qa"
  | "needs_revision"
  | "auto_publish_candidate";

/** Board / exam style used for AI generation (prompts, style, evidence). */
export type GenerationProfile =
  | "NCLEX_RN"
  | "NCLEX_LVN"
  | "FNP_BOARD"
  | "PMHNP_BOARD"
  | "USMLE_STYLE";

export interface BoardGenerationProfileConfig {
  id: GenerationProfile;
  name: string;
  description?: string;
}

/** Map exam track slug to generation profile for prompts and metadata. */
export function trackSlugToGenerationProfile(trackSlug: string): GenerationProfile {
  const s = (trackSlug ?? "").toLowerCase();
  if (s === "rn") return "NCLEX_RN";
  if (s === "lvn") return "NCLEX_LVN";
  if (s === "fnp") return "FNP_BOARD";
  if (s === "pmhnp") return "PMHNP_BOARD";
  return "USMLE_STYLE";
}

/** Starter config for each board generation profile (RN, LVN, FNP, PMHNP, USMLE-style). */
export const BOARD_GENERATION_PROFILES: Record<
  GenerationProfile,
  BoardGenerationProfileConfig
> = {
  NCLEX_RN: {
    id: "NCLEX_RN",
    name: "NCLEX-RN",
    description:
      "NCLEX-style item writing: scenario-based stems, single best answer, nursing process, safety and prioritization.",
  },
  NCLEX_LVN: {
    id: "NCLEX_LVN",
    name: "NCLEX-PN / LVN/LPN",
    description:
      "LVN/LPN scope: data collection, reporting, basic care, medication administration; when to notify RN or provider.",
  },
  FNP_BOARD: {
    id: "FNP_BOARD",
    name: "FNP Certification (ANCC/AANP)",
    description:
      "Primary care management: diagnosis, workup, first-line treatment, screening, guideline-based language.",
  },
  PMHNP_BOARD: {
    id: "PMHNP_BOARD",
    name: "PMHNP Certification (ANCC)",
    description:
      "Psychiatric diagnosis and treatment: DSM-aligned items, psychopharmacology, risk assessment, therapy modality.",
  },
  USMLE_STYLE: {
    id: "USMLE_STYLE",
    name: "USMLE-style",
    description:
      "USMLE-style items: clinical vignettes, basic science integration, Step 1/2 CK-style single best answer and NBME-style formatting.",
  },
};
