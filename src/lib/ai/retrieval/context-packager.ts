/**
 * Chunk formatting and AI context packaging for RAG
 */

import { AI_TUTOR_CONFIG } from "@/config/ai-tutor";
import type { RetrievalChunk } from "@/types/ai-tutor";

/** Format a single chunk for inclusion in AI context */
export function formatChunk(chunk: { chunkText: string; contentId?: string; contentType?: string }, index: number): string {
  const prefix = `[${index + 1}]`;
  const text = chunk.chunkText.slice(0, AI_TUTOR_CONFIG.maxChunkChars);
  return `${prefix} ${text}`;
}

/** Format multiple chunks into a single context string for AI prompts */
export function formatChunksForContext(
  chunks: { chunkText: string; contentId?: string; contentType?: string }[],
  separator = "\n\n---\n\n"
): string {
  if (chunks.length === 0) return "";
  return chunks.map((c, i) => formatChunk(c, i)).join(separator);
}

/** Package retrieved chunks into AI-ready context with fallback message */
export function packageRetrievedContext(
  chunks: RetrievalChunk[],
  options?: { maxChars?: number; fallbackMessage?: string }
): string {
  const maxChars = options?.maxChars ?? 4000;
  const fallback = options?.fallbackMessage ?? "(No relevant platform content found. Use general nursing knowledge.)";

  if (!chunks || chunks.length === 0) return fallback;

  const formatted = formatChunksForContext(chunks);
  if (formatted.length > maxChars) {
    return formatted.slice(0, maxChars) + "\n\n[...truncated]";
  }
  return formatted;
}
