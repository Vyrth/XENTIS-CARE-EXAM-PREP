/**
 * LVN/LPN Mass Content Generation Plan
 *
 * Target: 800 LVN questions with fundamentals and scope-of-practice focus.
 * All content saved as draft. Emphasizes safe scope, basic procedures, delegation.
 */

export type LVNCategorySlug =
  | "fundamentals"
  | "pharmacology-basics"
  | "medical-surgical"
  | "pediatrics-basics"
  | "ob-basics"
  | "safety-infection-control";

/** Category slug to display name */
export const LVN_CATEGORY_NAMES: Record<LVNCategorySlug, string> = {
  fundamentals: "Fundamentals",
  "pharmacology-basics": "Pharmacology Basics",
  "medical-surgical": "Medical Surgical",
  "pediatrics-basics": "Pediatrics Basics",
  "ob-basics": "OB Basics",
  "safety-infection-control": "Safety/Infection Control",
};

/** Target question count per category (total 800) */
export const LVN_CATEGORY_TARGETS: Record<LVNCategorySlug, number> = {
  fundamentals: 200,
  "pharmacology-basics": 150,
  "medical-surgical": 200,
  "pediatrics-basics": 100,
  "ob-basics": 80,
  "safety-infection-control": 70,
};

/** Question type mix (percent of total) */
export const LVN_QUESTION_TYPE_MIX = {
  single_best_answer: 75,
  multiple_response: 15,
  dosage_calc: 10,
} as const;

/** Batch generation waves */
export const LVN_GENERATION_WAVES = [
  { wave: 1, targetCount: 100, label: "Wave 1" },
  { wave: 2, targetCount: 200, label: "Wave 2" },
  { wave: 3, targetCount: 250, label: "Wave 3" },
  { wave: 4, targetCount: 250, label: "Wave 4" },
] as const;

/** LVN question emphasis */
export const LVN_QUESTION_EMPHASIS = [
  "Safe scope of practice",
  "Basic nursing procedures",
  "Medication administration",
  "Documentation",
  "Patient safety",
  "Delegation",
] as const;

/** Scope-of-practice board prompt for LVN generation */
export const LVN_BOARD_FOCUS =
  "LVN/LPN safe scope of practice, basic nursing procedures, medication administration (rights, routes), documentation, patient safety, delegation (what LVN can/cannot do), when to report to RN or provider. Keep within LVN scope.";

/** Scope-of-practice guardrails: activities LVNs perform vs must delegate */
export const LVN_SCOPE_GUARDRAILS = {
  withinScope: [
    "Vital signs, ADLs, basic hygiene",
    "Medication administration (oral, topical, IM, SQ per facility policy)",
    "Wound care (uncomplicated, stable)",
    "Feeding, ambulation, positioning",
    "Data collection and reporting",
    "Documentation of care provided",
    "Reinforcing patient teaching",
  ],
  delegateToRN: [
    "Initial assessment and nursing diagnosis",
    "IV push medications, blood administration",
    "Central line care",
    "Complex wound care, unstable patients",
    "Care planning and evaluation",
    "Discharge teaching (initial)",
  ],
  reportImmediately: [
    "Change in patient condition",
    "Abnormal vital signs",
    "Patient refusal, fall, incident",
    "Medication error or adverse reaction",
    "Unclear or questionable order",
  ],
} as const;

/** Compute question type distribution for a wave */
export function computeLVNWaveQuestionTypeCounts(waveTargetCount: number): Record<string, number> {
  const mix = LVN_QUESTION_TYPE_MIX;
  return {
    single_best_answer: Math.round(waveTargetCount * (mix.single_best_answer / 100)),
    multiple_response: Math.round(waveTargetCount * (mix.multiple_response / 100)),
    dosage_calc: Math.round(waveTargetCount * (mix.dosage_calc / 100)),
  };
}

/** Compute category target for a wave */
export function computeLVNWaveCategoryTargets(waveTargetCount: number): Record<LVNCategorySlug, number> {
  const total = 800;
  const result = {} as Record<LVNCategorySlug, number>;
  for (const [slug, target] of Object.entries(LVN_CATEGORY_TARGETS) as [LVNCategorySlug, number][]) {
    result[slug] = Math.round((target / total) * waveTargetCount);
  }
  return result;
}
