-- =============================================================================
-- Migration 003: Assessment Base (Question Types, Lab References)
-- =============================================================================
-- Design: question_types as lookup table (not enum) to allow metadata and
-- future extensibility. Lab reference sets support the calculator/lab drawer
-- tool during exams.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- question_types
-- -----------------------------------------------------------------------------
-- Lookup table for item types. Allows metadata (e.g., scoring rules, UI hints)
-- without schema changes. Slug matches question_type_slug enum for validation.
CREATE TABLE question_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug question_type_slug NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  -- JSONB for type-specific config: e.g., { "min_selections": 2, "max_selections": 4 }
  config JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_types_slug ON question_types(slug);

-- -----------------------------------------------------------------------------
-- lab_reference_sets
-- -----------------------------------------------------------------------------
-- Groups of lab values (e.g., "CBC", "Metabolic Panel"). Used in exam lab drawer.
CREATE TABLE lab_reference_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_reference_sets_slug ON lab_reference_sets(slug);

-- -----------------------------------------------------------------------------
-- lab_reference_values
-- -----------------------------------------------------------------------------
-- Individual lab values with reference ranges. Units, SI/conventional, etc.
CREATE TABLE lab_reference_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_reference_set_id UUID NOT NULL REFERENCES lab_reference_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  unit TEXT,
  reference_range_low NUMERIC,
  reference_range_high NUMERIC,
  reference_range_text TEXT, -- For non-numeric ranges (e.g., "Negative")
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_reference_values_set ON lab_reference_values(lab_reference_set_id);
