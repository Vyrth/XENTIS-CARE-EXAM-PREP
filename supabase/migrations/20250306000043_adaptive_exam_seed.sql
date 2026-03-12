-- =============================================================================
-- Migration 043: Adaptive Exam Seed
-- =============================================================================
-- Seed one adaptive config per track: rn-cat, fnp-cat, pmhnp-cat, lvn-cat.
-- Idempotent: uses WHERE NOT EXISTS to avoid ON CONFLICT dependency on
-- constraint shape (038 has UNIQUE(slug), 040 has UNIQUE(exam_track_id, slug)).
-- Uses real exam_tracks from schema (id, slug, name).
-- =============================================================================

INSERT INTO adaptive_exam_configs (
  exam_track_id,
  slug,
  name,
  description,
  min_questions,
  max_questions,
  target_standard_error,
  passing_theta,
  content_balance_rules,
  exposure_rules,
  stop_rules
)
SELECT
  et.id,
  et.slug::text || '-cat',
  et.name || ' CAT',
  'Computerized adaptive exam for ' || et.name || ' board prep. IRT-based item selection.',
  75,
  150,
  0.30,
  0.00,
  '{}'::jsonb,
  '{}'::jsonb,
  '{"min_questions": 75, "max_questions": 150, "target_se": 0.30}'::jsonb
FROM exam_tracks et
WHERE et.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
  AND NOT EXISTS (
    SELECT 1 FROM adaptive_exam_configs aec
    WHERE aec.exam_track_id = et.id
      AND aec.slug = et.slug::text || '-cat'
  );
