-- =============================================================================
-- Migration 039: Production-Scale AI Batch Pipeline
-- =============================================================================
-- Master/child batch model, sharding, idempotency, extended status.
-- Supports 25,000+ questions in 24h with resumable, rate-limited workers.
-- =============================================================================

-- Extend ai_batch_job_status with queued, partial (safe for re-runs)
DO $$
BEGIN
  ALTER TYPE ai_batch_job_status ADD VALUE 'queued';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE ai_batch_job_status ADD VALUE 'partial';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Master batch: one plan can spawn many child jobs (shards)
CREATE TABLE IF NOT EXISTS ai_master_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  target_total_count INT NOT NULL,
  created_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled')),
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_master_batches_status ON ai_master_batches(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_master_batches_idempotency ON ai_master_batches(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add master_batch_id, shard_key, idempotency_key to ai_batch_jobs
ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS master_batch_id UUID REFERENCES ai_master_batches(id) ON DELETE SET NULL;
ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS shard_key TEXT;
ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_batch_jobs_idempotency ON ai_batch_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_master ON ai_batch_jobs(master_batch_id) WHERE master_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_shard ON ai_batch_jobs(shard_key) WHERE shard_key IS NOT NULL;

-- Add flashcard_style if missing (migration 35 may have added it)
ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS flashcard_style TEXT DEFAULT 'rapid_recall';

-- Idempotency table for generation requests (prevent duplicate API calls)
CREATE TABLE IF NOT EXISTS ai_generation_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  scope_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_idempotency_key ON ai_generation_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ai_generation_idempotency_scope ON ai_generation_idempotency(scope_hash);

-- Worker concurrency tracking (optional: for multi-worker coordination)
CREATE TABLE IF NOT EXISTS ai_batch_worker_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT NOT NULL,
  exam_track_id UUID REFERENCES exam_tracks(id) ON DELETE CASCADE,
  batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_batch_worker_slots_track ON ai_batch_worker_slots(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_ai_batch_worker_slots_expires ON ai_batch_worker_slots(expires_at);

-- Normalized stem hash for near-duplicate detection (optional index on questions)
-- Note: Add column via migration if not exists; index for batch dedupe lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'stem_normalized_hash'
  ) THEN
    ALTER TABLE questions ADD COLUMN stem_normalized_hash TEXT;
    CREATE INDEX IF NOT EXISTS idx_questions_stem_hash ON questions(stem_normalized_hash) WHERE stem_normalized_hash IS NOT NULL;
  END IF;
END $$;

COMMENT ON TABLE ai_master_batches IS 'Master batch plan: one plan spawns many sharded child jobs';
COMMENT ON COLUMN ai_batch_jobs.master_batch_id IS 'Parent master batch when job is a shard';
COMMENT ON COLUMN ai_batch_jobs.shard_key IS 'Shard identifier: track:system:topic:content_type';
COMMENT ON COLUMN ai_batch_jobs.idempotency_key IS 'Prevents duplicate job creation';
COMMENT ON TABLE ai_generation_idempotency IS 'Prevents duplicate API generation calls within a batch';
COMMENT ON TABLE ai_batch_worker_slots IS 'Tracks active worker claims for concurrency limits';
