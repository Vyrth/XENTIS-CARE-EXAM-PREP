-- =============================================================================
-- Migration: Enable auto-publish for AI Factory content types
-- =============================================================================
-- Enables autonomous publishing for question, study_guide, flashcard_deck,
-- high_yield_content when quality gates pass. Videos remain excluded.
-- =============================================================================

-- Ensure all four AI Factory content types exist (idempotent).
-- require_source_mapping = true: all content now gets content_evidence_metadata automatically.
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

-- Videos: explicitly excluded (no row in auto_publish_config = no auto-publish)
