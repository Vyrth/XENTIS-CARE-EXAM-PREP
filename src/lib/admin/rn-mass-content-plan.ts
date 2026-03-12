/**
 * RN Mass Content Generation Plan
 *
 * Target: 2000 RN questions with balanced system coverage and question type mix.
 * All content saved as draft. Batch generation uses topic diversity from topics table.
 * Duplicate detection: exact stem match (ilike) + optional fuzzy similarity.
 */

export type RNSystemSlug =
  | "cardiovascular"
  | "respiratory"
  | "neurological"
  | "endocrine"
  | "renal"
  | "gastrointestinal"
  | "infectious-disease"
  | "pharmacology"
  | "pediatrics"
  | "ob-gyn"
  | "musculoskeletal"
  | "dermatology"
  | "hematology"
  | "safety-prioritization-delegation";

/** System slug to display name */
export const RN_SYSTEM_NAMES: Record<RNSystemSlug, string> = {
  cardiovascular: "Cardiology",
  respiratory: "Respiratory",
  neurological: "Neurology",
  endocrine: "Endocrine",
  renal: "Renal",
  gastrointestinal: "Gastrointestinal",
  "infectious-disease": "Infectious Disease",
  pharmacology: "Pharmacology",
  pediatrics: "Pediatrics",
  "ob-gyn": "OB/GYN",
  musculoskeletal: "Musculoskeletal",
  dermatology: "Dermatology",
  hematology: "Hematology",
  "safety-prioritization-delegation": "Safety/Prioritization/Delegation",
};

/** Target question count per system (total 2000) */
export const RN_SYSTEM_TARGETS: Record<RNSystemSlug, number> = {
  cardiovascular: 250,
  respiratory: 200,
  neurological: 150,
  endocrine: 150,
  renal: 150,
  gastrointestinal: 150,
  "infectious-disease": 150,
  pharmacology: 200,
  pediatrics: 200,
  "ob-gyn": 150,
  musculoskeletal: 100,
  dermatology: 100,
  hematology: 100,
  "safety-prioritization-delegation": 100,
};

/** Question type mix (percent of total) */
export const RN_QUESTION_TYPE_MIX = {
  single_best_answer: 60,
  multiple_response: 20,
  select_n: 10,
  case_study: 5,
  dosage_calc: 5,
} as const;

/** Batch generation waves */
export const RN_GENERATION_WAVES = [
  { wave: 1, targetCount: 200, label: "Wave 1" },
  { wave: 2, targetCount: 400, label: "Wave 2" },
  { wave: 3, targetCount: 600, label: "Wave 3" },
  { wave: 4, targetCount: 800, label: "Wave 4" },
] as const;

/** Required fields per question (NCLEX style) */
export const RN_QUESTION_REQUIREMENTS = [
  "NCLEX-style stem",
  "Clinical scenario",
  "Answer options",
  "Correct answer",
  "Rationale",
  "Distractor rationales",
  "Topic linkage",
] as const;

/** Board focus for RN generation */
export const RN_BOARD_FOCUS =
  "NCLEX prioritization, safety, delegation, clinical scenarios, evidence-based practice";

/** Compute question type distribution for a wave (counts per type) */
export function computeWaveQuestionTypeCounts(waveTargetCount: number): Record<string, number> {
  const mix = RN_QUESTION_TYPE_MIX;
  return {
    single_best_answer: Math.round(waveTargetCount * (mix.single_best_answer / 100)),
    multiple_response: Math.round(waveTargetCount * (mix.multiple_response / 100)),
    select_n: Math.round(waveTargetCount * (mix.select_n / 100)),
    case_study: Math.round(waveTargetCount * (mix.case_study / 100)),
    dosage_calc: Math.round(waveTargetCount * (mix.dosage_calc / 100)),
  };
}

/** Compute system target for a wave (proportional to RN_SYSTEM_TARGETS) */
export function computeWaveSystemTargets(waveTargetCount: number): Record<RNSystemSlug, number> {
  const total = 2000;
  const result = {} as Record<RNSystemSlug, number>;
  for (const [slug, target] of Object.entries(RN_SYSTEM_TARGETS) as [RNSystemSlug, number][]) {
    result[slug] = Math.round((target / total) * waveTargetCount);
  }
  return result;
}
