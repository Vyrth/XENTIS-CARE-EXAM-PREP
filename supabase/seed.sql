-- =============================================================================
-- Seed Data (Optional - run after migrations)
-- =============================================================================
-- Essential lookup data for the platform to function.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exam_tracks
-- -----------------------------------------------------------------------------
INSERT INTO exam_tracks (slug, name, display_order) VALUES
  ('lvn', 'LVN/LPN', 1),
  ('rn', 'RN', 2),
  ('fnp', 'FNP', 3),
  ('pmhnp', 'PMHNP', 4)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- question_types
-- -----------------------------------------------------------------------------
INSERT INTO question_types (slug, name, display_order) VALUES
  ('single_best_answer', 'Single Best Answer', 1),
  ('multiple_response', 'Multiple Response', 2),
  ('select_n', 'Select N', 3),
  ('image_based', 'Image-Based', 4),
  ('chart_table_exhibit', 'Chart/Table Exhibit', 5),
  ('matrix', 'Matrix', 6),
  ('dropdown_cloze', 'Dropdown Cloze', 7),
  ('ordered_response', 'Ordered Response', 8),
  ('hotspot', 'Hotspot', 9),
  ('highlight_text_table', 'Highlight Text/Table', 10),
  ('case_study', 'Case Study', 11),
  ('bow_tie_analog', 'Bow-Tie Analog', 12),
  ('dosage_calc', 'Dosage Calculation', 13)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- admin_roles
-- -----------------------------------------------------------------------------
INSERT INTO admin_roles (slug, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform access'),
  ('content_editor', 'Content Editor', 'Edit questions, study materials'),
  ('support', 'Support', 'View user data, assist support'),
  ('analytics_viewer', 'Analytics Viewer', 'Read-only analytics access')
ON CONFLICT (slug) DO NOTHING;

-- Extended seed: systems, topics, questions, guides, flashcards, videos, AI templates
\ir seed_extended.sql
