/**
 * Production Dedupe - Pre-save Check and Registry
 *
 * Before save: check content_dedupe_registry for content_type + normalized_hash.
 * If duplicate: skip save, increment batch_plan.duplicate_count, log duplicate_skipped.
 * After save: insert registry row with full metadata.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { isLikelyDuplicate } from "@/lib/ai/similarity";
import { checkStemEmbeddingSimilarity, STEM_SIMILARITY_THRESHOLD } from "@/lib/ai/stem-embedding-dedupe";
import {
  hashQuestionStem,
  hashGuideTitle,
  hashFlashcardFront,
  hashHighYieldTitle,
  normalizeQuestionStemForHash,
} from "./dedupe-normalization";

export type DedupeContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "high_yield_content";

export interface DedupeScope {
  examTrackId: string;
  systemId?: string | null;
  topicId?: string | null;
}

export interface CheckDedupeBeforeSaveParams {
  contentType: DedupeContentType;
  normalizedHash: string;
  secondaryHash?: string | null;
  scope: DedupeScope;
  /** For questions: raw stem for near-duplicate check in same track/topic */
  rawStem?: string | null;
  /** For questions: normalized text preview (first 120 chars) for near-dup comparison */
  normalizedPreview?: string | null;
}

export type DedupeReason =
  | "exact"
  | "near_duplicate"
  | "near_duplicate_stem"
  | "repeated_clinical_pattern"
  | "repeated_management_angle";

export interface CheckDedupeResult {
  isDuplicate: boolean;
  reason?: DedupeReason;
  existingSourceId?: string;
}

/** Check content_dedupe_registry for exact match (content_type + normalized_hash) */
async function checkExactDuplicate(
  contentType: string,
  normalizedHash: string
): Promise<{ isDuplicate: boolean; sourceId?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { isDuplicate: false };
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("content_dedupe_registry")
    .select("source_id")
    .eq("content_type", contentType)
    .eq("normalized_hash", normalizedHash)
    .limit(1)
    .maybeSingle();
  return {
    isDuplicate: !!data,
    sourceId: data?.source_id,
  };
}

/** Check for near-duplicate questions in same track/topic: secondary_hash (first 120 chars) + questions table fuzzy */
async function checkQuestionNearDuplicate(
  scope: DedupeScope,
  rawStem: string,
  normalizedHash: string,
  secondaryHash?: string | null
): Promise<{ isDuplicate: boolean; reason?: "near_duplicate" }> {
  if (!isSupabaseServiceRoleConfigured() || !rawStem?.trim()) return { isDuplicate: false };
  const supabase = createServiceClient();

  if (secondaryHash) {
    let regQ = supabase
      .from("content_dedupe_registry")
      .select("id")
      .eq("content_type", "question")
      .eq("exam_track_id", scope.examTrackId)
      .eq("secondary_hash", secondaryHash);
    if (scope.topicId) regQ = regQ.eq("topic_id", scope.topicId);
    else regQ = regQ.is("topic_id", null);
    const { data: regMatch } = await regQ.limit(1).maybeSingle();
    if (regMatch) return { isDuplicate: true, reason: "near_duplicate" };
  }

  let q = supabase
    .from("questions")
    .select("stem")
    .eq("exam_track_id", scope.examTrackId)
    .not("stem", "is", null)
    .limit(80);
  if (scope.topicId) q = q.eq("topic_id", scope.topicId);
  else q = q.is("topic_id", null);
  const { data: stems } = await q;

  if (!stems?.length) return { isDuplicate: false };
  for (const row of stems) {
    const s = (row as { stem?: string }).stem;
    if (s && isLikelyDuplicate(rawStem.trim(), s, 0.88)) {
      return { isDuplicate: true, reason: "near_duplicate" };
    }
  }
  return { isDuplicate: false };
}

/**
 * Check content_dedupe_registry before save.
 * Returns { isDuplicate: true } if exact or (for questions) near-duplicate found.
 */
export async function checkDedupeBeforeSave(
  params: CheckDedupeBeforeSaveParams
): Promise<CheckDedupeResult> {
  const exact = await checkExactDuplicate(params.contentType, params.normalizedHash);
  if (exact.isDuplicate) {
    return { isDuplicate: true, reason: "exact", existingSourceId: exact.sourceId };
  }

  if (params.contentType === "question" && params.rawStem?.trim()) {
    const near = await checkQuestionNearDuplicate(
      params.scope,
      params.rawStem,
      params.normalizedHash,
      params.secondaryHash
    );
    if (near.isDuplicate) return { isDuplicate: true, reason: "near_duplicate" };

    const embeddingCheck = await checkStemEmbeddingSimilarity(
      params.rawStem,
      params.scope.examTrackId,
      { topicId: params.scope.topicId, systemId: params.scope.systemId }
    );
    if (embeddingCheck.isDuplicate) {
      return { isDuplicate: true, reason: "near_duplicate" };
    }
  }

  return { isDuplicate: false };
}

export interface RegisterAfterSaveParams {
  contentType: DedupeContentType;
  normalizedHash: string;
  secondaryHash?: string | null;
  scope: DedupeScope;
  sourceTable: string;
  sourceId: string;
  sourceStatus?: string | null;
  normalizedTextPreview?: string | null;
  createdByBatchPlanId?: string | null;
}

/**
 * Insert into content_dedupe_registry after successful save.
 */
export async function registerAfterSave(params: RegisterAfterSaveParams): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  const supabase = createServiceClient();
  const { error } = await supabase.from("content_dedupe_registry").insert({
    content_type: params.contentType,
    exam_track_id: params.scope.examTrackId,
    system_id: params.scope.systemId ?? null,
    topic_id: params.scope.topicId ?? null,
    source_table: params.sourceTable,
    source_id: params.sourceId,
    normalized_hash: params.normalizedHash,
    secondary_hash: params.secondaryHash ?? null,
    source_status: params.sourceStatus ?? null,
    normalized_text_preview: params.normalizedTextPreview ?? null,
    created_by_batch_plan_id: params.createdByBatchPlanId ?? null,
  });
  if (error) {
    if (error.code === "23505") return true;
    return false;
  }
  return true;
}

export interface SimilarityMetadata {
  normalized_stem_hash?: string;
  normalized_content_hash?: string;
  stem_similarity?: number;
  payload_similarity?: number;
  duplicate_reason?: string;
  regeneration_attempt?: number;
}

export interface RecordDuplicateSkippedParams {
  batchPlanId: string;
  contentType: DedupeContentType;
  normalizedHash: string;
  reason?: DedupeReason;
  campaignId?: string | null;
  shardId?: string | null;
  /** Similarity metadata for auditing (questions) */
  similarityMetadata?: SimilarityMetadata;
}

/**
 * When duplicate is skipped: increment batch_plan.duplicate_count and log duplicate_skipped.
 */
export async function recordDuplicateSkipped(params: RecordDuplicateSkippedParams): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const { data: plan } = await supabase.from("batch_plans").select("duplicate_count").eq("id", params.batchPlanId).single();
  const current = (plan?.duplicate_count ?? 0) as number;
  await supabase.from("batch_plans").update({ duplicate_count: current + 1, updated_at: new Date().toISOString() }).eq("id", params.batchPlanId);

  const logMetadata: Record<string, unknown> = {
    contentType: params.contentType,
    normalizedHash: params.normalizedHash,
    reason: params.reason ?? "exact",
  };
  if (params.similarityMetadata) Object.assign(logMetadata, params.similarityMetadata);

  await supabase.from("ai_batch_job_logs").insert({
    batch_plan_id: params.batchPlanId,
    campaign_id: params.campaignId ?? null,
    shard_id: params.shardId ?? null,
    event_type: "duplicate_skipped",
    message: `Duplicate ${params.contentType} skipped (${params.reason ?? "exact"})`,
    metadata: logMetadata,
    log_level: "info",
  });
}

/**
 * Log duplicate rejection for auditing (single-question save, no batch).
 */
export async function logDuplicateRejected(params: {
  contentType: DedupeContentType;
  normalizedHash: string;
  reason?: DedupeReason;
  similarityMetadata?: SimilarityMetadata;
  examTrackId?: string;
}): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const logMetadata: Record<string, unknown> = {
    contentType: params.contentType,
    normalizedHash: params.normalizedHash,
    reason: params.reason ?? "exact",
  };
  if (params.similarityMetadata) Object.assign(logMetadata, params.similarityMetadata);
  if (params.examTrackId) logMetadata.examTrackId = params.examTrackId;

  await supabase.from("ai_batch_job_logs").insert({
    batch_plan_id: null,
    event_type: "duplicate_skipped",
    message: `Duplicate ${params.contentType} rejected (${params.reason ?? "exact"})`,
    metadata: logMetadata,
    log_level: "info",
  });
}

// -----------------------------------------------------------------------------
// Convenience helpers for each content type
// -----------------------------------------------------------------------------

export function prepareQuestionDedupe(stem: string) {
  const { normalized, hash, secondaryHash } = hashQuestionStem(stem);
  return {
    normalizedHash: hash,
    secondaryHash,
    normalizedTextPreview: normalized.slice(0, 120),
    rawStem: stem,
  };
}

export function prepareGuideDedupe(title: string) {
  const { normalized, hash } = hashGuideTitle(title);
  return { normalizedHash: hash, normalizedTextPreview: normalized.slice(0, 120) };
}

export function prepareFlashcardDedupe(name: string) {
  const { normalized, hash } = hashFlashcardFront(name);
  return { normalizedHash: hash, normalizedTextPreview: normalized.slice(0, 120) };
}

export function prepareHighYieldDedupe(title: string) {
  const { normalized, hash, secondaryHash } = hashHighYieldTitle(title);
  return {
    normalizedHash: hash,
    secondaryHash,
    normalizedTextPreview: normalized.slice(0, 120),
  };
}
