-- =============================================================================
-- Migration 016: Profile Onboarding Fields
-- =============================================================================
-- Adds onboarding-specific columns for first sign-in flow.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_exam_date DATE,
  ADD COLUMN IF NOT EXISTS study_minutes_per_day INT,
  ADD COLUMN IF NOT EXISTS preferred_study_mode TEXT;

COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Null = not completed; set when user finishes onboarding';
COMMENT ON COLUMN profiles.preferred_study_mode IS 'e.g. focused, mixed, review';
