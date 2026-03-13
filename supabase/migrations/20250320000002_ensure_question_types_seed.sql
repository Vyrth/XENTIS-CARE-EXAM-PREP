-- =============================================================================
-- Migration: Ensure question_types has all required rows for AI Factory
-- =============================================================================
-- Production may not have run seed.sql (only runs on db reset). AI Factory
-- question generation fails with "Question type 'single_best_answer' not found"
-- when question_types is empty. This migration seeds all required slugs.
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING. No db reset required.
-- =============================================================================

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
