/**
 * Readiness engine configuration - configurable formulas and constants
 * Adjust weights and thresholds for product tuning
 */

/** Readiness band thresholds (0-100) */
export const READINESS_BANDS = {
  not_ready: { min: 0, max: 49, label: "Not Ready", color: "red" },
  developing: { min: 50, max: 69, label: "Developing", color: "amber" },
  ready: { min: 70, max: 84, label: "Ready", color: "emerald" },
  exam_ready: { min: 85, max: 100, label: "Exam Ready", color: "green" },
} as const;

/** Target pass threshold */
export const TARGET_READINESS = 80;

/** Weights for composite readiness score (must sum to 1) */
export const READINESS_WEIGHTS = {
  questionAccuracy: 0.25,
  domainPerformance: 0.20,
  systemPerformance: 0.20,
  skillPerformance: 0.10,
  systemExamPerformance: 0.10,
  prePracticeExamPerformance: 0.05,
  studyGuideCompletion: 0.04,
  videoCompletion: 0.03,
  confidenceCalibration: 0.02,
  consistencyOverTime: 0.01,
} as const;

/** Mastery threshold for "at target" */
export const MASTERY_TARGET_PERCENT = 80;

/** Minimum questions for mastery calculation */
export const MIN_QUESTIONS_FOR_MASTERY = 5;

/** System exam unlock: min study progression (e.g. questions answered in that system) */
export const SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS = 50;

/** Confidence calibration: tolerance for "calibrated" (accuracy within ±X% of confidence) */
export const CONFIDENCE_CALIBRATION_TOLERANCE = 15;

/** Recommendation priority thresholds */
export const RECOMMENDATION_THRESHOLDS = {
  weakSystemPercent: 65,
  weakDomainPercent: 65,
  weakSkillPercent: 60,
  weakItemTypePercent: 60,
  overconfidentRange: "0-50", // confidence range where accuracy is much lower
} as const;
