-- =============================================================================
-- Migration 046: AI Factory RLS Policies
-- =============================================================================
-- Admins/service role only. Regular learners must not access campaigns, shards,
-- or dedupe registry. Uses pg_policies checks for idempotency.
-- =============================================================================

ALTER TABLE ai_generation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_shards ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_dedupe_registry ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ai_generation_campaigns: admins only
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_generation_campaigns'
      AND policyname = 'Admins can manage ai_generation_campaigns'
  ) THEN
    CREATE POLICY "Admins can manage ai_generation_campaigns"
      ON ai_generation_campaigns FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- ai_generation_shards: admins only
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_generation_shards'
      AND policyname = 'Admins can manage ai_generation_shards'
  ) THEN
    CREATE POLICY "Admins can manage ai_generation_shards"
      ON ai_generation_shards FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- content_dedupe_registry: admins only
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_dedupe_registry'
      AND policyname = 'Admins can manage content_dedupe_registry'
  ) THEN
    CREATE POLICY "Admins can manage content_dedupe_registry"
      ON content_dedupe_registry FOR ALL
      USING (is_admin());
  END IF;
END $$;
