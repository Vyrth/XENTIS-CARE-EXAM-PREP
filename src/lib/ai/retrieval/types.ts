/**
 * RAG retrieval types - approved content only
 */

/** Approved content types for retrieval */
export const APPROVED_CONTENT_TYPES = [
  "rationale",
  "distractor",
  "study_guide",
  "topic_summary",
  "flashcard",
  "video_transcript",
] as const;

export type ApprovedContentType = (typeof APPROVED_CONTENT_TYPES)[number];

/** Statuses that are approved for retrieval - exclude draft, rejected, etc. */
export const APPROVED_STATUSES = ["approved", "published"] as const;

export type ApprovedStatus = (typeof APPROVED_STATUSES)[number];

/** Content we do NOT retrieve from */
export const EXCLUDED_SOURCES = [
  "draft",
  "rejected",
  "internal_review",
  "legal_notes",
  "unpublished",
  "restricted",
] as const;

export interface RetrievalFilter {
  examTrack?: string;
  topicId?: string;
  systemId?: string;
  contentType?: ApprovedContentType | ApprovedContentType[];
  status?: ApprovedStatus | ApprovedStatus[];
  sourceField?: string;
}

/** Priority for retrieval: 1=source, 2=topic, 3=system, 4=track */
export interface RetrievalPriority {
  sourceContentId?: string;
  sourceContentType?: string;
  topicId?: string;
  systemId?: string;
  examTrack?: string;
}

export interface RetrievalOptions {
  limit?: number;
  maxContextChars?: number;
  filter?: RetrievalFilter;
  priority?: RetrievalPriority;
}

export interface RetrievalChunkRecord {
  id: string;
  content_type: string;
  content_id: string;
  chunk_index: number;
  chunk_text: string;
  metadata: Record<string, unknown> | null;
}
