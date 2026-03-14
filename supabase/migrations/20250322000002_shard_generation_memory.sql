-- =============================================================================
-- Migration: Shard Generation Memory for Scenario Diversification
-- =============================================================================
-- Stores recent scenario archetypes per scope so new generations avoid repetition.
-- scope_key = trackId:systemId:topicId (or trackId:systemId:all for system-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS shard_generation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key TEXT NOT NULL UNIQUE,
  recent_archetypes JSONB NOT NULL DEFAULT '[]',
  recent_stem_openings JSONB NOT NULL DEFAULT '[]',
  recent_complaint_patterns JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shard_generation_memory_scope ON shard_generation_memory(scope_key);

COMMENT ON TABLE shard_generation_memory IS 'Per-scope generation memory: recent archetypes and stem openings to avoid repetition';
