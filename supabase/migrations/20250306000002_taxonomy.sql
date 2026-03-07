-- =============================================================================
-- Migration 002: Taxonomy
-- =============================================================================
-- Design: Hierarchical content taxonomy for nursing board prep. Tracks (LVN, RN,
-- FNP, PMHNP) have different domains/systems. Topics can span multiple systems
-- via topic_system_links. System mastery targets define pass thresholds per track.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exam_tracks
-- -----------------------------------------------------------------------------
-- LVN/LPN, RN, FNP, PMHNP. Each track has distinct content and exam blueprints.
CREATE TABLE exam_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug exam_track_slug NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_tracks_slug ON exam_tracks(slug);

-- -----------------------------------------------------------------------------
-- domains
-- -----------------------------------------------------------------------------
-- High-level content domains (e.g., Safe and Effective Care, Health Promotion).
-- Shared across tracks but track-specific via exam_blueprints.
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domains_slug ON domains(slug);

-- -----------------------------------------------------------------------------
-- systems
-- -----------------------------------------------------------------------------
-- Body systems / clinical areas (e.g., Cardiovascular, Respiratory, Psych).
-- Scoped to exam_track; each track has its own system set.
CREATE TABLE systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, slug)
);

CREATE INDEX idx_systems_exam_track ON systems(exam_track_id);
CREATE INDEX idx_systems_slug ON systems(exam_track_id, slug);

-- -----------------------------------------------------------------------------
-- topics
-- -----------------------------------------------------------------------------
-- Mid-level topics within domains. Topics can link to multiple systems.
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_id, slug)
);

CREATE INDEX idx_topics_domain ON topics(domain_id);
CREATE INDEX idx_topics_slug ON topics(domain_id, slug);

-- -----------------------------------------------------------------------------
-- subtopics
-- -----------------------------------------------------------------------------
-- Granular subtopics under topics. Used for fine-grained mastery tracking.
CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, slug)
);

CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);

-- -----------------------------------------------------------------------------
-- learning_objectives
-- -----------------------------------------------------------------------------
-- Measurable learning objectives. Linked to subtopics for assessment alignment.
CREATE TABLE learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  code TEXT,
  description TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_objectives_subtopic ON learning_objectives(subtopic_id);

-- -----------------------------------------------------------------------------
-- topic_system_links
-- -----------------------------------------------------------------------------
-- Many-to-many: topics can appear in multiple systems (e.g., "Fluid Balance"
-- in both Renal and Cardiovascular). System is track-scoped.
CREATE TABLE topic_system_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, system_id)
);

CREATE INDEX idx_topic_system_links_topic ON topic_system_links(topic_id);
CREATE INDEX idx_topic_system_links_system ON topic_system_links(system_id);

-- -----------------------------------------------------------------------------
-- exam_blueprints
-- -----------------------------------------------------------------------------
-- Defines exam composition per track: % of questions per domain/system.
-- Used for Pre-Practice Exam generation and readiness weighting.
CREATE TABLE exam_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  blueprint_type TEXT NOT NULL, -- e.g., 'pre_practice', 'board_sim'
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  weight_pct NUMERIC(5,2) NOT NULL CHECK (weight_pct >= 0 AND weight_pct <= 100),
  question_count INT, -- override for fixed counts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (domain_id IS NOT NULL AND system_id IS NULL) OR
    (domain_id IS NULL AND system_id IS NOT NULL)
  )
);

CREATE INDEX idx_exam_blueprints_track ON exam_blueprints(exam_track_id);
CREATE INDEX idx_exam_blueprints_domain ON exam_blueprints(domain_id) WHERE domain_id IS NOT NULL;
CREATE INDEX idx_exam_blueprints_system ON exam_blueprints(system_id) WHERE system_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- system_mastery_targets
-- -----------------------------------------------------------------------------
-- Target mastery % per system per track. Used for readiness and recommendations.
CREATE TABLE system_mastery_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  target_pct NUMERIC(5,2) NOT NULL CHECK (target_pct >= 0 AND target_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, system_id)
);

CREATE INDEX idx_system_mastery_targets_track ON system_mastery_targets(exam_track_id);
