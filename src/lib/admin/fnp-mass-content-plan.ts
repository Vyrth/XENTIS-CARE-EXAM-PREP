/**
 * FNP Mass Content Generation Plan
 *
 * Target: 1500 FNP questions with balanced system coverage and primary care focus.
 * All content saved as draft. Batch generation uses topic diversity from topics table.
 * Outpatient-focused prompts, diagnosis, screening, treatment algorithms.
 */

export type FNPSystemSlug =
  | "cardiovascular"
  | "endocrine"
  | "respiratory"
  | "gastrointestinal"
  | "renal"
  | "dermatology"
  | "musculoskeletal"
  | "ob-gyn"
  | "pediatrics"
  | "psychiatric"
  | "preventive-care"
  | "infectious-disease";

/** System slug to display name */
export const FNP_SYSTEM_NAMES: Record<FNPSystemSlug, string> = {
  cardiovascular: "Cardiology",
  endocrine: "Endocrine",
  respiratory: "Respiratory",
  gastrointestinal: "GI",
  renal: "Renal",
  dermatology: "Dermatology",
  musculoskeletal: "Musculoskeletal",
  "ob-gyn": "OB/GYN",
  pediatrics: "Pediatrics",
  psychiatric: "Psychiatry",
  "preventive-care": "Preventive Care",
  "infectious-disease": "Infectious Disease",
};

/** Target question count per system (total 1500) */
export const FNP_SYSTEM_TARGETS: Record<FNPSystemSlug, number> = {
  cardiovascular: 180,
  endocrine: 180,
  respiratory: 120,
  gastrointestinal: 120,
  renal: 100,
  dermatology: 100,
  musculoskeletal: 120,
  "ob-gyn": 150,
  pediatrics: 150,
  psychiatric: 120,
  "preventive-care": 120,
  "infectious-disease": 140,
};

/** Question type mix (percent of total) */
export const FNP_QUESTION_TYPE_MIX = {
  single_best_answer: 65,
  multiple_response: 15,
  case_study: 10,
  select_n: 5,
  chart_table_exhibit: 5,
} as const;

/** Batch generation waves */
export const FNP_GENERATION_WAVES = [
  { wave: 1, targetCount: 150, label: "Wave 1" },
  { wave: 2, targetCount: 300, label: "Wave 2" },
  { wave: 3, targetCount: 450, label: "Wave 3" },
  { wave: 4, targetCount: 600, label: "Wave 4" },
] as const;

/** FNP question emphasis (outpatient-focused) */
export const FNP_QUESTION_EMPHASIS = [
  "Outpatient management",
  "Diagnosis",
  "Screening",
  "Treatment algorithms",
  "Medication selection",
  "Follow-up planning",
] as const;

/** Outpatient-focused board prompt for FNP generation */
export const FNP_BOARD_FOCUS =
  "Primary care outpatient management, diagnosis, screening guidelines, treatment algorithms, first-line medication selection, follow-up planning, when to refer, evidence-based guidelines, USPSTF screening, preventive care.";

/** Topic diversity guardrail: minimum topics per system for batch generation */
export const FNP_MIN_TOPICS_PER_SYSTEM = 2;

/** Compute question type distribution for a wave */
export function computeFNPWaveQuestionTypeCounts(waveTargetCount: number): Record<string, number> {
  const mix = FNP_QUESTION_TYPE_MIX;
  return {
    single_best_answer: Math.round(waveTargetCount * (mix.single_best_answer / 100)),
    multiple_response: Math.round(waveTargetCount * (mix.multiple_response / 100)),
    case_study: Math.round(waveTargetCount * (mix.case_study / 100)),
    select_n: Math.round(waveTargetCount * (mix.select_n / 100)),
    chart_table_exhibit: Math.round(waveTargetCount * (mix.chart_table_exhibit / 100)),
  };
}

/** Compute system target for a wave (proportional to FNP_SYSTEM_TARGETS) */
export function computeFNPWaveSystemTargets(waveTargetCount: number): Record<FNPSystemSlug, number> {
  const total = 1500;
  const result = {} as Record<FNPSystemSlug, number>;
  for (const [slug, target] of Object.entries(FNP_SYSTEM_TARGETS) as [FNPSystemSlug, number][]) {
    result[slug] = Math.round((target / total) * waveTargetCount);
  }
  return result;
}
