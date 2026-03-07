-- =============================================================================
-- Migration 006: Learning Content
-- =============================================================================
-- Design: study_guides → study_material_sections for hierarchical content.
-- topic_summaries: quick-reference per topic. flashcard_decks/flashcards: user
-- and AI-generated. video_lessons with quiz links. system_study_bundles: groups
-- content by system for "study bundle" UX.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- study_guides
-- -----------------------------------------------------------------------------
-- Top-level study guides per track (e.g., "RN Cardiovascular Study Guide").
CREATE TABLE study_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, slug)
);

CREATE INDEX idx_study_guides_track ON study_guides(exam_track_id);
CREATE INDEX idx_study_guides_system ON study_guides(system_id) WHERE system_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- study_material_sections
-- -----------------------------------------------------------------------------
-- Hierarchical sections within study guides. Supports nesting via parent_id.
CREATE TABLE study_material_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_guide_id UUID NOT NULL REFERENCES study_guides(id) ON DELETE CASCADE,
  parent_section_id UUID REFERENCES study_material_sections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  content_markdown TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_material_sections_guide ON study_material_sections(study_guide_id);
CREATE INDEX idx_study_material_sections_parent ON study_material_sections(parent_section_id) WHERE parent_section_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- topic_summaries
-- -----------------------------------------------------------------------------
-- Concise summaries per topic. Used for quick review and AI context.
CREATE TABLE topic_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  exam_track_id UUID REFERENCES exam_tracks(id) ON DELETE SET NULL,
  summary_text TEXT NOT NULL,
  key_points JSONB DEFAULT '[]', -- Array of bullet points
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, exam_track_id)
);

CREATE INDEX idx_topic_summaries_topic ON topic_summaries(topic_id);
CREATE INDEX idx_topic_summaries_track ON topic_summaries(exam_track_id) WHERE exam_track_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- flashcard_decks
-- -----------------------------------------------------------------------------
-- Decks can be system-generated, user-created, or AI-generated.
CREATE TABLE flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL, -- 'platform', 'user', 'ai'
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_decks_track ON flashcard_decks(exam_track_id);
CREATE INDEX idx_flashcard_decks_system ON flashcard_decks(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX idx_flashcard_decks_source ON flashcard_decks(source);

-- -----------------------------------------------------------------------------
-- flashcards
-- -----------------------------------------------------------------------------
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  -- Optional: image URLs, mnemonics
  metadata JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcards_deck ON flashcards(flashcard_deck_id);

-- -----------------------------------------------------------------------------
-- video_lessons
-- -----------------------------------------------------------------------------
CREATE TABLE video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INT,
  thumbnail_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, slug)
);

CREATE INDEX idx_video_lessons_track ON video_lessons(exam_track_id);
CREATE INDEX idx_video_lessons_system ON video_lessons(system_id) WHERE system_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- video_quiz_links
-- -----------------------------------------------------------------------------
-- Links videos to quiz questions for post-video assessment.
CREATE TABLE video_quiz_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_lesson_id, question_id)
);

CREATE INDEX idx_video_quiz_links_video ON video_quiz_links(video_lesson_id);
CREATE INDEX idx_video_quiz_links_question ON video_quiz_links(question_id);

-- -----------------------------------------------------------------------------
-- system_study_bundles
-- -----------------------------------------------------------------------------
-- Aggregates study guides, videos, flashcards per system. Denormalized for UX.
CREATE TABLE system_study_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- JSONB: { "study_guide_ids": [...], "video_ids": [...], "deck_ids": [...] }
  bundle_content JSONB NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, system_id)
);

CREATE INDEX idx_system_study_bundles_track ON system_study_bundles(exam_track_id);
CREATE INDEX idx_system_study_bundles_system ON system_study_bundles(system_id);
