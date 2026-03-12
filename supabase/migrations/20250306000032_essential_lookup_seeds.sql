-- =============================================================================
-- Migration 032: Essential Lookup Seeds
-- =============================================================================
-- Ensures admin_roles base values exist when seed.sql is not run.
-- Idempotent: ON CONFLICT DO NOTHING.
-- =============================================================================

INSERT INTO admin_roles (slug, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform access'),
  ('content_editor', 'Content Editor', 'Edit questions, study materials'),
  ('support', 'Support', 'View user data, assist support'),
  ('analytics_viewer', 'Analytics Viewer', 'Read-only analytics access')
ON CONFLICT (slug) DO NOTHING;
