/**
 * PMHNP Mass Content Generation Plan
 *
 * Target: 1000 PMHNP questions with psychiatry-focused coverage.
 * All content saved as draft. Emphasizes DSM-5, psychopharmacology, therapy, risk assessment.
 */

export type PMHNPCategorySlug =
  | "psychiatric-disorders"
  | "psychopharmacology"
  | "therapy-modalities"
  | "substance-use"
  | "child-adolescent-psychiatry"
  | "sleep-disorders"
  | "crisis-management";

/** Category slug to display name */
export const PMHNP_CATEGORY_NAMES: Record<PMHNPCategorySlug, string> = {
  "psychiatric-disorders": "Psychiatric Disorders",
  psychopharmacology: "Psychopharmacology",
  "therapy-modalities": "Therapy Modalities",
  "substance-use": "Substance Use",
  "child-adolescent-psychiatry": "Child & Adolescent Psychiatry",
  "sleep-disorders": "Sleep Disorders",
  "crisis-management": "Crisis Management",
};

/** Target question count per category (total 1000) */
export const PMHNP_CATEGORY_TARGETS: Record<PMHNPCategorySlug, number> = {
  "psychiatric-disorders": 350,
  psychopharmacology: 300,
  "therapy-modalities": 100,
  "substance-use": 100,
  "child-adolescent-psychiatry": 80,
  "sleep-disorders": 40,
  "crisis-management": 30,
};

/** Question type mix (percent of total) */
export const PMHNP_QUESTION_TYPE_MIX = {
  single_best_answer: 70,
  case_study: 15,
  multiple_response: 10,
  select_n: 5,
} as const;

/** Batch generation waves */
export const PMHNP_GENERATION_WAVES = [
  { wave: 1, targetCount: 100, label: "Wave 1" },
  { wave: 2, targetCount: 200, label: "Wave 2" },
  { wave: 3, targetCount: 300, label: "Wave 3" },
  { wave: 4, targetCount: 400, label: "Wave 4" },
] as const;

/** PMHNP question emphasis */
export const PMHNP_QUESTION_EMPHASIS = [
  "DSM-5 diagnostic distinctions",
  "Medication mechanisms",
  "Therapy modalities",
  "Risk assessment",
  "Suicidality evaluation",
  "Psychiatric emergencies",
] as const;

/** Psychiatry-focused board prompt (DSM-5, psychopharm, therapy, risk) */
export const PMHNP_BOARD_FOCUS =
  "DSM-5 diagnostic distinctions, medication mechanisms and psychopharmacology, therapy modalities (CBT, DBT, IPT, psychodynamic), risk assessment and suicidality evaluation, psychiatric emergencies, safety (suicide, violence, agitation).";

/** Psychopharmacology-specific prompt emphasis */
export const PMHNP_PSYCHOPHARM_FOCUS =
  "Medication mechanisms, dosing, contraindications, drug interactions, side effects, black box warnings, washout periods, augmentation strategies, treatment-resistant depression.";

/** Therapy modalities-specific prompt emphasis */
export const PMHNP_THERAPY_FOCUS =
  "CBT, DBT, IPT, psychodynamic therapy, motivational interviewing, exposure therapy, behavioral activation. Indications, techniques, when to use each modality.";

/** Compute question type distribution for a wave */
export function computePMHNPWaveQuestionTypeCounts(waveTargetCount: number): Record<string, number> {
  const mix = PMHNP_QUESTION_TYPE_MIX;
  return {
    single_best_answer: Math.round(waveTargetCount * (mix.single_best_answer / 100)),
    case_study: Math.round(waveTargetCount * (mix.case_study / 100)),
    multiple_response: Math.round(waveTargetCount * (mix.multiple_response / 100)),
    select_n: Math.round(waveTargetCount * (mix.select_n / 100)),
  };
}

/** Compute category target for a wave */
export function computePMHNPWaveCategoryTargets(waveTargetCount: number): Record<PMHNPCategorySlug, number> {
  const total = 1000;
  const result = {} as Record<PMHNPCategorySlug, number>;
  for (const [slug, target] of Object.entries(PMHNP_CATEGORY_TARGETS) as [PMHNPCategorySlug, number][]) {
    result[slug] = Math.round((target / total) * waveTargetCount);
  }
  return result;
}
