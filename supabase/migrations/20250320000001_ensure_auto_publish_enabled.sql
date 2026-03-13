-- =============================================================================
-- Migration: Ensure auto-publish is enabled for all AI Factory content types
-- =============================================================================
-- Belt-and-suspenders: production may have run earlier migrations that left
-- enabled=false. This migration explicitly enables all four content types.
-- Idempotent: safe on partially seeded DBs. Preserves require_track_assigned
-- and require_source_mapping (no change).
-- =============================================================================

-- Ensure rows exist, then enable (handles DBs that missed 20250315999999)
INSERT INTO auto_publish_config (content_type, enabled, min_quality_score, require_track_assigned, require_no_duplicate, require_answer_rationale_consistent, require_source_mapping)
VALUES
  ('question', true, 75, true, true, true, true),
  ('study_guide', true, 70, true, true, true, true),
  ('flashcard_deck', true, 70, true, true, true, true),
  ('high_yield_content', true, 70, true, true, true, true)
ON CONFLICT (content_type) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  min_quality_score = EXCLUDED.min_quality_score,
  require_track_assigned = EXCLUDED.require_track_assigned,
  require_no_duplicate = EXCLUDED.require_no_duplicate,
  require_answer_rationale_consistent = EXCLUDED.require_answer_rationale_consistent,
  require_source_mapping = EXCLUDED.require_source_mapping,
  updated_at = now();
