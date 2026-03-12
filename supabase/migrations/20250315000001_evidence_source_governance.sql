-- =============================================================================
-- Migration: Evidence Source Governance for AI Factory
-- =============================================================================
-- approved_evidence_sources: approved textbooks, guidelines, test plans per track
-- approved_evidence_sources_track: which sources apply to which track
-- content_evidence_metadata: source_framework, primary_reference, guideline_reference, evidence_tier per content
-- =============================================================================

-- -----------------------------------------------------------------------------
-- approved_evidence_sources
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approved_evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('test_plan', 'textbook', 'guideline', 'handbook')),
  evidence_tier INT NOT NULL DEFAULT 2 CHECK (evidence_tier >= 1 AND evidence_tier <= 3),
  citation_text TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- approved_evidence_sources_track (which sources apply to which track)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approved_evidence_sources_track (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approved_evidence_source_id UUID NOT NULL REFERENCES approved_evidence_sources(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(approved_evidence_source_id, exam_track_id)
);

CREATE INDEX IF NOT EXISTS idx_approved_evidence_sources_track_track ON approved_evidence_sources_track(exam_track_id);

-- -----------------------------------------------------------------------------
-- content_evidence_metadata (per generated content item)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_evidence_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  source_framework_id UUID REFERENCES source_frameworks(id) ON DELETE SET NULL,
  primary_reference_id UUID REFERENCES approved_evidence_sources(id) ON DELETE SET NULL,
  guideline_reference_id UUID REFERENCES approved_evidence_sources(id) ON DELETE SET NULL,
  evidence_tier INT CHECK (evidence_tier >= 1 AND evidence_tier <= 3),
  source_slugs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_evidence_metadata_entity ON content_evidence_metadata(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- auto_publish_config: add require_source_mapping
-- -----------------------------------------------------------------------------
ALTER TABLE auto_publish_config ADD COLUMN IF NOT EXISTS require_source_mapping BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------------
-- Seed approved evidence sources
-- -----------------------------------------------------------------------------
INSERT INTO approved_evidence_sources (slug, name, source_type, evidence_tier, citation_text) VALUES
  ('ncsbn_nclex', 'NCSBN NCLEX Test Plans', 'test_plan', 1, 'NCSBN. NCLEX Test Plan.'),
  ('lippincott_manual', 'Lippincott Manual of Nursing Practice', 'textbook', 2, 'Lippincott Manual of Nursing Practice.'),
  ('saunders_nclex', 'Saunders NCLEX Review', 'textbook', 2, 'Saunders Comprehensive Review for the NCLEX-RN Examination.'),
  ('lippincott_drug', 'Lippincott Nursing Drug Handbook', 'handbook', 2, 'Lippincott Nursing Drug Handbook.'),
  ('davis_drug', 'Davis Drug Guide', 'handbook', 2, 'Davis Drug Guide for Nurses.'),
  ('brunner_suddarth', 'Brunner & Suddarth Medical-Surgical Nursing', 'textbook', 2, 'Brunner & Suddarth''s Textbook of Medical-Surgical Nursing.'),
  ('cdc_guidelines', 'CDC Guidelines', 'guideline', 3, 'Centers for Disease Control and Prevention.'),
  ('uspstf', 'USPSTF Guidelines', 'guideline', 3, 'U.S. Preventive Services Task Force.'),
  ('aha_guidelines', 'AHA Guidelines', 'guideline', 3, 'American Heart Association.'),
  ('ada_standards', 'ADA Standards', 'guideline', 3, 'American Diabetes Association.'),
  ('ancc_fnp_outline', 'ANCC FNP Test Content Outline', 'test_plan', 1, 'ANCC FNP Certification Content Outline.'),
  ('aanp_fnp_blueprint', 'AANP FNP Blueprint', 'test_plan', 1, 'AANP FNP Certification Blueprint.'),
  ('current_medical_dx', 'Current Medical Diagnosis & Treatment', 'textbook', 2, 'Current Medical Diagnosis & Treatment.'),
  ('bates_physical', 'Bates Physical Examination', 'textbook', 2, 'Bates'' Guide to Physical Examination.'),
  ('fitzgerald_np', 'Fitzgerald NP Review', 'textbook', 2, 'Fitzgerald Health Education Associates NP Review.'),
  ('primary_care_interprofessional', 'Primary Care: Interprofessional Collaborative Practice', 'textbook', 2, 'Primary Care: Interprofessional Collaborative Practice.'),
  ('acc_aha', 'ACC/AHA Guidelines', 'guideline', 3, 'American College of Cardiology/American Heart Association.'),
  ('acog', 'ACOG Guidelines', 'guideline', 3, 'American College of Obstetricians and Gynecologists.'),
  ('aap', 'AAP Guidelines', 'guideline', 3, 'American Academy of Pediatrics.'),
  ('ancc_pmhnp_outline', 'ANCC PMHNP Outline', 'test_plan', 1, 'ANCC PMHNP Certification Content Outline.'),
  ('dsm5tr', 'DSM-5-TR', 'textbook', 1, 'Diagnostic and Statistical Manual of Mental Disorders, 5th Edition, Text Revision.'),
  ('stahl_psychopharmacology', 'Stahl Essential Psychopharmacology', 'textbook', 2, 'Stahl''s Essential Psychopharmacology.'),
  ('kaplan_sadock', 'Kaplan & Sadock Psychiatry', 'textbook', 2, 'Kaplan and Sadock''s Synopsis of Psychiatry.'),
  ('carlat_psychiatry', 'Carlat Psychiatry Report', 'textbook', 2, 'The Carlat Psychiatry Report.'),
  ('apa_guidelines', 'APA Guidelines', 'guideline', 3, 'American Psychiatric Association.'),
  ('va_dod_psychiatric', 'VA/DoD Psychiatric Guidelines', 'guideline', 3, 'VA/DoD Clinical Practice Guidelines.'),
  ('samhsa', 'SAMHSA', 'guideline', 3, 'Substance Abuse and Mental Health Services Administration.')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Link sources to tracks
-- -----------------------------------------------------------------------------
-- RN
INSERT INTO approved_evidence_sources_track (approved_evidence_source_id, exam_track_id)
SELECT aes.id, et.id FROM approved_evidence_sources aes, exam_tracks et
WHERE et.slug = 'rn' AND aes.slug IN (
  'ncsbn_nclex', 'lippincott_manual', 'saunders_nclex', 'lippincott_drug', 'davis_drug',
  'brunner_suddarth', 'cdc_guidelines', 'uspstf', 'aha_guidelines', 'ada_standards'
)
ON CONFLICT (approved_evidence_source_id, exam_track_id) DO NOTHING;

-- LVN
INSERT INTO approved_evidence_sources_track (approved_evidence_source_id, exam_track_id)
SELECT aes.id, et.id FROM approved_evidence_sources aes, exam_tracks et
WHERE et.slug = 'lvn' AND aes.slug IN (
  'ncsbn_nclex', 'lippincott_manual', 'saunders_nclex', 'lippincott_drug', 'davis_drug',
  'brunner_suddarth', 'cdc_guidelines', 'uspstf', 'aha_guidelines', 'ada_standards'
)
ON CONFLICT (approved_evidence_source_id, exam_track_id) DO NOTHING;

-- FNP
INSERT INTO approved_evidence_sources_track (approved_evidence_source_id, exam_track_id)
SELECT aes.id, et.id FROM approved_evidence_sources aes, exam_tracks et
WHERE et.slug = 'fnp' AND aes.slug IN (
  'ancc_fnp_outline', 'aanp_fnp_blueprint', 'current_medical_dx', 'bates_physical', 'fitzgerald_np',
  'primary_care_interprofessional', 'uspstf', 'cdc_guidelines', 'ada_standards', 'acc_aha', 'acog', 'aap'
)
ON CONFLICT (approved_evidence_source_id, exam_track_id) DO NOTHING;

-- PMHNP
INSERT INTO approved_evidence_sources_track (approved_evidence_source_id, exam_track_id)
SELECT aes.id, et.id FROM approved_evidence_sources aes, exam_tracks et
WHERE et.slug = 'pmhnp' AND aes.slug IN (
  'ancc_pmhnp_outline', 'dsm5tr', 'stahl_psychopharmacology', 'kaplan_sadock', 'carlat_psychiatry',
  'apa_guidelines', 'va_dod_psychiatric', 'samhsa'
)
ON CONFLICT (approved_evidence_source_id, exam_track_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE approved_evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_evidence_sources_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_evidence_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read approved_evidence_sources" ON approved_evidence_sources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage approved_evidence_sources" ON approved_evidence_sources FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read approved_evidence_sources_track" ON approved_evidence_sources_track FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage approved_evidence_sources_track" ON approved_evidence_sources_track FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read content_evidence_metadata" ON content_evidence_metadata FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage content_evidence_metadata" ON content_evidence_metadata FOR ALL USING (is_admin());
