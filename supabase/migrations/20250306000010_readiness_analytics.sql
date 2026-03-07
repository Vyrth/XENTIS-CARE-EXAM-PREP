-- =============================================================================
-- Migration 010: Readiness and Analytics
-- =============================================================================
-- Design: Mastery tables store computed readiness per taxonomy level.
-- user_readiness_snapshots: point-in-time scores. user_performance_trends:
-- time-series for charts. user_question_review_queue: flagged/missed for review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_topic_mastery
-- -----------------------------------------------------------------------------
CREATE TABLE user_topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id, exam_track_id)
);

ALTER TABLE user_topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX idx_user_topic_mastery_topic ON user_topic_mastery(topic_id);
CREATE INDEX idx_user_topic_mastery_track ON user_topic_mastery(exam_track_id);

-- -----------------------------------------------------------------------------
-- user_subtopic_mastery
-- -----------------------------------------------------------------------------
CREATE TABLE user_subtopic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subtopic_id, exam_track_id)
);

ALTER TABLE user_subtopic_mastery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_subtopic_mastery_user ON user_subtopic_mastery(user_id);
CREATE INDEX idx_user_subtopic_mastery_subtopic ON user_subtopic_mastery(subtopic_id);

-- -----------------------------------------------------------------------------
-- user_system_mastery
-- -----------------------------------------------------------------------------
CREATE TABLE user_system_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, system_id, exam_track_id)
);

ALTER TABLE user_system_mastery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_system_mastery_user ON user_system_mastery(user_id);
CREATE INDEX idx_user_system_mastery_system ON user_system_mastery(system_id);

-- -----------------------------------------------------------------------------
-- user_domain_mastery
-- -----------------------------------------------------------------------------
CREATE TABLE user_domain_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain_id, exam_track_id)
);

ALTER TABLE user_domain_mastery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_domain_mastery_user ON user_domain_mastery(user_id);
CREATE INDEX idx_user_domain_mastery_domain ON user_domain_mastery(domain_id);

-- -----------------------------------------------------------------------------
-- user_skill_mastery
-- -----------------------------------------------------------------------------
-- Skill = question_skill_tags.skill_slug. Flexible skill taxonomy.
CREATE TABLE user_skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_slug TEXT NOT NULL,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_slug, exam_track_id)
);

ALTER TABLE user_skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_skill_mastery_user ON user_skill_mastery(user_id);
CREATE INDEX idx_user_skill_mastery_skill ON user_skill_mastery(skill_slug);

-- -----------------------------------------------------------------------------
-- user_item_type_performance
-- -----------------------------------------------------------------------------
-- Performance by question type (single best answer, dosage calc, etc.).
CREATE TABLE user_item_type_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_type_id UUID NOT NULL REFERENCES question_types(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  score_pct NUMERIC(5,2) CHECK (score_pct >= 0 AND score_pct <= 100),
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_type_id, exam_track_id)
);

ALTER TABLE user_item_type_performance ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_item_type_performance_user ON user_item_type_performance(user_id);
CREATE INDEX idx_user_item_type_performance_type ON user_item_type_performance(question_type_id);

-- -----------------------------------------------------------------------------
-- user_readiness_snapshots
-- -----------------------------------------------------------------------------
-- Point-in-time overall readiness score (e.g., for dashboard).
CREATE TABLE user_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  overall_score_pct NUMERIC(5,2) CHECK (overall_score_pct >= 0 AND overall_score_pct <= 100),
  -- Breakdown by domain/system
  breakdown JSONB DEFAULT '{}',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_readiness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_readiness_snapshots_user ON user_readiness_snapshots(user_id);
CREATE INDEX idx_user_readiness_snapshots_track ON user_readiness_snapshots(exam_track_id);
CREATE INDEX idx_user_readiness_snapshots_at ON user_readiness_snapshots(user_id, snapshot_at DESC);

-- -----------------------------------------------------------------------------
-- user_performance_trends
-- -----------------------------------------------------------------------------
-- Time-series for trend charts. Aggregated by day/week.
CREATE TABLE user_performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL, -- 'day', 'week'
  period_start DATE NOT NULL,
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  score_pct NUMERIC(5,2),
  -- Optional: system_id or domain_id for breakdown
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_performance_trends ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_user_performance_trends_unique
  ON user_performance_trends(user_id, exam_track_id, period_type, period_start,
    COALESCE(system_id::text, ''), COALESCE(domain_id::text, ''));

CREATE INDEX idx_user_performance_trends_user ON user_performance_trends(user_id);
CREATE INDEX idx_user_performance_trends_period ON user_performance_trends(user_id, period_start DESC);

-- -----------------------------------------------------------------------------
-- user_question_review_queue
-- -----------------------------------------------------------------------------
-- Questions to review: missed, flagged, low-confidence.
CREATE TABLE user_question_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'missed', 'flagged', 'low_confidence', 'adaptive'
  priority recommendation_priority NOT NULL DEFAULT 'medium',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_question_review_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_question_review_queue_user ON user_question_review_queue(user_id);
CREATE INDEX idx_user_question_review_queue_priority ON user_question_review_queue(user_id, priority, reviewed_at)
  WHERE reviewed_at IS NULL;
