/**
 * Xentis AI Factory – duplicate prevention (Phase 1: lightweight, deterministic).
 *
 * - normalizeStem / normalizeQuestionPayload: canonical text for hashing
 * - buildScenarioArchetype: infer scenario from stem/rationale
 * - computeStemFingerprint: hashes + archetype key for indexing
 * - detectDuplicateRisk: compare against existing candidates (no embeddings)
 */

import {
  normalizeQuestionStemForHash,
  hashQuestionStem,
  hashQuestionPayload,
} from "./dedupe-normalization";
import { extractArchetypeFromStem } from "./scenario-diversification";
import type { ScenarioArchetype } from "./scenario-diversification/archetypes";

export type DuplicateRiskLevel = "low" | "medium" | "high";

export interface QuestionForDedupe {
  stem: string;
  leadIn?: string;
  options?: { key?: string; text?: string }[];
  rationale?: string;
}

/** Normalize stem text for hashing (lowercase, trim, collapse whitespace, remove punctuation). */
export function normalizeStem(text: string): string {
  return normalizeQuestionStemForHash(text ?? "");
}

/** Normalize full question payload to a single comparable string (stem + leadIn + options text + rationale). */
export function normalizeQuestionPayload(question: QuestionForDedupe): string {
  const payload = {
    stem: question.stem,
    leadIn: question.leadIn,
    options: question.options,
    rationale: question.rationale,
  };
  const { normalized } = hashQuestionPayload(payload);
  return normalized;
}

/** Build scenario archetype from question stem and optional rationale. */
export function buildScenarioArchetype(question: QuestionForDedupe): ScenarioArchetype {
  return extractArchetypeFromStem(question.stem ?? "", question.rationale);
}

/** Stable key for archetype comparison (deterministic). */
export function scenarioArchetypeKey(archetype: ScenarioArchetype): string {
  const parts = [
    archetype.age_band ?? "",
    archetype.sex ?? "",
    archetype.care_setting ?? "",
    archetype.phase ?? "",
    archetype.acuity ?? "",
    archetype.pharmacology_angle ?? "",
    (archetype.stem_opening ?? "").slice(0, 40),
    (archetype.presenting_complaint_pattern ?? "").slice(0, 40),
  ];
  return parts.join("|").toLowerCase();
}

export interface StemFingerprint {
  normalized_stem_hash: string;
  normalized_content_hash: string;
  scenario_archetype: ScenarioArchetype;
  scenario_archetype_key: string;
  secondary_stem_hash: string;
}

/** Compute deterministic fingerprint for a question (hashes + archetype). Use before save. */
export function computeStemFingerprint(question: QuestionForDedupe): StemFingerprint {
  const stemTrimmed = (question.stem ?? "").trim();
  const { hash: normalized_stem_hash, secondaryHash: secondary_stem_hash } = hashQuestionStem(stemTrimmed);
  const { hash: normalized_content_hash } = hashQuestionPayload({
    stem: question.stem,
    leadIn: question.leadIn,
    options: question.options,
    rationale: question.rationale,
  });
  const scenario_archetype = buildScenarioArchetype(question);
  const scenario_archetype_key = scenarioArchetypeKey(scenario_archetype);
  return {
    normalized_stem_hash,
    normalized_content_hash,
    scenario_archetype,
    scenario_archetype_key,
    secondary_stem_hash,
  };
}

export interface ExistingCandidate {
  normalized_stem_hash?: string | null;
  normalized_content_hash?: string | null;
  scenario_archetype_key?: string | null;
}

export interface DuplicateRiskResult {
  similarityScore: number;
  duplicateRiskLevel: DuplicateRiskLevel;
  duplicateReasons: string[];
}

/** Default threshold above which we consider duplicate risk "high" and route to needs_revision. */
export const DUPLICATE_RISK_HIGH_THRESHOLD = 0.9;

/** Default threshold above which we consider duplicate risk "medium". */
export const DUPLICATE_RISK_MEDIUM_THRESHOLD = 0.5;

/**
 * Detect duplicate risk by comparing question fingerprint to existing candidates.
 * Deterministic: hash and archetype key comparison only (no embeddings).
 */
export function detectDuplicateRisk(
  question: QuestionForDedupe,
  existingCandidates: ExistingCandidate[]
): DuplicateRiskResult {
  const fingerprint = computeStemFingerprint(question);
  const reasons: string[] = [];
  let score = 0;

  if (!existingCandidates.length) {
    return { similarityScore: 0, duplicateRiskLevel: "low", duplicateReasons: [] };
  }

  for (const c of existingCandidates) {
    if (c.normalized_stem_hash && c.normalized_stem_hash === fingerprint.normalized_stem_hash) {
      reasons.push("exact_stem_hash_match");
      score = Math.max(score, 1);
    }
    if (c.normalized_content_hash && c.normalized_content_hash === fingerprint.normalized_content_hash) {
      reasons.push("exact_content_hash_match");
      score = Math.max(score, 1);
    }
    if (
      fingerprint.scenario_archetype_key &&
      c.scenario_archetype_key &&
      c.scenario_archetype_key === fingerprint.scenario_archetype_key
    ) {
      if (!reasons.includes("same_scenario_archetype")) reasons.push("same_scenario_archetype");
      score = Math.max(score, score >= 1 ? 1 : 0.6);
    }
  }

  const duplicateRiskLevel: DuplicateRiskLevel =
    score >= DUPLICATE_RISK_HIGH_THRESHOLD ? "high" : score >= DUPLICATE_RISK_MEDIUM_THRESHOLD ? "medium" : "low";

  return {
    similarityScore: score,
    duplicateRiskLevel,
    duplicateReasons: [...new Set(reasons)],
  };
}
