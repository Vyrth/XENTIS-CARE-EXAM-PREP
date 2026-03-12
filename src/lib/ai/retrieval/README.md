# RAG Retrieval Service

Grounds AI answers in approved platform content. Uses ai_chunks table with metadata filters. Returns empty context when no chunks match (no mock fallback).

## Approved Sources

- question rationales
- distractor explanations
- study guide sections
- topic summaries
- flashcards
- video transcripts

## Excluded

- draft, rejected, internal_review, legal_notes
- unpublished, restricted copyrighted material

## Usage

```ts
import { retrieveChunks, retrieveAndPackageContext } from "@/lib/ai/retrieval";

// Retrieve and format for AI prompt
const { context, chunks } = await retrieveAndPackageContext(query, {
  limit: 8,
  filter: { examTrack: "rn", topicId: "top-1", systemId: "sys-1" },
  priority: {
    sourceContentId: "sec-123",
    topicId: "top-1",
    systemId: "sys-1",
    examTrack: "rn",
  },
});

// Or use action-specific helpers
import { retrieveForExplainHighlight } from "@/lib/ai/retrieval/retrieve-for-action";
const { context } = await retrieveForExplainHighlight({
  query: selectedText,
  examTrack: "rn",
  topicId,
  systemId,
  sourceId,
});
```

## Retrieval Priority

1. Current source content (sourceContentId match)
2. Same topic content (topicId match)
3. Same system content (systemId match)
4. Same track content (examTrack match)

## Metadata Filtering

ai_chunks.metadata (JSONB) should include:

- `status`: "approved" | "published" (required for retrieval)
- `exam_track_id` or `exam_track`
- `topic_id`
- `system_id`
- `source_field` (optional)

## Empty State

When ai_chunks returns no rows (empty table or no matches), retrieval returns an empty array. The AI receives a fallback message: "(No relevant platform content found. Use general nursing knowledge.)" — no mock or synthetic content is used.

## Vector Search (Future)

When pgvector is enabled on ai_chunks:

1. Add `embedding vector(1536)` column
2. Use `getEmbedding()` from openai-client to embed query
3. Use `<=>` or cosine similarity in Supabase query
4. Replace keyword scoring with vector similarity

## Example Flow

```
User highlights "MONA for MI"
  → retrieveForExplainHighlight({ query: "MONA for MI", examTrack: "rn", ... })
  → fetchChunksFromDB (ai_chunks) → empty when no matches
  → formatRetrievedContext(chunks)
  → runExplainHighlight(..., { retrievedContext })
  → AI receives: "[1] MONA: Morphine, Oxygen...\n\n---\n\n[2] ..."
```
