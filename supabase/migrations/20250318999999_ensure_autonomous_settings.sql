-- =============================================================================
-- Migration: Ensure autonomous_settings exists (prerequisite for cadence migration)
-- =============================================================================
-- Runs BEFORE 20250319000001_autonomous_generation_cadence.sql.
-- Production may have autonomous_settings from 20250314000001, but fresh/staging
-- DBs or migration lineage issues can leave the table missing. This migration
-- is self-healing: CREATE TABLE IF NOT EXISTS, RLS idempotent.
-- =============================================================================

-- Create table if not exists (matches 20250314000001 schema)
CREATE TABLE IF NOT EXISTS autonomous_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value_json JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE autonomous_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'autonomous_settings' AND policyname = 'Authenticated read autonomous_settings'
  ) THEN
    CREATE POLICY "Authenticated read autonomous_settings" ON autonomous_settings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'autonomous_settings' AND policyname = 'Admins manage autonomous_settings'
  ) THEN
    CREATE POLICY "Admins manage autonomous_settings" ON autonomous_settings FOR ALL USING (is_admin());
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
