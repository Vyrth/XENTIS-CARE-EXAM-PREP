-- =============================================================================
-- Migration: Question Stem Embeddings for Semantic Duplicate Detection
-- =============================================================================
-- Stores OpenAI text-embedding-3-small vectors (1536 dims) for question stems.
-- Enables fast cosine similarity check: reject if similarity > 0.82 vs existing.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- question_stem_embeddings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_stem_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_stem_embeddings_track
  ON question_stem_embeddings(exam_track_id);

-- ivfflat index for vector search (create after table has data; optional for <10k rows)
-- CREATE INDEX idx_question_stem_embeddings_embedding
--   ON question_stem_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE question_stem_embeddings IS 'Stem embeddings for semantic duplicate detection (similarity > 0.82 = reject)';
