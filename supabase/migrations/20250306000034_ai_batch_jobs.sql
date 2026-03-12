-- =============================================================================
-- Migration 034: AI Batch Jobs
-- =============================================================================
-- Tracks AI Content Factory batch generation runs. Links to ai_generation_audit
-- for progress and outcomes. Prevents mixed-track contamination.
-- =============================================================================

CREATE TYPE ai_batch_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS ai_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'question', 'study_guide', 'flashcard_deck', 'high_yield_summary'
  -- Scope: topic_ids or system_ids (JSONB array of UUIDs)
  topic_ids JSONB DEFAULT '[]', -- ["uuid", ...]
  system_ids JSONB DEFAULT '[]', -- ["uuid", ...]
  -- Targets
  target_count INT NOT NULL,
  quantity_per_topic INT, -- For questions: how many per topic
  -- Config
  difficulty_distribution JSONB DEFAULT '{}', -- { "1": 0.1, "2": 0.2, "3": 0.4, "4": 0.2, "5": 0.1 }
  board_focus TEXT,
  item_type_slug TEXT DEFAULT 'single_best_answer',
  study_guide_mode TEXT DEFAULT 'section_pack', -- 'full' | 'section_pack'
  section_count INT DEFAULT 4,
  flashcard_deck_mode TEXT DEFAULT 'rapid_recall',
  card_count INT DEFAULT 8,
  high_yield_type TEXT DEFAULT 'high_yield_summary',
  -- Progress
  status ai_batch_job_status NOT NULL DEFAULT 'pending',
  completed_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  skipped_duplicate_count INT NOT NULL DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_track ON ai_batch_jobs(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_status ON ai_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_created ON ai_batch_jobs(created_at DESC);

-- Link ai_generation_audit to batch job
ALTER TABLE ai_generation_audit
  ADD COLUMN IF NOT EXISTS batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_batch_job ON ai_generation_audit(batch_job_id) WHERE batch_job_id IS NOT NULL;

COMMENT ON TABLE ai_batch_jobs IS 'AI Content Factory batch generation runs. Single track per job.';
COMMENT ON COLUMN ai_batch_jobs.topic_ids IS 'Array of topic UUIDs to generate for. Empty = all topics in systems.';
COMMENT ON COLUMN ai_batch_jobs.system_ids IS 'Array of system UUIDs. If empty, uses all systems for track.';
COMMENT ON COLUMN ai_batch_jobs.difficulty_distribution IS 'Map of difficulty 1-5 to fraction, e.g. {"3": 0.4}.';
COMMENT ON COLUMN ai_batch_jobs.skipped_duplicate_count IS 'Questions skipped due to duplicate stem in scope.';
