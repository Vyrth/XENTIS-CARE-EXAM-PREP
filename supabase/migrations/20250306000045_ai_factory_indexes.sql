-- =============================================================================
-- Migration 045: AI Factory Indexes
-- =============================================================================
-- Indexes for ai_generation_campaigns, ai_generation_shards, content_dedupe_registry.
-- All CREATE INDEX IF NOT EXISTS.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_generation_campaigns_status ON ai_generation_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_shards_status_priority_created ON ai_generation_shards(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_shards_campaign_status ON ai_generation_shards(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_shards_track_content_status ON ai_generation_shards(exam_track_id, content_type, status);
CREATE INDEX IF NOT EXISTS idx_content_dedupe_registry_type_track ON content_dedupe_registry(content_type, exam_track_id);
CREATE INDEX IF NOT EXISTS idx_content_dedupe_registry_normalized_hash ON content_dedupe_registry(normalized_hash);
