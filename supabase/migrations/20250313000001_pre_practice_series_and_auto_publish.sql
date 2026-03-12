-- =============================================================================
-- Migration: Pre-Practice Series I-V + Auto-Publish Support
-- =============================================================================
-- pre_practice_series: one per track, groups versions I-V
-- pre_practice_versions: I=hard diagnostic, II=easier, III=moderate, IV=extremely hard, V=final readiness
-- pre_practice_exam_map: links version to exam_template
-- content_quality_metadata: quality score, auto_publish eligibility, validation status
-- auto_publish_config: per-content-type enable/disable and threshold
-- publish_audit: audit trail for publish actions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pre_practice_series
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pre_practice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Pre-Practice Series',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id)
);

CREATE INDEX IF NOT EXISTS idx_pre_practice_series_track ON pre_practice_series(exam_track_id);

-- -----------------------------------------------------------------------------
-- pre_practice_versions
-- -----------------------------------------------------------------------------
-- I=hard diagnostic, II=easier reinforcement, III=moderate mixed, IV=extremely hard, V=final readiness
CREATE TABLE IF NOT EXISTS pre_practice_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES pre_practice_series(id) ON DELETE CASCADE,
  version_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  difficulty_profile TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  assembly_rules JSONB NOT NULL DEFAULT '{}',
  exam_template_id UUID REFERENCES exam_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(series_id, version_key)
);

CREATE INDEX IF NOT EXISTS idx_pre_practice_versions_series ON pre_practice_versions(series_id);
CREATE INDEX IF NOT EXISTS idx_pre_practice_versions_template ON pre_practice_versions(exam_template_id) WHERE exam_template_id IS NOT NULL;

COMMENT ON COLUMN pre_practice_versions.version_key IS 'i, ii, iii, iv, v';
COMMENT ON COLUMN pre_practice_versions.difficulty_profile IS 'hard_diagnostic, easier_reinforcement, moderate_mixed, extremely_hard, final_readiness';
COMMENT ON COLUMN pre_practice_versions.assembly_rules IS 'byDifficulty, bySystem, etc. for question selection';

-- -----------------------------------------------------------------------------
-- content_quality_metadata
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_quality_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  quality_score NUMERIC(5,2),
  auto_publish_eligible BOOLEAN NOT NULL DEFAULT false,
  validation_status TEXT,
  validation_errors JSONB DEFAULT '[]',
  generation_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_quality_metadata_entity ON content_quality_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_metadata_eligible ON content_quality_metadata(auto_publish_eligible) WHERE auto_publish_eligible = true;

-- -----------------------------------------------------------------------------
-- auto_publish_config
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auto_publish_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  min_quality_score NUMERIC(5,2) DEFAULT 70,
  require_track_assigned BOOLEAN NOT NULL DEFAULT true,
  require_no_duplicate BOOLEAN NOT NULL DEFAULT true,
  require_answer_rationale_consistent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auto_publish_config (content_type, enabled, min_quality_score)
VALUES
  ('question', false, 75),
  ('study_guide', false, 70),
  ('flashcard_deck', false, 70),
  ('high_yield_content', false, 70)
ON CONFLICT (content_type) DO NOTHING;

-- -----------------------------------------------------------------------------
-- publish_audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publish_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_audit_entity ON publish_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_publish_audit_created ON publish_audit(created_at DESC);

-- -----------------------------------------------------------------------------
-- exam_templates: add pre_practice_version_id
-- -----------------------------------------------------------------------------
ALTER TABLE exam_templates ADD COLUMN IF NOT EXISTS pre_practice_version_id UUID REFERENCES pre_practice_versions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_exam_templates_pre_practice_version ON exam_templates(pre_practice_version_id) WHERE pre_practice_version_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE pre_practice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_practice_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_publish_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_audit ENABLE ROW LEVEL SECURITY;

-- Learners can read pre_practice_series and pre_practice_versions (for UI)
CREATE POLICY "Authenticated read pre_practice_series"
  ON pre_practice_series FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read pre_practice_versions"
  ON pre_practice_versions FOR SELECT
  USING (auth.role() = 'authenticated');

-- content_quality_metadata, auto_publish_config, publish_audit: admin only
CREATE POLICY "Admins manage content_quality_metadata"
  ON content_quality_metadata FOR ALL
  USING (is_admin());

CREATE POLICY "Admins manage auto_publish_config"
  ON auto_publish_config FOR ALL
  USING (is_admin());

CREATE POLICY "Admins manage publish_audit"
  ON publish_audit FOR ALL
  USING (is_admin());
