-- =============================================================================
-- Migration: Autonomous Content Operations + Source Governance
-- =============================================================================
-- autonomous_settings: cadence, thresholds, blueprint targets
-- source_framework_config: NCSBN/ANCC alignment per track
-- ai_campaigns.source_framework_id: link campaigns to framework
-- =============================================================================

-- -----------------------------------------------------------------------------
-- source_frameworks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  authority_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO source_frameworks (slug, name, description, authority_url) VALUES
  ('ncsbn_nclex_rn', 'NCSBN NCLEX-RN Test Plan', 'Official NCSBN NCLEX-RN test plan and content distribution', 'https://www.ncsbn.org/nclex-rn'),
  ('ncsbn_nclex_lpn', 'NCSBN NCLEX-PN/LVN Test Plan', 'Official NCSBN NCLEX-PN test plan for LVN/LPN', 'https://www.ncsbn.org/nclex-pn'),
  ('ancc_fnp', 'ANCC FNP Certification Content Outline', 'Official ANCC Family Nurse Practitioner certification content outline', 'https://www.nursingworld.org/ancc'),
  ('ancc_pmhnp', 'ANCC PMHNP Certification Content Outline', 'Official ANCC Psychiatric-Mental Health NP content outline', 'https://www.nursingworld.org/ancc')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- source_framework_config (track -> framework mapping)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_framework_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  source_framework_id UUID NOT NULL REFERENCES source_frameworks(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id)
);

INSERT INTO source_framework_config (exam_track_id, source_framework_id, enabled)
SELECT et.id, sf.id, true FROM exam_tracks et, source_frameworks sf
WHERE et.slug = 'rn' AND sf.slug = 'ncsbn_nclex_rn'
ON CONFLICT (exam_track_id) DO NOTHING;
INSERT INTO source_framework_config (exam_track_id, source_framework_id, enabled)
SELECT et.id, sf.id, true FROM exam_tracks et, source_frameworks sf
WHERE et.slug = 'lvn' AND sf.slug = 'ncsbn_nclex_lpn'
ON CONFLICT (exam_track_id) DO NOTHING;
INSERT INTO source_framework_config (exam_track_id, source_framework_id, enabled)
SELECT et.id, sf.id, true FROM exam_tracks et, source_frameworks sf
WHERE et.slug = 'fnp' AND sf.slug = 'ancc_fnp'
ON CONFLICT (exam_track_id) DO NOTHING;
INSERT INTO source_framework_config (exam_track_id, source_framework_id, enabled)
SELECT et.id, sf.id, true FROM exam_tracks et, source_frameworks sf
WHERE et.slug = 'pmhnp' AND sf.slug = 'ancc_pmhnp'
ON CONFLICT (exam_track_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- autonomous_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS autonomous_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value_json JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO autonomous_settings (key, value_json, description) VALUES
  ('cadence', '{"processShardsEveryHours": 2, "nightlyUnderfillEnabled": true, "weeklyRebalanceEnabled": true, "monthlyLowCoverageEnabled": true}'::jsonb, 'Generation cadence: 2h shards, nightly underfill, weekly rebalance, monthly low-coverage'),
  ('auto_publish', '{"minQualityScore": 75, "borderlineThreshold": 65, "rejectBelow": 40}'::jsonb, 'Auto-publish: above 75, borderline 65-75 to review, reject below 40'),
  ('source_governance', '{"requireOfficialFramework": true, "blockGenericSources": true}'::jsonb, 'Source governance: require NCSBN/ANCC, block generic blogs/prep sites'),
  ('blueprint_targets', '{"rn": {"minQuestionsPerTopic": 15, "minQuestionsPerSystem": 50}, "fnp": {"minQuestionsPerTopic": 12, "minQuestionsPerSystem": 40}, "pmhnp": {"minQuestionsPerTopic": 10, "minQuestionsPerSystem": 35}, "lvn": {"minQuestionsPerTopic": 10, "minQuestionsPerSystem": 30}}'::jsonb, 'Per-track blueprint minimums'),
  ('pre_practice', '{"regenerateMonthly": true, "minQualityThreshold": 70, "minCoverageThreshold": 80}'::jsonb, 'Pre-Practice I-V: regenerate monthly or when quality/coverage below threshold')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- ai_campaigns: add source_framework_id
-- -----------------------------------------------------------------------------
ALTER TABLE ai_campaigns ADD COLUMN IF NOT EXISTS source_framework_id UUID REFERENCES source_frameworks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ai_campaigns_source_framework ON ai_campaigns(source_framework_id) WHERE source_framework_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- content_source_framework (link generated content to framework)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_source_framework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  source_framework_id UUID NOT NULL REFERENCES source_frameworks(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_source_framework_entity ON content_source_framework(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE source_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_framework_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_source_framework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read source_frameworks" ON source_frameworks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage source_frameworks" ON source_frameworks FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read source_framework_config" ON source_framework_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage source_framework_config" ON source_framework_config FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read autonomous_settings" ON autonomous_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage autonomous_settings" ON autonomous_settings FOR ALL USING (is_admin());

CREATE POLICY "Admins manage content_source_framework" ON content_source_framework FOR ALL USING (is_admin());
