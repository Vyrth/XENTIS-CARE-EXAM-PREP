-- =============================================================================
-- Migration 007: Legal and Governance
-- =============================================================================
-- Design: media_assets for all platform media. content_sources and content_
-- source_links for provenance. content_reviews and content_versions for
-- approval workflow. Enables audit trail and copyright compliance.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- media_assets
-- -----------------------------------------------------------------------------
-- Central registry for images, videos, PDFs. Links to Supabase Storage.
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type media_asset_type NOT NULL,
  slug TEXT UNIQUE,
  storage_path TEXT NOT NULL,
  url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_assets_type ON media_assets(asset_type);
CREATE INDEX idx_media_assets_slug ON media_assets(slug) WHERE slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- content_sources
-- -----------------------------------------------------------------------------
-- Provenance: original sources for content (textbooks, guidelines, etc.).
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type TEXT, -- 'textbook', 'guideline', 'original', 'licensed'
  citation_text TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_sources_slug ON content_sources(slug);

-- -----------------------------------------------------------------------------
-- content_source_links
-- -----------------------------------------------------------------------------
-- Polymorphic: links content to sources. content_type + content_id pattern.
CREATE TABLE content_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'question', 'study_section', 'topic_summary', etc.
  content_id UUID NOT NULL,
  excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_source_id, content_type, content_id)
);

CREATE INDEX idx_content_source_links_source ON content_source_links(content_source_id);
CREATE INDEX idx_content_source_links_content ON content_source_links(content_type, content_id);

-- -----------------------------------------------------------------------------
-- content_reviews
-- -----------------------------------------------------------------------------
-- Review workflow: draft → review → approved.
CREATE TABLE content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  status content_status NOT NULL,
  reviewed_by UUID, -- References auth.users, set via trigger or app
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_reviews_content ON content_reviews(content_type, content_id);
CREATE INDEX idx_content_reviews_status ON content_reviews(status);

-- -----------------------------------------------------------------------------
-- content_versions
-- -----------------------------------------------------------------------------
-- Version history for content. Supports rollback and audit.
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  version INT NOT NULL,
  content_snapshot JSONB NOT NULL,
  changed_by UUID,
  change_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, version)
);

CREATE INDEX idx_content_versions_content ON content_versions(content_type, content_id);

-- -----------------------------------------------------------------------------
-- Link question_exhibits to media_assets (FK added now that media_assets exists)
-- -----------------------------------------------------------------------------
ALTER TABLE question_exhibits
  ADD COLUMN media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_question_exhibits_media_asset ON question_exhibits(media_asset_id) WHERE media_asset_id IS NOT NULL;
