/**
 * Auto-Publish Eligibility - single source of truth (high-confidence).
 *
 * Auto-publish when ALL are true:
 * - schema_valid = true
 * - medical_validation_passed = true
 * - evidence_mapping_valid = true
 * - legal_status in (original, adapted)
 * - similarity_score below threshold
 * - quality_score >= configured threshold
 * - confidence_score >= configured threshold
 *
 * Otherwise route to the correct lane (editorial, sme, legal, qa, needs_revision)
 * and set routing_reason and routing_lane in metadata.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { AUTO_PUBLISH_CONFIDENCE_MIN, DUPLICATE_SIMILARITY_MAX } from "@/config/ai-factory";
import { getAutoPublishConfig, ENTITY_TYPE_TO_TABLE } from "./auto-publish-config";
import { getTrackSlug } from "./source-governance-helpers";
import { hasValidSourceMapping } from "./source-governance";
import { loadSourceEvidence } from "./source-evidence";

export type RoutingLane = "editorial" | "sme" | "legal" | "qa" | "needs_revision";

const LEGAL_CLEARED = ["original", "adapted"] as const;

/** Legal status values that allow auto-publish (canonical + legacy). */
const LEGAL_CLEARED_QUESTION = ["cleared_original_content", "approved", "original", "adapted"] as const;

/** Evidence mapping status values that allow auto-publish. */
const EVIDENCE_PASSED = ["passed", "valid"] as const;

/**
 * Input shape for shouldAutoPublishQuestion. Built from content_quality_metadata,
 * generation_metadata, source evidence, and review flags.
 */
export interface QuestionForAutoPublish {
  schemaValid: boolean;
  confidence_score: number | null;
  similarity_score: number | null;
  medical_validation_status: string | null;
  evidence_mapping_status: string | null;
  legal_status: string | null;
  requires_editorial_review: boolean;
  requires_sme_review: boolean;
  requires_legal_review: boolean;
  requires_qa_review: boolean;
}

/**
 * Returns true only when the question meets all auto-publish gates.
 * Use this as the single source of truth for question auto-publish eligibility.
 */
export function shouldAutoPublishQuestion(question: QuestionForAutoPublish): boolean {
  if (!question.schemaValid) return false;

  const conf = question.confidence_score;
  const conf100 = conf != null ? (conf <= 1 ? conf * 100 : conf) : 0;
  if (conf100 < AUTO_PUBLISH_CONFIDENCE_MIN) return false;

  const sim = question.similarity_score;
  if (sim != null && typeof sim === "number" && !Number.isNaN(sim) && sim >= DUPLICATE_SIMILARITY_MAX) return false;

  if (question.medical_validation_status !== "passed") return false;

  const ev = (question.evidence_mapping_status ?? "").toLowerCase();
  if (!EVIDENCE_PASSED.some((p) => ev === p)) return false;

  const legalNorm = (question.legal_status ?? "").toLowerCase().replace(/-/g, "_");
  if (!LEGAL_CLEARED_QUESTION.some((l) => legalNorm === l)) return false;

  if (
    question.requires_editorial_review ||
    question.requires_sme_review ||
    question.requires_legal_review ||
    question.requires_qa_review
  )
    return false;

  return true;
}

export interface AutoPublishEvalResult {
  eligible: boolean;
  reason?: string;
  score?: number;
  routedTo: "published" | "editor_review";
  /** Which lane to route to when not eligible (for diagnostics and queue filtering) */
  routingLane?: RoutingLane;
  /** Human-readable reason for routing (diagnostics) */
  routingReason?: string;
  /** Reasons for not auto-publishing */
  blockReasons?: string[];
  /** When eligible, reason for auto-publish (for metadata) */
  publishReason?: string;
}

/**
 * Determine routing lane from block reasons (priority order).
 */
function deriveRoutingLane(blockReasons: string[]): RoutingLane {
  const lower = blockReasons.map((r) => r.toLowerCase());
  if (lower.some((r) => r.includes("legal") || r.includes("blocked") || r.includes("pending_legal"))) return "legal";
  if (lower.some((r) => r.includes("source mapping") || r.includes("evidence"))) return "legal";
  if (lower.some((r) => r.includes("medical") || r.includes("sme") || r.includes("confidence") || r.includes("human review"))) return "sme";
  if (lower.some((r) => r.includes("schema") || r.includes("validation") || r.includes("rationale") || r.includes("editorial"))) return "editorial";
  if (lower.some((r) => r.includes("quality") || r.includes("score"))) return "qa";
  return "editorial";
}

/**
 * Evaluate whether content is eligible for high-confidence auto-publish.
 */
export async function evaluateAutoPublishEligibility(
  entityType: string,
  entityId: string,
  contentType: string
): Promise<AutoPublishEvalResult> {
  const blockReasons: string[] = [];

  const config = await getAutoPublishConfig(contentType);
  if (!config || !config.enabled) {
    return {
      eligible: false,
      reason: "Auto-publish disabled for this content type",
      routedTo: "editor_review",
      routingLane: "editorial",
      routingReason: "Auto-publish disabled for this content type",
      blockReasons: ["Auto-publish disabled for this content type"],
    };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      eligible: false,
      reason: "Service not configured",
      routedTo: "editor_review",
      blockReasons: ["Service not configured"],
    };
  }

  const supabase = createServiceClient();

  const { data: meta } = await supabase
    .from("content_quality_metadata")
    .select("quality_score, auto_publish_eligible, validation_status, validation_errors, generation_metadata")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!meta) {
    return {
      eligible: false,
      reason: "No quality metadata",
      routedTo: "editor_review",
      routingLane: "editorial",
      routingReason: "No quality metadata",
      blockReasons: ["No quality metadata"],
    };
  }

  const score = Number(meta.quality_score ?? 0);
  const genMeta = (meta.generation_metadata ?? {}) as Record<string, unknown>;

  // 1. schema_valid
  const validationStatus = (meta.validation_status as string) ?? "";
  const validationErrors = (meta.validation_errors as unknown[]) ?? [];
  if (validationStatus === "schema_invalid" || validationStatus === "validation_failed" || (Array.isArray(validationErrors) && validationErrors.length > 0)) {
    blockReasons.push("Schema or validation failed");
  }
  if (!meta.auto_publish_eligible) {
    blockReasons.push(validationStatus || "Validation failed");
  }

  // 2. medical_validation_passed (questions)
  if (contentType === "question" && genMeta.ai_validation_passed === false) {
    blockReasons.push("AI medical validation did not pass");
  }
  const requiresHumanReview = genMeta.requires_human_review === true;
  if (requiresHumanReview) {
    blockReasons.push("Flagged for human review (AI validation low confidence or failed)");
  }

  // 3. confidence_score >= threshold
  const confidence = Number(genMeta.ai_validation_confidence ?? 0);
  const minConfidence = config.minConfidenceScore ?? 0.85;
  if (contentType === "question" && confidence < minConfidence) {
    blockReasons.push(`Confidence score ${(confidence * 100).toFixed(0)}% below threshold ${(minConfidence * 100).toFixed(0)}%`);
  }

  // 4. quality_score >= threshold
  if (score < config.minQualityScore) {
    blockReasons.push(`Quality score ${score} below threshold ${config.minQualityScore}`);
  }

  // 5. similarity_score below threshold (from generation_metadata if present)
  if (config.maxSimilarityScore != null && typeof config.maxSimilarityScore === "number") {
    const stemSim = Number(genMeta.stem_similarity ?? 0);
    const payloadSim = Number(genMeta.payload_similarity ?? 0);
    const maxSim = Math.max(stemSim, payloadSim);
    if (maxSim >= config.maxSimilarityScore) {
      blockReasons.push(`Similarity score ${maxSim.toFixed(2)} at or above threshold ${config.maxSimilarityScore}`);
    }
  }

  const table = ENTITY_TYPE_TO_TABLE[entityType] ?? entityType;
  const { data: row } = await supabase
    .from(table)
    .select("exam_track_id, system_id, topic_id, status")
    .eq("id", entityId)
    .single();

  if (!row) {
    return {
      eligible: false,
      reason: "Content not found",
      routedTo: "editor_review",
      blockReasons: ["Content not found"],
    };
  }
  if (config.requireTrackAssigned && !row.exam_track_id) {
    blockReasons.push("Track not assigned");
  }

  // 6. evidence_mapping_valid
  let evidenceMappingValid = true;
  if (config.requireSourceMapping && row.exam_track_id) {
    const trackSlug = await getTrackSlug(row.exam_track_id);
    if (trackSlug) {
      const sourceCheck = await hasValidSourceMapping(entityType, entityId, trackSlug);
      evidenceMappingValid = sourceCheck.valid;
      if (!sourceCheck.valid) {
        blockReasons.push(sourceCheck.reason ?? "Evidence/source mapping required");
      }
    }
  }

  // 7. legal_status — required for auto-publish
  const evidence = await loadSourceEvidence(entityType, entityId);
  const legalOk = evidence && LEGAL_CLEARED.includes(evidence.legalStatus as (typeof LEGAL_CLEARED)[number]);
  if (!evidence) {
    if (config.requireSourceMapping) blockReasons.push("Source evidence required");
  } else if (!legalOk) {
    if (evidence.legalStatus === "blocked") blockReasons.push("Content blocked for legal reasons");
    else if (evidence.legalStatus === "pending_legal") blockReasons.push("Pending legal review");
    else blockReasons.push("Legal status not cleared for publish");
  }

  let eligible: boolean;
  if (contentType === "question") {
    const stemSim = Number(genMeta.stem_similarity ?? 0);
    const payloadSim = Number(genMeta.payload_similarity ?? 0);
    const similarityScore = config.maxSimilarityScore != null ? Math.max(stemSim, payloadSim) : null;
    const confidenceRaw = Number(genMeta.ai_validation_confidence ?? 0);
    const question: QuestionForAutoPublish = {
      schemaValid:
        validationStatus !== "schema_invalid" &&
        validationStatus !== "validation_failed" &&
        (!Array.isArray(validationErrors) || validationErrors.length === 0) &&
        !!meta.auto_publish_eligible,
      confidence_score: confidenceRaw > 0 ? confidenceRaw : null,
      similarity_score: similarityScore,
      medical_validation_status: genMeta.ai_validation_passed === true ? "passed" : "failed",
      evidence_mapping_status: evidenceMappingValid ? "valid" : "invalid",
      legal_status: evidence?.legalStatus ?? null,
      requires_editorial_review: !!genMeta.requires_editorial_review,
      requires_sme_review: !!genMeta.requires_sme_review,
      requires_legal_review: !!genMeta.requires_legal_review,
      requires_qa_review: !!genMeta.requires_qa_review,
    };
    eligible = shouldAutoPublishQuestion(question) && blockReasons.length === 0;
  } else {
    eligible = blockReasons.length === 0;
  }

  const routingLane = eligible ? undefined : deriveRoutingLane(blockReasons);
  const routingReason = blockReasons.length > 0 ? blockReasons.join("; ") : undefined;

  return {
    eligible,
    reason: routingReason,
    score,
    routedTo: eligible ? "published" : "editor_review",
    routingLane,
    routingReason,
    blockReasons: blockReasons.length > 0 ? blockReasons : undefined,
    publishReason: eligible ? "high_confidence_auto_publish" : undefined,
  };
}
