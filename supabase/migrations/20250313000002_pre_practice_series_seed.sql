-- =============================================================================
-- Migration: Seed Pre-Practice Series I-V for each track
-- =============================================================================
-- Creates pre_practice_series and pre_practice_versions for RN, FNP, PMHNP, LVN/LPN.
-- I = hard diagnostic, II = easier reinforcement, III = moderate mixed,
-- IV = extremely hard / board-like, V = final board-style readiness.
-- =============================================================================

INSERT INTO pre_practice_series (exam_track_id, name)
SELECT id, 'Pre-Practice Series'
FROM exam_tracks
WHERE slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (exam_track_id) DO NOTHING;

-- Pre-Practice I: Hard diagnostic (tiers 4-5)
INSERT INTO pre_practice_versions (series_id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules)
SELECT s.id, 'i', 'Pre-Practice I', 'Hard diagnostic exam to identify knowledge gaps', 'hard_diagnostic', 1,
  '{"totalCount": 85, "byDifficulty": [{"tier": 4, "target": 75}, {"tier": 5, "target": 75}]}'::jsonb
FROM pre_practice_series s
JOIN exam_tracks t ON t.id = s.exam_track_id
WHERE t.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (series_id, version_key) DO NOTHING;

-- Pre-Practice II: Easier reinforcement (tiers 1-2)
INSERT INTO pre_practice_versions (series_id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules)
SELECT s.id, 'ii', 'Pre-Practice II', 'Easier reinforcement to build confidence', 'easier_reinforcement', 2,
  '{"totalCount": 85, "byDifficulty": [{"tier": 1, "target": 75}, {"tier": 2, "target": 75}]}'::jsonb
FROM pre_practice_series s
JOIN exam_tracks t ON t.id = s.exam_track_id
WHERE t.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (series_id, version_key) DO NOTHING;

-- Pre-Practice III: Moderate mixed (tiers 2-3-4)
INSERT INTO pre_practice_versions (series_id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules)
SELECT s.id, 'iii', 'Pre-Practice III', 'Moderate mixed difficulty for balanced practice', 'moderate_mixed', 3,
  '{"totalCount": 85, "byDifficulty": [{"tier": 2, "target": 50}, {"tier": 3, "target": 50}, {"tier": 4, "target": 50}]}'::jsonb
FROM pre_practice_series s
JOIN exam_tracks t ON t.id = s.exam_track_id
WHERE t.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (series_id, version_key) DO NOTHING;

-- Pre-Practice IV: Extremely hard / board-like (tiers 4-5, heavy on 5)
INSERT INTO pre_practice_versions (series_id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules)
SELECT s.id, 'iv', 'Pre-Practice IV', 'Extremely hard board-style challenge', 'extremely_hard', 4,
  '{"totalCount": 85, "byDifficulty": [{"tier": 4, "target": 50}, {"tier": 5, "target": 100}]}'::jsonb
FROM pre_practice_series s
JOIN exam_tracks t ON t.id = s.exam_track_id
WHERE t.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (series_id, version_key) DO NOTHING;

-- Pre-Practice V: Final board-style readiness (tiers 3-4-5)
INSERT INTO pre_practice_versions (series_id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules)
SELECT s.id, 'v', 'Pre-Practice V', 'Final board-style readiness exam', 'final_readiness', 5,
  '{"totalCount": 85, "byDifficulty": [{"tier": 3, "target": 50}, {"tier": 4, "target": 50}, {"tier": 5, "target": 50}]}'::jsonb
FROM pre_practice_series s
JOIN exam_tracks t ON t.id = s.exam_track_id
WHERE t.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (series_id, version_key) DO NOTHING;
