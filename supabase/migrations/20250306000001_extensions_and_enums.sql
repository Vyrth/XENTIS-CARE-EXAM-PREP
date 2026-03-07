-- =============================================================================
-- Migration 001: Extensions and Enums
-- =============================================================================
-- Design: Use PostgreSQL enums for fixed value sets. Alternative: lookup tables
-- with FK. Enums chosen for: (1) type safety, (2) compact storage, (3) clear
-- schema. For values that may change often, consider migrating to lookup tables.
-- =============================================================================

-- Required for UUID generation (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional: for full-text search on content (future)
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Taxonomy / Assessment Enums
-- -----------------------------------------------------------------------------

CREATE TYPE exam_track_slug AS ENUM ('lvn', 'rn', 'fnp', 'pmhnp');

CREATE TYPE question_type_slug AS ENUM (
  'single_best_answer',
  'multiple_response',
  'select_n',
  'image_based',
  'chart_table_exhibit',
  'matrix',
  'dropdown_cloze',
  'ordered_response',
  'hotspot',
  'highlight_text_table',
  'case_study',
  'bow_tie_analog',
  'dosage_calc'
);

CREATE TYPE exam_session_status AS ENUM (
  'in_progress',
  'completed',
  'abandoned',
  'expired'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete'
);

-- -----------------------------------------------------------------------------
-- Content / Media Enums
-- -----------------------------------------------------------------------------

CREATE TYPE content_status AS ENUM (
  'draft',
  'review',
  'approved',
  'archived'
);

CREATE TYPE media_asset_type AS ENUM (
  'image',
  'video',
  'pdf',
  'audio'
);

-- -----------------------------------------------------------------------------
-- Analytics / Readiness Enums
-- -----------------------------------------------------------------------------

CREATE TYPE mastery_level AS ENUM (
  'not_started',
  'learning',
  'developing',
  'proficient',
  'mastered'
);

CREATE TYPE recommendation_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- -----------------------------------------------------------------------------
-- Admin Enums
-- -----------------------------------------------------------------------------

CREATE TYPE admin_role_slug AS ENUM (
  'super_admin',
  'content_editor',
  'support',
  'analytics_viewer'
);
