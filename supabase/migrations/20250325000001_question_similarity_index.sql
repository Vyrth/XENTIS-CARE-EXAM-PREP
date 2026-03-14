-- =============================================================================
-- Migration: question_similarity_index
-- =============================================================================
-- Lightweight index for duplicate detection (Phase 1): hashes + scenario key.
-- Updated after each question save for fast candidate lookup by scope.
-- =============================================================================

CREATE TABLE IF NOT EXISTS question_similarity_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  normalized_stem_hash TEXT NOT NULL,
  normalized_content_hash TEXT NOT NULL,
  scenario_archetype_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_similarity_index_track ON question_similarity_index(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_question_similarity_index_scope ON question_similarity_index(exam_track_id, topic_id, system_id);
CREATE INDEX IF NOT EXISTS idx_question_similarity_index_stem_hash ON question_similarity_index(normalized_stem_hash) WHERE normalized_stem_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_similarity_index_content_hash ON question_similarity_index(normalized_content_hash) WHERE normalized_content_hash IS NOT NULL;

COMMENT ON TABLE question_similarity_index IS 'Phase 1 duplicate detection: hashes and scenario key per question for deterministic candidate lookup.';
