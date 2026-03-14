/**
 * Content visibility configuration.
 * Learner-facing loaders must filter by these statuses only.
 * Draft, editor_review, sme_review, legal_review, qa_review, needs_revision, retired = NOT visible.
 */

/** Statuses that make content visible to learners */
export const LEARNER_VISIBLE_STATUSES = ["approved", "published"] as const;

export type LearnerVisibleStatus = (typeof LEARNER_VISIBLE_STATUSES)[number];

/** Column name for track linkage on questions table (schema uses exam_track_id, NOT track_id) */
export const QUESTIONS_TRACK_COLUMN = "exam_track_id" as const;
