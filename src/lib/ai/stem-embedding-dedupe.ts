/**
 * Stem Embedding Duplicate Detection
 *
 * Uses OpenAI text-embedding-3-small for semantic similarity.
 * Rejects or flags questions when similarity > 0.82 against existing stems.
 * Falls back to Jaccard/overlap when embedding API unavailable.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { getEmbedding } from "@/lib/ai/openai-client";
import { isLikelyDuplicate } from "@/lib/ai/similarity";

export const STEM_SIMILARITY_THRESHOLD = 0.82;

export interface StemSimilarityResult {
  isDuplicate: boolean;
  maxSimilarity: number;
  reason?: "embedding" | "fallback" | "exact";
  /** When embedding API unavailable, uses Jaccard/overlap */
  usedFallback?: boolean;
}

/**
 * Cosine similarity between two vectors (0-1, higher = more similar).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0;
}

/**
 * Check if stem is semantically similar to existing questions (embedding-based).
 * Returns { isDuplicate: true } when max similarity >= STEM_SIMILARITY_THRESHOLD.
 */
export async function checkStemEmbeddingSimilarity(
  stem: string,
  examTrackId: string,
  options?: { topicId?: string | null; systemId?: string | null }
): Promise<StemSimilarityResult> {
  const stemTrimmed = stem?.trim();
  if (!stemTrimmed) return { isDuplicate: false, maxSimilarity: 0 };

  if (!isSupabaseServiceRoleConfigured()) {
    return { isDuplicate: false, maxSimilarity: 0 };
  }

  const embedding = await getEmbedding(stemTrimmed);
  const supabase = createServiceClient();

  if (embedding && embedding.length > 0) {
    try {
      const { data: rows, error } = await supabase
        .from("question_stem_embeddings")
        .select("question_id, embedding")
        .eq("exam_track_id", examTrackId)
        .limit(200);

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[stem-embedding-dedupe] vector query failed, falling back:", error.message);
        }
        return checkStemFallbackSimilarity(stemTrimmed, examTrackId, options);
      }

      let maxSim = 0;
      for (const row of rows ?? []) {
        const raw = (row as { embedding?: number[] | string }).embedding;
        const existingEmb = Array.isArray(raw) ? raw : (typeof raw === "string" ? parseEmbeddingString(raw) : null);
        if (existingEmb && existingEmb.length === embedding.length) {
          const sim = cosineSimilarity(embedding, existingEmb);
          if (sim > maxSim) maxSim = sim;
          if (maxSim >= STEM_SIMILARITY_THRESHOLD) break;
        }
      }

      return {
        isDuplicate: maxSim >= STEM_SIMILARITY_THRESHOLD,
        maxSimilarity: maxSim,
        reason: maxSim >= STEM_SIMILARITY_THRESHOLD ? "embedding" : undefined,
      };
    } catch {
      return checkStemFallbackSimilarity(stemTrimmed, examTrackId, options);
    }
  }

  return checkStemFallbackSimilarity(stemTrimmed, examTrackId, options);
}

function parseEmbeddingString(s: string): number[] | null {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.map(Number) : null;
  } catch {
    return null;
  }
}

/**
 * Fallback: Jaccard + overlap when embedding API unavailable.
 * Uses threshold 0.82 (stricter than previous 0.88).
 */
async function checkStemFallbackSimilarity(
  stem: string,
  examTrackId: string,
  options?: { topicId?: string | null; systemId?: string | null }
): Promise<StemSimilarityResult> {
  if (!isSupabaseServiceRoleConfigured()) return { isDuplicate: false, maxSimilarity: 0 };
  const supabase = createServiceClient();

  let q = supabase
    .from("questions")
    .select("stem")
    .eq("exam_track_id", examTrackId)
    .not("stem", "is", null)
    .limit(100);
  if (options?.topicId) q = q.eq("topic_id", options.topicId);
  else q = q.is("topic_id", null);
  if (options?.systemId) q = q.eq("system_id", options.systemId);

  const { data: stems } = await q;
  let maxSim = 0;
  for (const row of stems ?? []) {
    const s = (row as { stem?: string }).stem;
    if (!s) continue;
    if (isLikelyDuplicate(stem, s, STEM_SIMILARITY_THRESHOLD)) {
      return {
        isDuplicate: true,
        maxSimilarity: STEM_SIMILARITY_THRESHOLD,
        reason: "fallback",
        usedFallback: true,
      };
    }
  }
  return { isDuplicate: false, maxSimilarity: 0, usedFallback: true };
}

/** Payload similarity threshold (full question: stem + options + rationale) */
export const PAYLOAD_SIMILARITY_THRESHOLD = 0.88;

export interface PayloadSimilarityResult {
  isDuplicate: boolean;
  maxSimilarity: number;
  reason?: "embedding";
}

/**
 * Build canonical payload text for embedding (stem + leadIn + options + rationale).
 */
export function buildPayloadTextForEmbedding(payload: {
  stem?: string;
  leadIn?: string;
  options?: { key?: string; text?: string }[];
  rationale?: string;
}): string {
  const parts: string[] = [];
  if (payload.stem?.trim()) parts.push(payload.stem.trim());
  if (payload.leadIn?.trim()) parts.push(payload.leadIn.trim());
  if (Array.isArray(payload.options)) {
    for (const o of payload.options) {
      if (o?.text?.trim()) parts.push(o.text.trim());
    }
  }
  if (payload.rationale?.trim()) parts.push(payload.rationale.trim());
  return parts.join("\n\n");
}

/**
 * Check if full payload is semantically similar to existing questions.
 * Returns { isDuplicate: true } when max similarity >= PAYLOAD_SIMILARITY_THRESHOLD.
 */
export async function checkPayloadEmbeddingSimilarity(
  payload: { stem?: string; leadIn?: string; options?: { key?: string; text?: string }[]; rationale?: string },
  examTrackId: string,
  options?: { topicId?: string | null; systemId?: string | null }
): Promise<PayloadSimilarityResult> {
  const text = buildPayloadTextForEmbedding(payload);
  if (!text || text.length < 20) return { isDuplicate: false, maxSimilarity: 0 };

  if (!isSupabaseServiceRoleConfigured()) return { isDuplicate: false, maxSimilarity: 0 };

  const embedding = await getEmbedding(text.slice(0, 8000));
  if (!embedding || embedding.length === 0) return { isDuplicate: false, maxSimilarity: 0 };

  const supabase = createServiceClient();
  try {
    const { data: rows, error } = await supabase
      .from("question_content_embeddings")
      .select("question_id, embedding")
      .eq("exam_track_id", examTrackId)
      .limit(200);

    if (error) return { isDuplicate: false, maxSimilarity: 0 };

    let maxSim = 0;
    for (const row of rows ?? []) {
      const raw = (row as { embedding?: number[] | string }).embedding;
      const existingEmb = Array.isArray(raw) ? raw : (typeof raw === "string" ? parseEmbeddingString(raw) : null);
      if (existingEmb && existingEmb.length === embedding.length) {
        const sim = cosineSimilarity(embedding, existingEmb);
        if (sim > maxSim) maxSim = sim;
        if (maxSim >= PAYLOAD_SIMILARITY_THRESHOLD) break;
      }
    }

    return {
      isDuplicate: maxSim >= PAYLOAD_SIMILARITY_THRESHOLD,
      maxSimilarity: maxSim,
      reason: maxSim >= PAYLOAD_SIMILARITY_THRESHOLD ? "embedding" : undefined,
    };
  } catch {
    return { isDuplicate: false, maxSimilarity: 0 };
  }
}

/**
 * Store content (payload) embedding after question is saved.
 */
export async function storeContentEmbedding(
  questionId: string,
  examTrackId: string,
  payload: { stem?: string; leadIn?: string; options?: { key?: string; text?: string }[]; rationale?: string }
): Promise<boolean> {
  const text = buildPayloadTextForEmbedding(payload);
  if (!text || !isSupabaseServiceRoleConfigured()) return false;

  const embedding = await getEmbedding(text.slice(0, 8000));
  if (!embedding || embedding.length === 0) return false;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("question_content_embeddings").upsert(
      {
        question_id: questionId,
        exam_track_id: examTrackId,
        embedding: embedding,
      },
      { onConflict: "question_id" }
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Store stem embedding after question is saved.
 */
export async function storeStemEmbedding(
  questionId: string,
  examTrackId: string,
  stem: string
): Promise<boolean> {
  const stemTrimmed = stem?.trim();
  if (!stemTrimmed || !isSupabaseServiceRoleConfigured()) return false;

  const embedding = await getEmbedding(stemTrimmed);
  if (!embedding || embedding.length === 0) return false;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("question_stem_embeddings").upsert(
      {
        question_id: questionId,
        exam_track_id: examTrackId,
        embedding: embedding,
      },
      { onConflict: "question_id" }
    );
    return !error;
  } catch {
    return false;
  }
}
