/**
 * RAG Retrieval Service - fetches approved platform content for AI grounding.
 * Uses ai_chunks table with metadata filters. Returns empty when no chunks (no mock fallback).
 */

import { createClient } from "@/lib/supabase/server";
import { AI_TUTOR_CONFIG } from "@/config/ai-tutor";
import {
  formatChunksForContext,
  packageRetrievedContext,
} from "./context-packager";
import type {
  RetrievalFilter,
  RetrievalOptions,
  RetrievalPriority,
  RetrievalChunkRecord,
} from "./types";
import type { RetrievalChunk } from "@/types/ai-tutor";

/** Convert DB row to RetrievalChunk */
function toRetrievalChunk(row: RetrievalChunkRecord): RetrievalChunk {
  return {
    contentType: row.content_type as RetrievalChunk["contentType"],
    contentId: row.content_id,
    chunkText: row.chunk_text,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
  };
}

/** Keyword score for ranking when vector search not available */
function keywordScore(query: string, text: string): number {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const textLower = text.toLowerCase();
  let score = 0;
  for (const w of words) {
    if (textLower.includes(w)) score += 1;
  }
  return score;
}

/** Priority score: 1=source, 2=topic, 3=system, 4=track */
function priorityScore(c: RetrievalChunkRecord, priority?: RetrievalPriority): number {
  if (!priority) return 0;
  const meta = (c.metadata ?? {}) as Record<string, string>;
  let score = 0;
  if (priority.sourceContentId && c.content_id === priority.sourceContentId) score += 100;
  if (priority.sourceContentType && c.content_type === priority.sourceContentType) score += 50;
  if (priority.topicId && meta.topic_id === priority.topicId) score += 30;
  if (priority.systemId && meta.system_id === priority.systemId) score += 20;
  if (priority.examTrack && (meta.exam_track_id === priority.examTrack || meta.exam_track === priority.examTrack)) score += 10;
  return score;
}

/** Check if chunk passes metadata filter (approved content only) */
function passesFilter(row: RetrievalChunkRecord, filter?: RetrievalFilter): boolean {
  const meta = (row.metadata ?? {}) as Record<string, string>;
  const status = meta?.status;
  if (status && status !== "approved" && status !== "published") return false;
  if (filter?.examTrack && meta.exam_track_id !== filter.examTrack && meta.exam_track !== filter.examTrack) return false;
  if (filter?.topicId && meta.topic_id !== filter.topicId) return false;
  if (filter?.systemId && meta.system_id !== filter.systemId) return false;
  if (filter?.contentType) {
    const types = Array.isArray(filter.contentType) ? filter.contentType : [filter.contentType];
    if (!types.includes(row.content_type as never)) return false;
  }
  return true;
}

/** Fetch chunks from ai_chunks table */
async function fetchChunksFromDB(
  query: string,
  options: RetrievalOptions
): Promise<RetrievalChunk[]> {
  try {
    const supabase = await createClient();
    const limit = options.limit ?? AI_TUTOR_CONFIG.maxRetrievalChunks;
    const filter = options.filter;
    const priority = options.priority;

    const { data: rows, error } = await supabase
      .from("ai_chunks")
      .select("id, content_type, content_id, chunk_index, chunk_text, metadata")
      .limit(limit * 4);

    if (error) {
      console.warn("[RAG] ai_chunks query failed:", error.message);
      return [];
    }

    if (!rows || rows.length === 0) return [];

    const chunks = rows as RetrievalChunkRecord[];
    const filtered = filter ? chunks.filter((c) => passesFilter(c, filter)) : chunks;

    const scored = filtered
      .map((c) => ({
        chunk: c,
        score: keywordScore(query, c.chunk_text) * 2 + priorityScore(c, priority),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => toRetrievalChunk(s.chunk));

    return scored;
  } catch (err) {
    console.warn("[RAG] fetchChunksFromDB error:", err);
    return [];
  }
}

/** Main retrieval: fetches from ai_chunks. Returns [] when no chunks (no mock fallback). */
export async function retrieveChunks(
  query: string,
  options?: RetrievalOptions
): Promise<RetrievalChunk[]> {
  const limit = options?.limit ?? AI_TUTOR_CONFIG.maxRetrievalChunks;

  const dbChunks = await fetchChunksFromDB(query, { ...options, limit });

  if (dbChunks.length > 0) return dbChunks;

  return [];
}

/** Format chunks for AI context string */
export function formatRetrievedContext(chunks: RetrievalChunk[]): string {
  return packageRetrievedContext(chunks, {
    maxChars: 4000,
    fallbackMessage: "(No relevant platform content found. Use general nursing knowledge.)",
  });
}

/** One-shot: retrieve and package for AI prompt */
export async function retrieveAndPackageContext(
  query: string,
  options?: RetrievalOptions
): Promise<{ context: string; chunks: RetrievalChunk[] }> {
  const chunks = await retrieveChunks(query, options);
  const context = formatRetrievedContext(chunks);
  return { context, chunks };
}

export type { RetrievalFilter, RetrievalOptions, RetrievalPriority } from "./types";
