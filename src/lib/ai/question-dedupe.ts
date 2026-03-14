/**
 * Question Duplicate Detection - Unified stem + payload similarity
 *
 * Computes:
 * - normalized_stem_hash
 * - normalized_content_hash
 * - embedding similarity (stem 0.82, payload 0.88)
 *
 * Duplicate reasons:
 * - near_duplicate_stem: stem similarity > 0.82
 * - repeated_clinical_pattern: payload similarity > 0.88, stem <= 0.82
 * - repeated_management_angle: both stem and payload exceed thresholds
 */

import { hashQuestionStem, hashQuestionPayload } from "./dedupe-normalization";
import {
  checkStemEmbeddingSimilarity,
  checkPayloadEmbeddingSimilarity,
  STEM_SIMILARITY_THRESHOLD,
  PAYLOAD_SIMILARITY_THRESHOLD,
} from "./stem-embedding-dedupe";

export type DuplicateReason =
  | "near_duplicate_stem"
  | "repeated_clinical_pattern"
  | "repeated_management_angle";

export interface QuestionSimilarityMetadata {
  normalized_stem_hash: string;
  normalized_content_hash: string;
  stem_similarity: number;
  payload_similarity: number;
  duplicate_reason?: DuplicateReason;
  regeneration_attempt?: number;
}

export interface QuestionDuplicateCheckResult {
  isDuplicate: boolean;
  reason?: DuplicateReason;
  metadata: QuestionSimilarityMetadata;
}

export interface QuestionDuplicateScope {
  examTrackId: string;
  topicId?: string | null;
  systemId?: string | null;
}

export interface QuestionPayloadForDedupe {
  stem: string;
  leadIn?: string;
  options?: { key?: string; text?: string }[];
  rationale?: string;
}

/**
 * Check if question is a duplicate (stem or payload similarity).
 * Returns detailed metadata for auditing.
 */
export async function checkQuestionDuplicate(
  payload: QuestionPayloadForDedupe,
  scope: QuestionDuplicateScope,
  options?: { regenerationAttempt?: number }
): Promise<QuestionDuplicateCheckResult> {
  const stemTrimmed = payload.stem?.trim() ?? "";
  const { hash: normalized_stem_hash, secondaryHash } = hashQuestionStem(stemTrimmed);
  const { hash: normalized_content_hash } = hashQuestionPayload({
    stem: payload.stem,
    leadIn: payload.leadIn,
    options: payload.options,
    rationale: payload.rationale,
  });

  const metadata: QuestionSimilarityMetadata = {
    normalized_stem_hash,
    normalized_content_hash,
    stem_similarity: 0,
    payload_similarity: 0,
    regeneration_attempt: options?.regenerationAttempt,
  };

  const [stemResult, payloadResult] = await Promise.all([
    stemTrimmed.length > 0
      ? checkStemEmbeddingSimilarity(stemTrimmed, scope.examTrackId, {
          topicId: scope.topicId,
          systemId: scope.systemId,
        })
      : Promise.resolve({ isDuplicate: false, maxSimilarity: 0 }),
    checkPayloadEmbeddingSimilarity(
      {
        stem: payload.stem,
        leadIn: payload.leadIn,
        options: payload.options,
        rationale: payload.rationale,
      },
      scope.examTrackId,
      { topicId: scope.topicId, systemId: scope.systemId }
    ),
  ]);

  metadata.stem_similarity = stemResult.maxSimilarity;
  metadata.payload_similarity = payloadResult.maxSimilarity;

  const stemExceeds = stemResult.maxSimilarity >= STEM_SIMILARITY_THRESHOLD;
  const payloadExceeds = payloadResult.maxSimilarity >= PAYLOAD_SIMILARITY_THRESHOLD;

  if (stemExceeds && payloadExceeds) {
    metadata.duplicate_reason = "repeated_management_angle";
    return { isDuplicate: true, reason: "repeated_management_angle", metadata };
  }
  if (stemExceeds) {
    metadata.duplicate_reason = "near_duplicate_stem";
    return { isDuplicate: true, reason: "near_duplicate_stem", metadata };
  }
  if (payloadExceeds) {
    metadata.duplicate_reason = "repeated_clinical_pattern";
    return { isDuplicate: true, reason: "repeated_clinical_pattern", metadata };
  }

  return { isDuplicate: false, metadata };
}
