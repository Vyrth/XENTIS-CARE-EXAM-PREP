-- =============================================================================
-- Phase 8: Safe Reset-to-Zero (Standalone SQL)
-- =============================================================================
-- Run via Supabase SQL Editor or: psql $DATABASE_URL -f scripts/reset-content.sql
-- Requires service role or SECURITY DEFINER execution.
--
-- Full reset (default):
--   SELECT admin_reset_content_zero(true);
--
-- Reset content but keep AI jobs/campaigns/dedupe:
--   SELECT admin_reset_content_zero(false);
-- =============================================================================

SELECT admin_reset_content_zero(true);
