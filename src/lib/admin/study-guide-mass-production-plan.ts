/**
 * Study Guide Mass Production Plan
 *
 * Targets by track. Each guide: title, sections, high yield points,
 * common confusions, clinical pearls, quick review bullets.
 * Chunkable for RAG retrieval. Save as draft.
 */

export type ExamTrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

/** Study guide count targets by track */
export const STUDY_GUIDE_TARGETS: Record<ExamTrackSlug, number> = {
  rn: 150,
  fnp: 120,
  pmhnp: 80,
  lvn: 60,
};

/** Required section elements for mass-produced guides (enforced in prompts) */
export const REQUIRED_SECTION_ELEMENTS = [
  "keyTakeaways",
  "commonConfusions",
  "clinicalPearls",
  "quickReviewBullets",
] as const;
