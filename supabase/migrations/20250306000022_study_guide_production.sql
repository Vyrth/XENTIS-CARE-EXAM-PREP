-- =============================================================================
-- Migration 022: Study Guide Production Studio
-- =============================================================================
-- Adds topic_id to study_guides and section_metadata JSONB to study_material_sections
-- for structured, AI-ready, highlightable study guide content.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- study_guides: add topic_id
-- -----------------------------------------------------------------------------
ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_guides_topic ON study_guides(topic_id) WHERE topic_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- study_material_sections: add section_metadata
-- -----------------------------------------------------------------------------
-- section_metadata JSONB structure:
-- {
--   "plainExplanation": "string",
--   "boardExplanation": "string",
--   "keyTakeaways": ["string"],
--   "commonTraps": ["string"],
--   "comparisonTable": { "headers": ["A","B"], "rows": [["...","..."]] },
--   "mnemonics": ["string"],
--   "highYield": boolean,
--   "isHighlightable": boolean,
--   "estimatedReadMinutes": number
-- }
ALTER TABLE study_material_sections
  ADD COLUMN IF NOT EXISTS section_metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_study_material_sections_metadata ON study_material_sections USING gin(section_metadata);
