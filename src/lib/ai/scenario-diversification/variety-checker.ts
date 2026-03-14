/**
 * Scenario Diversification - Batch Variety Checker
 *
 * Validates that a batch has sufficient archetype variety.
 * Identifies later items that share the same archetype as an earlier item (mark for needs_revision).
 */

import type { ScenarioArchetype } from "./archetypes";

export interface VarietyCheckResult {
  passed: boolean;
  score: number;
  reasons: string[];
  /** Minimum unique values required per dimension */
  thresholds: {
    ageBands: number;
    careSettings: number;
    phases: number;
    pharmacologyMix: boolean;
  };
}

const MIN_AGE_BANDS = 2;
const MIN_CARE_SETTINGS = 2;
const MIN_PHASES = 2;
const MIN_BATCH_SIZE_FOR_CHECK = 3;

/**
 * Check if a batch of archetypes has sufficient variety.
 */
export function checkBatchVariety(archetypes: ScenarioArchetype[]): VarietyCheckResult {
  const reasons: string[] = [];
  let score = 0;
  const maxScore = 4;

  if (archetypes.length < MIN_BATCH_SIZE_FOR_CHECK) {
    return {
      passed: true,
      score: 1,
      reasons: ["Batch too small for variety check"],
      thresholds: {
        ageBands: MIN_AGE_BANDS,
        careSettings: MIN_CARE_SETTINGS,
        phases: MIN_PHASES,
        pharmacologyMix: true,
      },
    };
  }

  const ageBands = new Set(archetypes.map((a) => a.age_band).filter(Boolean));
  const careSettings = new Set(archetypes.map((a) => a.care_setting).filter(Boolean));
  const phases = new Set(archetypes.map((a) => a.phase).filter(Boolean));
  const pharmAngles = new Set(archetypes.map((a) => a.pharmacology_angle).filter(Boolean));

  if (ageBands.size >= MIN_AGE_BANDS) {
    score++;
  } else {
    reasons.push(`Only ${ageBands.size} age band(s) used (need ${MIN_AGE_BANDS}). Use pediatric, adolescent, young adult, middle-aged, older adult, geriatric.`);
  }

  if (careSettings.size >= MIN_CARE_SETTINGS) {
    score++;
  } else {
    reasons.push(`Only ${careSettings.size} care setting(s) used (need ${MIN_CARE_SETTINGS}). Vary: clinic, ED, inpatient, telehealth, follow-up.`);
  }

  if (phases.size >= MIN_PHASES) {
    score++;
  } else {
    reasons.push(`Only ${phases.size} clinical phase(s) used (need ${MIN_PHASES}). Mix assessment, diagnosis, management, prevention, patient education.`);
  }

  const hasPharmacologyMix = pharmAngles.size >= 2 || pharmAngles.has("mixed");
  if (hasPharmacologyMix || pharmAngles.size >= 1) {
    score++;
  } else {
    reasons.push("Include both pharmacology and non-pharmacology angles.");
  }

  const passed = score >= 3;

  return {
    passed,
    score,
    reasons,
    thresholds: {
      ageBands: MIN_AGE_BANDS,
      careSettings: MIN_CARE_SETTINGS,
      phases: MIN_PHASES,
      pharmacologyMix: true,
    },
  };
}

/**
 * Return indices of items that share the same scenario archetype key as an earlier item in the batch.
 * Use to mark later duplicates for needs_revision or regeneration.
 */
export function getDuplicateArchetypeIndicesInBatch(
  archetypeKeys: (string | null | undefined)[]
): Set<number> {
  const seen = new Set<string>();
  const duplicateIndices = new Set<number>();
  for (let i = 0; i < archetypeKeys.length; i++) {
    const key = (archetypeKeys[i] ?? "").trim();
    if (!key) continue;
    if (seen.has(key)) {
      duplicateIndices.add(i);
    } else {
      seen.add(key);
    }
  }
  return duplicateIndices;
}
