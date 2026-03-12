-- =============================================================================
-- Migration: Pre-Practice I-V use 75-100 questions (balanced blueprint coverage)
-- =============================================================================
-- Updates assembly_rules.totalCount from 150 to 85 (middle of 75-100 range).
-- =============================================================================

UPDATE pre_practice_versions
SET assembly_rules = jsonb_set(
  COALESCE(assembly_rules, '{}'::jsonb),
  '{totalCount}',
  '85'::jsonb
)
WHERE version_key IN ('i', 'ii', 'iii', 'iv', 'v');
