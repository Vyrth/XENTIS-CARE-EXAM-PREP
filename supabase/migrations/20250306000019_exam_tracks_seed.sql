-- =============================================================================
-- Migration 019: Ensure exam_tracks are seeded
-- =============================================================================
-- Essential for onboarding. Ensures LVN/LPN, RN, FNP, PMHNP are always available
-- even when seed.sql is not run.
-- =============================================================================

INSERT INTO exam_tracks (slug, name, display_order) VALUES
  ('lvn', 'LVN/LPN', 1),
  ('rn', 'RN', 2),
  ('fnp', 'FNP', 3),
  ('pmhnp', 'PMHNP', 4)
ON CONFLICT (slug) DO NOTHING;
