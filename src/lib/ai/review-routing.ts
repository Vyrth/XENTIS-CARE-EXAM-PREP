/**
 * Xentis AI Factory – centralized question routing.
 *
 * Single source of truth for review lane assignment and auto-publish eligibility.
 * Deterministic: priority order legal → sme → editorial → qa → needs_revision → auto_publish_candidate.
 */

import type { ReviewLane } from "@/config/ai-factory";
import { AUTO_PUBLISH_CONFIDENCE_MIN, DUPLICATE_SIMILARITY_MAX } from "@/config/ai-factory";

/** Default minimum quality score below which we route to needs_revision. */
const MIN_QUALITY_FOR_AUTO_PUBLISH = 70;

export interface ResolveQuestionRoutingInput {
  /** Schema/validation status (e.g. 'valid' | 'schema_invalid' | 'validation_failed') */
  validationStatus?: string;
  /** Validation error messages (schema, rationale, options, render, taxonomy) */
  validationErrors?: string[];
  /** Has non-empty rationale */
  hasRationale?: boolean;
  /** Option structure valid (correct count, at least one correct) */
  optionStructureOk?: boolean;
  /** Medical validation result: 'passed' | 'failed' */
  medical_validation_status?: "passed" | "failed" | string;
  /** Evidence/source mapping valid ('valid' or 'passed') */
  evidence_mapping_status?: "valid" | "invalid" | "passed" | string;
  /** Legal status from content_source_evidence (cleared_original_content, approved, original, adapted) */
  legal_status?: "original" | "adapted" | "pending_legal" | "blocked" | string;
  /** Source basis: unclear/imported/adapted triggers legal */
  source_basis?: "original" | "internal" | "licensed" | "pending" | string;
  /** Quality score (0–100); low triggers needs_revision */
  quality_score?: number | null;
  /** Similarity to existing content (0–1); high triggers needs_revision */
  similarity_score?: number | null;
  /** Confidence (0–100 or 0–1); below threshold triggers sme/needs_revision */
  confidence_score?: number | null;
  /** Board/style mismatch from quality check */
  boardStyleMismatch?: boolean;
}

export interface ResolveQuestionRoutingResult {
  requiresEditorialReview: boolean;
  requiresSmeReview: boolean;
  requiresLegalReview: boolean;
  requiresQaReview: boolean;
  routedLane: ReviewLane;
  routingReason: string;
  shouldAutoPublish: boolean;
}

const LEGAL_CLEARED = new Set([
  "original",
  "adapted",
  "cleared_original_content",
  "approved",
]);
const SOURCE_RIGHTS_CLEAR = new Set(["original", "internal"]);

function hasEditorialIssue(input: ResolveQuestionRoutingInput): boolean {
  if (input.validationStatus === "schema_invalid" || input.validationStatus === "validation_failed") return true;
  if ((input.validationErrors?.length ?? 0) > 0) {
    const errs = input.validationErrors!.map((e) => e.toLowerCase());
    if (errs.some((e) => e.includes("schema") || e.includes("rationale") || e.includes("option") || e.includes("stem"))) return true;
  }
  if (input.hasRationale === false) return true;
  if (input.optionStructureOk === false) return true;
  if (input.boardStyleMismatch === true) return true;
  return false;
}

function hasQaIssue(input: ResolveQuestionRoutingInput): boolean {
  const errs = (input.validationErrors ?? []).map((e) => e.toLowerCase());
  return errs.some((e) => e.includes("render") || e.includes("technical") || e.includes("taxonomy") || e.includes("display") || e.includes("format"));
}

function hasNeedsRevisionIssue(input: ResolveQuestionRoutingInput): boolean {
  const sim = input.similarity_score;
  if (sim != null && typeof sim === "number" && !Number.isNaN(sim) && sim >= DUPLICATE_SIMILARITY_MAX) return true;
  const q = input.quality_score;
  if (q != null && typeof q === "number" && !Number.isNaN(q) && q < MIN_QUALITY_FOR_AUTO_PUBLISH) return true;
  return false;
}

/**
 * Resolve question routing from validation, medical, evidence, and legal inputs.
 * Priority: legal → sme → editorial → qa → needs_revision → auto_publish_candidate.
 * Deterministic; use after question validation and before final status update.
 */
export function resolveQuestionRouting(input: ResolveQuestionRoutingInput): ResolveQuestionRoutingResult {
  const reasons: string[] = [];
  let routedLane: ReviewLane = "auto_publish_candidate";
  let requiresEditorialReview = false;
  let requiresSmeReview = false;
  let requiresLegalReview = false;
  let requiresQaReview = false;

  const legalNorm = (input.legal_status ?? "").toLowerCase().replace(/-/g, "_");
  const sourceBasis = (input.source_basis ?? "").toLowerCase();
  const legalCleared = LEGAL_CLEARED.has(legalNorm as "original" | "adapted" | "cleared_original_content" | "approved");
  const sourceRightsClear = !sourceBasis || SOURCE_RIGHTS_CLEAR.has(sourceBasis as "original" | "internal");
  if (!legalCleared || !sourceRightsClear) {
    routedLane = "legal";
    requiresLegalReview = true;
    if (!legalCleared) reasons.push("Legal status not cleared for publish");
    if (!sourceRightsClear) reasons.push("Imported/adapted or unclear source rights");
  }

  const medicalPassed = input.medical_validation_status === "passed";
  if (!medicalPassed && routedLane === "auto_publish_candidate") {
    routedLane = "sme";
    requiresSmeReview = true;
    reasons.push("Medical validation did not pass");
  }

  const conf = input.confidence_score;
  const conf100 = conf != null ? (conf <= 1 ? conf * 100 : conf) : 0;
  if (conf100 > 0 && conf100 < AUTO_PUBLISH_CONFIDENCE_MIN && routedLane === "auto_publish_candidate") {
    routedLane = "sme";
    requiresSmeReview = true;
    reasons.push(`Confidence score ${Math.round(conf100)}% below threshold ${AUTO_PUBLISH_CONFIDENCE_MIN}%`);
  }

  const evidenceOk =
    input.evidence_mapping_status === "valid" || input.evidence_mapping_status === "passed";
  if (!evidenceOk && routedLane === "auto_publish_candidate") {
    routedLane = "legal";
    requiresLegalReview = true;
    reasons.push("Evidence/source mapping invalid");
  }

  if (hasEditorialIssue(input) && routedLane === "auto_publish_candidate") {
    routedLane = "editorial";
    requiresEditorialReview = true;
    reasons.push("Schema invalid, rationale weak, or option structure weak");
  }

  if (hasQaIssue(input) && routedLane === "auto_publish_candidate") {
    routedLane = "qa";
    requiresQaReview = true;
    reasons.push("Render, technical, or taxonomy issues");
  }

  if (hasNeedsRevisionIssue(input) && routedLane === "auto_publish_candidate") {
    routedLane = "needs_revision";
    if (input.similarity_score != null && input.similarity_score >= DUPLICATE_SIMILARITY_MAX) reasons.push("Duplicate similarity too high");
    if (input.quality_score != null && input.quality_score < MIN_QUALITY_FOR_AUTO_PUBLISH) reasons.push("Generator quality too low");
  }

  const routingReason = reasons.length > 0 ? reasons.join("; ") : "All checks passed";
  const shouldAutoPublish = routedLane === "auto_publish_candidate";

  return {
    requiresEditorialReview,
    requiresSmeReview,
    requiresLegalReview,
    requiresQaReview,
    routedLane,
    routingReason,
    shouldAutoPublish,
  };
}

/** Convert ResolveQuestionRoutingResult to ReviewFlags shape for existing consumers. */
export function routingResultToReviewFlags(result: ResolveQuestionRoutingResult): {
  requires_editorial_review: boolean;
  requires_sme_review: boolean;
  requires_legal_review: boolean;
  requires_qa_review: boolean;
} {
  return {
    requires_editorial_review: result.requiresEditorialReview,
    requires_sme_review: result.requiresSmeReview,
    requires_legal_review: result.requiresLegalReview,
    requires_qa_review: result.requiresQaReview,
  };
}
