-- =============================================================================
-- Migration 049: Content Dedupe Support
-- =============================================================================
-- Registry-based deduplication for AI-generated questions, flashcards,
-- study guides, high-yield content. Additive only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend content_dedupe_registry
-- -----------------------------------------------------------------------------
ALTER TABLE content_dedupe_registry ADD COLUMN IF NOT EXISTS normalized_text_preview TEXT;
ALTER TABLE content_dedupe_registry ADD COLUMN IF NOT EXISTS source_status TEXT;
ALTER TABLE content_dedupe_registry ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE content_dedupe_registry ADD COLUMN IF NOT EXISTS created_by_batch_plan_id UUID REFERENCES batch_plans(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Indexes on content_dedupe_registry
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_content_dedupe_registry_source ON content_dedupe_registry(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_content_dedupe_registry_track_system_topic ON content_dedupe_registry(exam_track_id, system_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_content_dedupe_registry_batch_plan ON content_dedupe_registry(created_by_batch_plan_id) WHERE created_by_batch_plan_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Hash columns on content tables (only if missing)
-- -----------------------------------------------------------------------------
ALTER TABLE questions ADD COLUMN IF NOT EXISTS normalized_stem_hash TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS normalized_content_hash TEXT;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS normalized_front_hash TEXT;
ALTER TABLE study_guides ADD COLUMN IF NOT EXISTS normalized_title_hash TEXT;
ALTER TABLE high_yield_content ADD COLUMN IF NOT EXISTS normalized_title_hash TEXT;
ALTER TABLE high_yield_content ADD COLUMN IF NOT EXISTS normalized_explanation_hash TEXT;

-- -----------------------------------------------------------------------------
-- Indexes on hash columns (for dedupe lookups)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_normalized_stem_hash ON questions(normalized_stem_hash) WHERE normalized_stem_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_normalized_content_hash ON questions(normalized_content_hash) WHERE normalized_content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flashcards_normalized_front_hash ON flashcards(normalized_front_hash) WHERE normalized_front_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_study_guides_normalized_title_hash ON study_guides(normalized_title_hash) WHERE normalized_title_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_high_yield_content_normalized_title_hash ON high_yield_content(normalized_title_hash) WHERE normalized_title_hash IS NOT NULL;
