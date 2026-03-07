/**
 * Retrieval service - fetches approved platform content for RAG
 * Excludes: draft, rejected, internal_review, legal_notes
 */

import { APPROVED_CONTENT_STATUSES } from "@/config/ai-tutor";
import type { RetrievalChunk } from "@/types/ai-tutor";
import { MOCK_QUESTIONS, MOCK_IMAGE_QUESTION, MOCK_CASE_STUDY_QUESTION } from "@/data/mock/questions";
import { MOCK_STUDY_GUIDES_ADMIN } from "@/data/mock/admin";
import { MOCK_FLASHCARDS_ADMIN } from "@/data/mock/admin";
import { MOCK_TOPICS } from "@/data/mock/systems";

const APPROVED = new Set(APPROVED_CONTENT_STATUSES);

/** Simple text chunking - split by paragraphs, limit size */
function chunkText(text: string, maxChars: number): string[] {
  if (!text || text.length <= maxChars) return text ? [text] : [];
  const chunks: string[] = [];
  const paras = text.split(/\n\n+/);
  let current = "";
  for (const p of paras) {
    if (current.length + p.length > maxChars && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + p;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/** Build retrieval index from approved content (mock - replace with DB/vector search) */
function buildRetrievalIndex(): RetrievalChunk[] {
  const chunks: RetrievalChunk[] = [];

  const allQuestions = [...MOCK_QUESTIONS, MOCK_IMAGE_QUESTION, MOCK_CASE_STUDY_QUESTION];
  for (const q of allQuestions) {
    if (q.rationale) {
      chunkText(q.rationale, 600).forEach((t, i) => {
        chunks.push({
          contentType: "rationale",
          contentId: q.id,
          chunkText: t,
          metadata: { systemId: q.systemId, domainId: q.domainId },
        });
      });
    }
    if (q.stem) {
      chunks.push({
        contentType: "rationale",
        contentId: q.id,
        chunkText: q.stem,
        metadata: { systemId: q.systemId, type: "stem" },
      });
    }
  }

  for (const sg of MOCK_STUDY_GUIDES_ADMIN) {
    if (!APPROVED.has(sg.status as "approved" | "published")) continue;
    for (const sec of sg.sections ?? []) {
      chunkText(sec.content, 600).forEach((t, i) => {
        chunks.push({
          contentType: "study_guide",
          contentId: sec.id,
          chunkText: t,
          metadata: { guideId: sg.id, sectionTitle: sec.title, systemId: sg.systemId },
        });
      });
    }
  }

  for (const fc of MOCK_FLASHCARDS_ADMIN) {
    if (!APPROVED.has(fc.status as "approved" | "published")) continue;
    chunks.push({
      contentType: "flashcard",
      contentId: fc.id,
      chunkText: `${fc.front} → ${fc.back}`,
      metadata: { deckId: fc.deckId },
    });
  }

  for (const t of MOCK_TOPICS) {
    chunks.push({
      contentType: "topic_summary",
      contentId: t.id,
      chunkText: `${t.name} (${t.slug})`,
      metadata: { systemId: t.systemId, domainId: t.domainId },
    });
  }

  return chunks;
}

let cachedIndex: RetrievalChunk[] | null = null;

function getIndex(): RetrievalChunk[] {
  if (!cachedIndex) cachedIndex = buildRetrievalIndex();
  return cachedIndex;
}

/** Simple keyword retrieval - replace with vector similarity when embeddings available */
export function retrieveChunks(
  query: string,
  options?: { limit?: number; contentType?: RetrievalChunk["contentType"][] }
): RetrievalChunk[] {
  const limit = options?.limit ?? 8;
  const index = getIndex();
  const qLower = query.toLowerCase();
  const words = qLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = index
    .filter((c) => !options?.contentType || options.contentType.includes(c.contentType))
    .map((c) => {
      const text = c.chunkText.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (text.includes(w)) score += 1;
      }
      return { chunk: c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);

  return scored;
}
