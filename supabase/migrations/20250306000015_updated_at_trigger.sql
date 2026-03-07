-- =============================================================================
-- Migration 015: updated_at Trigger
-- =============================================================================
-- Design: Auto-update updated_at on row change. Applied to all tables with
-- updated_at column.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at. Trigger names must be unique per table.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid
          AND a.attname = 'updated_at'
          AND NOT a.attisdropped
      )
  ) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_%s ON %I;
       CREATE TRIGGER set_updated_at_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      r.relname, r.relname, r.relname, r.relname
    );
  END LOOP;
END;
$$;
