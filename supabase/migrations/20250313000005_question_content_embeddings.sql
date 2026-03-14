-- =============================================================================
-- Migration: Question Content Embeddings for Payload Duplicate Detection
-- =============================================================================
-- Stores embeddings for full question payload (stem + leadIn + options + rationale).
-- Enables cosine similarity check: reject if similarity > 0.88 vs existing.
-- Complements question_stem_embeddings (stem-only, 0.82 threshold).
-- =============================================================================

CREATE TABLE IF NOT EXISTS question_content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_content_embeddings_track
  ON question_content_embeddings(exam_track_id);

COMMENT ON TABLE question_content_embeddings IS 'Full payload embeddings for semantic duplicate detection (similarity > 0.88 = reject)';
