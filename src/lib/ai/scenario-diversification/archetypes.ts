/**
 * Scenario Diversification - Archetype Constants
 *
 * Enforces diversity across:
 * - age band
 * - sex (where clinically relevant)
 * - care setting
 * - phase (assessment, diagnosis, management, etc.)
 * - acuity level
 * - pharmacology vs non-pharmacology
 */

export const AGE_BANDS = [
  "pediatric",
  "adolescent",
  "young_adult",
  "middle_aged",
  "older_adult",
  "geriatric",
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export const SEX_OPTIONS = ["male", "female", "unspecified"] as const;

export type SexOption = (typeof SEX_OPTIONS)[number];

export const CARE_SETTINGS = [
  "clinic",
  "ed",
  "inpatient",
  "telehealth",
  "follow_up",
  "home_health",
  "school",
  "long_term_care",
] as const;

export type CareSetting = (typeof CARE_SETTINGS)[number];

export const CLINICAL_PHASES = [
  "assessment",
  "diagnosis",
  "management",
  "complication",
  "prevention",
  "patient_education",
] as const;

export type ClinicalPhase = (typeof CLINICAL_PHASES)[number];

export const ACUITY_LEVELS = ["low", "moderate", "high", "critical"] as const;

export type AcuityLevel = (typeof ACUITY_LEVELS)[number];

export const PHARMACOLOGY_ANGLE = ["pharmacology", "non_pharmacology", "mixed"] as const;

export type PharmacologyAngle = (typeof PHARMACOLOGY_ANGLE)[number];

export interface ScenarioArchetype {
  age_band?: AgeBand;
  sex?: SexOption;
  care_setting?: CareSetting;
  phase?: ClinicalPhase;
  acuity?: AcuityLevel;
  pharmacology_angle?: PharmacologyAngle;
  /** First ~80 chars of stem (for detecting repeated openings) */
  stem_opening?: string;
  /** Chief complaint pattern (normalized) */
  presenting_complaint_pattern?: string;
}
