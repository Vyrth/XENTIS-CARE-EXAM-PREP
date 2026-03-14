/**
 * Scenario Diversification - Archetype Extraction
 *
 * Infers scenario archetype from question stem using regex/heuristics.
 * Used when AI does not return scenario_archetype in output.
 */

import type { ScenarioArchetype } from "./archetypes";
import {
  AGE_BANDS,
  SEX_OPTIONS,
  CARE_SETTINGS,
  CLINICAL_PHASES,
  ACUITY_LEVELS,
  PHARMACOLOGY_ANGLE,
} from "./archetypes";

const STEM_OPENING_LEN = 80;

/** Extract first N chars of stem (normalized) for opening comparison */
export function extractStemOpening(stem: string): string {
  const s = stem?.trim() ?? "";
  if (!s) return "";
  return s.slice(0, STEM_OPENING_LEN).replace(/\s+/g, " ").trim();
}

/** Age band patterns (order matters - more specific first) */
const AGE_PATTERNS: { pattern: RegExp; band: ScenarioArchetype["age_band"] | "infer" }[] = [
  { pattern: /\b(infant|newborn|neonate|baby)\b/i, band: "pediatric" },
  { pattern: /\b(toddler|preschool|child|pediatric|peds)\b/i, band: "pediatric" },
  { pattern: /\b(adolescent|teen|teenager|16[- ]?year|15[- ]?year)\b/i, band: "adolescent" },
  { pattern: /\b(20s|twenties|25[- ]?year|30[- ]?year)\b/i, band: "young_adult" },
  { pattern: /\b(40[- ]?year|45[- ]?year|50[- ]?year|55[- ]?year|middle[- ]?aged|mid[- ]?life)\b/i, band: "middle_aged" },
  { pattern: /\b(60[- ]?year|65[- ]?year|70[- ]?year|older adult)\b/i, band: "older_adult" },
  { pattern: /\b(80[- ]?year|85[- ]?year|90[- ]?year|elderly|geriatric|nursing home)\b/i, band: "geriatric" },
  { pattern: /\b(\d{1,3})[- ]?year[- ]?old\b/i, band: "infer" },
];

function inferAgeBand(stem: string): ScenarioArchetype["age_band"] {
  for (const { pattern, band } of AGE_PATTERNS) {
    if (band !== "infer" && pattern.test(stem)) return band;
  }
  const yearMatch = stem.match(/\b(\d{1,3})[- ]?year[- ]?old\b/i);
  if (yearMatch) {
    const age = parseInt(yearMatch[1], 10);
    if (age < 13) return "pediatric";
    if (age < 20) return "adolescent";
    if (age < 40) return "young_adult";
    if (age < 60) return "middle_aged";
    if (age < 75) return "older_adult";
    return "geriatric";
  }
  return undefined;
}

/** Sex patterns */
const SEX_PATTERNS: { pattern: RegExp; sex: ScenarioArchetype["sex"] }[] = [
  { pattern: /\b(woman|female|she|her)\b/i, sex: "female" },
  { pattern: /\b(man|male|he|him)\b/i, sex: "male" },
];

function inferSex(stem: string): ScenarioArchetype["sex"] {
  for (const { pattern, sex } of SEX_PATTERNS) {
    if (pattern.test(stem)) return sex;
  }
  return undefined;
}

/** Care setting patterns */
const SETTING_PATTERNS: { pattern: RegExp; setting: ScenarioArchetype["care_setting"] }[] = [
  { pattern: /\b(emergency department|ED|ER|emergency room)\b/i, setting: "ed" },
  { pattern: /\b(urgent care)\b/i, setting: "ed" },
  { pattern: /\b(clinic|outpatient|office)\b/i, setting: "clinic" },
  { pattern: /\b(inpatient|hospitalized|admitted)\b/i, setting: "inpatient" },
  { pattern: /\b(telehealth|virtual visit|video visit)\b/i, setting: "telehealth" },
  { pattern: /\b(follow[- ]?up|followup|return visit)\b/i, setting: "follow_up" },
  { pattern: /\b(home health|home visit)\b/i, setting: "home_health" },
  { pattern: /\b(school nurse)\b/i, setting: "school" },
  { pattern: /\b(nursing home|long[- ]?term care|skilled nursing)\b/i, setting: "long_term_care" },
];

function inferCareSetting(stem: string): ScenarioArchetype["care_setting"] {
  for (const { pattern, setting } of SETTING_PATTERNS) {
    if (pattern.test(stem)) return setting;
  }
  return undefined;
}

/** Clinical phase patterns */
const PHASE_PATTERNS: { pattern: RegExp; phase: ScenarioArchetype["phase"] }[] = [
  { pattern: /\b(assess|assessment|evaluate|examination)\b/i, phase: "assessment" },
  { pattern: /\b(diagnos|differential|identify the cause)\b/i, phase: "diagnosis" },
  { pattern: /\b(treat|management|prescribe|order|recommend)\b/i, phase: "management" },
  { pattern: /\b(complication|develops|worsens|adverse)\b/i, phase: "complication" },
  { pattern: /\b(prevent|prevention|screening)\b/i, phase: "prevention" },
  { pattern: /\b(educate|teaching|explain to patient)\b/i, phase: "patient_education" },
];

function inferPhase(stem: string): ScenarioArchetype["phase"] {
  for (const { pattern, phase } of PHASE_PATTERNS) {
    if (pattern.test(stem)) return phase;
  }
  return undefined;
}

/** Acuity patterns */
const ACUITY_PATTERNS: { pattern: RegExp; acuity: ScenarioArchetype["acuity"] }[] = [
  { pattern: /\b(critical|emergent|life[- ]?threatening|unstable)\b/i, acuity: "critical" },
  { pattern: /\b(acute|urgent|emergency)\b/i, acuity: "high" },
  { pattern: /\b(moderate|stable)\b/i, acuity: "moderate" },
  { pattern: /\b(chronic|routine|elective)\b/i, acuity: "low" },
];

function inferAcuity(stem: string): ScenarioArchetype["acuity"] {
  for (const { pattern, acuity } of ACUITY_PATTERNS) {
    if (pattern.test(stem)) return acuity;
  }
  return undefined;
}

/** Pharmacology angle - check for medication/drug terms */
const PHARM_PATTERNS = [
  /\b(medication|drug|prescribe|dose|mg|mL|IV|oral)\b/i,
  /\b(insulin|metformin|aspirin|antibiotic|antihypertensive)\b/i,
];

function inferPharmacologyAngle(stem: string, rationale?: string): ScenarioArchetype["pharmacology_angle"] {
  const text = `${stem} ${rationale ?? ""}`;
  const hasPharm = PHARM_PATTERNS.some((p) => p.test(text));
  if (hasPharm) return "pharmacology";
  return "non_pharmacology";
}

/** Extract chief complaint pattern (first symptom phrase, normalized) */
function extractPresentingComplaintPattern(stem: string): string | undefined {
  const patterns = [
    /presents?\s+with\s+([^.?!]+)/i,
    /complains?\s+of\s+([^.?!]+)/i,
    /(?:chief\s+complaint|CC):\s*([^.?!]+)/i,
    /(?:reporting|reports?)\s+([^.?!]+)/i,
  ];
  for (const p of patterns) {
    const m = stem.match(p);
    if (m?.[1]) {
      return m[1]
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^\w\s]/g, "")
        .trim()
        .slice(0, 60);
    }
  }
  return undefined;
}

/**
 * Infer scenario archetype from question stem (and optionally rationale).
 */
export function extractArchetypeFromStem(
  stem: string,
  rationale?: string
): ScenarioArchetype {
  const s = stem?.trim() ?? "";
  return {
    age_band: inferAgeBand(s),
    sex: inferSex(s),
    care_setting: inferCareSetting(s),
    phase: inferPhase(s),
    acuity: inferAcuity(s),
    pharmacology_angle: inferPharmacologyAngle(s, rationale),
    stem_opening: extractStemOpening(s),
    presenting_complaint_pattern: extractPresentingComplaintPattern(s),
  };
}
