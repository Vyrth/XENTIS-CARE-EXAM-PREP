-- =============================================================================
-- Migration 053: Adaptive and AI Factory Seed (Idempotent)
-- =============================================================================
-- Seeds adaptive_exam_configs, track_blueprint_targets, and one default
-- ai_generation_campaigns template. Uses real exam_tracks. Prefers WHERE NOT
-- EXISTS. Ref: docs/SCHEMA_DISCOVERY_REPORT.md, docs/SEED_CONTENT_DISTRIBUTION.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. adaptive_exam_configs (one per track: rn, fnp, pmhnp, lvn)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'adaptive_exam_configs') THEN
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
  CASE et.slug::text
    WHEN 'lvn' THEN 60
    WHEN 'rn' THEN 75
    WHEN 'fnp' THEN 75
    WHEN 'pmhnp' THEN 75
    ELSE 75
  END,
  CASE et.slug::text
    WHEN 'lvn' THEN 120
    WHEN 'rn' THEN 150
    WHEN 'fnp' THEN 150
    WHEN 'pmhnp' THEN 150
    ELSE 150
  END,
  0.30,
  0.00,
  '{}'::jsonb,
  '{}'::jsonb,
  '{"min_questions": 75, "max_questions": 150, "target_se": 0.30}'::jsonb
FROM exam_tracks et
WHERE et.slug::text IN ('rn', 'fnp', 'pmhnp', 'lvn')
  AND NOT EXISTS (
    SELECT 1 FROM adaptive_exam_configs aec
    WHERE aec.exam_track_id = et.id
      AND aec.slug = et.slug::text || '-cat'
  );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. track_blueprint_targets (minimal starter: questions, study_guides,
--    flashcard_deck, high_yield per track; track-level only, domain/system/topic NULL)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'track_blueprint_targets') THEN
    INSERT INTO track_blueprint_targets (
      exam_track_id,
      domain_id,
      system_id,
      topic_id,
      content_type,
      target_count,
      min_count,
      max_count
    )
    SELECT
      et.id,
      NULL,
      NULL,
      NULL,
      ct.content_type,
      0,
      NULL,
      NULL
    FROM exam_tracks et
    CROSS JOIN (
      SELECT unnest(ARRAY['question', 'study_guide', 'flashcard_deck', 'high_yield']) AS content_type
    ) ct
    WHERE et.slug::text IN ('rn', 'fnp', 'pmhnp', 'lvn')
      AND NOT EXISTS (
        SELECT 1 FROM track_blueprint_targets tbt
        WHERE tbt.exam_track_id = et.id
          AND tbt.domain_id IS NULL
          AND tbt.system_id IS NULL
          AND tbt.topic_id IS NULL
          AND tbt.content_type = ct.content_type
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. AI campaign template table: none exists. Skip.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4. ai_generation_campaigns: one default "24-hour launch campaign template"
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_generation_campaigns') THEN
    INSERT INTO ai_generation_campaigns (name, status, config)
    SELECT
      '24-hour launch campaign template',
      'draft',
      '{
        "description": "Default template for 24h AI content generation campaign",
        "targetByTrackContent": {
          "question": {"rn": 2000, "fnp": 1500, "pmhnp": 1000, "lvn": 800},
          "study_guide": {"rn": 200, "fnp": 150, "pmhnp": 100, "lvn": 80},
          "flashcard_deck": {"rn": 100, "fnp": 75, "pmhnp": 50, "lvn": 40},
          "high_yield_summary": {"rn": 100, "fnp": 75, "pmhnp": 50, "lvn": 40}
        },
        "maxConcurrency": 4,
        "modelName": "gpt-4o-mini",
        "dryRun": false
      }'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM ai_generation_campaigns
      WHERE name = '24-hour launch campaign template'
    );
  END IF;
END $$;
