-- =============================================================================
-- Migration 004: Questions and Related Tables
-- =============================================================================
-- Design: questions are the core assessment unit. Taxonomy links (domain, system,
-- topic, subtopic, learning_objective) support filtering and analytics.
-- question_options: normalized for single/multiple/select_n; JSONB for complex
-- types (hotspot coords, matrix cells, cloze blanks). question_exhibits: images,
-- charts, tables - content_url/storage_path for now; media_asset_id added in
-- governance migration. question_skill_tags: flexible skill taxonomy for analytics.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- questions
-- -----------------------------------------------------------------------------
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  question_type_id UUID NOT NULL REFERENCES question_types(id) ON DELETE RESTRICT,
  -- Taxonomy (nullable for legacy or uncategorized items)
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  learning_objective_id UUID REFERENCES learning_objectives(id) ON DELETE SET NULL,
  -- Content
  stem TEXT NOT NULL,
  -- Type-specific data: hotspot regions, matrix layout, cloze structure, etc.
  stem_metadata JSONB DEFAULT '{}',
  -- For case study: parent question id
  case_study_parent_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  -- Lab reference for calculator/dosage questions
  lab_reference_set_id UUID REFERENCES lab_reference_sets(id) ON DELETE SET NULL,
  -- Scoring
  points NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  -- Status
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_exam_track ON questions(exam_track_id);
CREATE INDEX idx_questions_question_type ON questions(question_type_id);
CREATE INDEX idx_questions_system ON questions(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX idx_questions_domain ON questions(domain_id) WHERE domain_id IS NOT NULL;
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_case_study_parent ON questions(case_study_parent_id) WHERE case_study_parent_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- question_options
-- -----------------------------------------------------------------------------
-- For single/multiple/select_n: option rows. For other types, may store
-- structured data in option_metadata (e.g., dropdown choices, ordered items).
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL, -- 'A', 'B', 'C' or '1', '2', '3'
  option_text TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  -- For multiple_response: multiple can be correct
  -- For hotspot: { "x": 0.1, "y": 0.2, "radius": 0.05 }
  -- For matrix: { "row": 1, "col": 2 }
  option_metadata JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, option_key)
);

CREATE INDEX idx_question_options_question ON question_options(question_id);

-- -----------------------------------------------------------------------------
-- question_interactions
-- -----------------------------------------------------------------------------
-- Sub-questions or interaction steps (e.g., case study tabs, multi-part).
-- Links child interactions to parent question.
CREATE TABLE question_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  parent_interaction_id UUID REFERENCES question_interactions(id) ON DELETE CASCADE,
  interaction_key TEXT NOT NULL, -- e.g., 'tab_1', 'part_2'
  stem TEXT,
  stem_metadata JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_interactions_question ON question_interactions(question_id);
CREATE INDEX idx_question_interactions_parent ON question_interactions(parent_interaction_id) WHERE parent_interaction_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- question_exhibits
-- -----------------------------------------------------------------------------
-- Images, charts, tables attached to questions. content_url for external/storage.
-- media_asset_id FK added in governance migration when media_assets exists.
CREATE TABLE question_exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_interaction_id UUID REFERENCES question_interactions(id) ON DELETE CASCADE,
  exhibit_type TEXT NOT NULL, -- 'image', 'chart', 'table', 'xray'
  content_url TEXT,
  storage_path TEXT,
  -- Structured data for tables: { "headers": [...], "rows": [[...]] }
  exhibit_data JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_exhibits_question ON question_exhibits(question_id);
CREATE INDEX idx_question_exhibits_interaction ON question_exhibits(question_interaction_id) WHERE question_interaction_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- question_skill_tags
-- -----------------------------------------------------------------------------
-- Flexible skill taxonomy (e.g., "critical thinking", "prioritization").
-- Many-to-many for analytics and weak-skill recommendations.
CREATE TABLE question_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  skill_slug TEXT NOT NULL,
  skill_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, skill_slug)
);

CREATE INDEX idx_question_skill_tags_question ON question_skill_tags(question_id);
CREATE INDEX idx_question_skill_tags_skill ON question_skill_tags(skill_slug);

-- -----------------------------------------------------------------------------
-- question_performance_baselines
-- -----------------------------------------------------------------------------
-- Platform-wide difficulty/performance baseline. Used for adaptive algorithms.
CREATE TABLE question_performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  p_value NUMERIC(5,4) CHECK (p_value >= 0 AND p_value <= 1), -- % correct
  discrimination_index NUMERIC(5,4),
  sample_size INT DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id)
);

CREATE INDEX idx_question_performance_baselines_question ON question_performance_baselines(question_id);

-- -----------------------------------------------------------------------------
-- question_adaptive_profiles
-- -----------------------------------------------------------------------------
-- Per-question adaptive metadata: IRT params, difficulty tier, etc.
CREATE TABLE question_adaptive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  difficulty_tier INT CHECK (difficulty_tier >= 1 AND difficulty_tier <= 5),
  -- IRT parameters (optional, for future CAT)
  irt_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id)
);

CREATE INDEX idx_question_adaptive_profiles_question ON question_adaptive_profiles(question_id);
