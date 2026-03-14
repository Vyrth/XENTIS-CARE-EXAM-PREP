/**
 * Exam thresholds - central config for question count requirements.
 * Practice mode allows launch during content ramp-up; formal exams keep stricter limits.
 */

/** Minimum questions to start a practice system exam (content ramp-up friendly) */
export const SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS = 5;

/** Ideal minimum for full practice session (show warning when below) */
export const SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS = 50;

/** Minimum for formal/graded/readiness exams (stricter) */
export const SYSTEM_EXAM_FORMAL_MIN_QUESTIONS = 50;

/** @deprecated Use SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS for launch gate, SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS for ideal */
export const SYSTEM_EXAM_MIN_QUESTIONS = SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS;
