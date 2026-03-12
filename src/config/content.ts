/**
 * Content visibility configuration.
 * Learner-facing loaders must filter by these statuses only.
 * Draft, editor_review, sme_review, legal_review, qa_review, needs_revision, retired = NOT visible.
 */

/** Statuses that make content visible to learners */
export const LEARNER_VISIBLE_STATUSES = ["approved", "published"] as const;

export type LearnerVisibleStatus = (typeof LEARNER_VISIBLE_STATUSES)[number];
