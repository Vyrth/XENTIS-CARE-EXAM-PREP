-- =============================================================================
-- Migration 011: Adaptive Recommendations
-- =============================================================================
-- Design: adaptive_recommendation_profiles stores algorithm config per user.
-- adaptive_question_queue: prioritized questions for weak areas. recommended_
-- content_queue: study materials, videos. user_remediation_plans: structured
-- plans for weak systems/domains/skills.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- adaptive_recommendation_profiles
-- -----------------------------------------------------------------------------
-- Per-user config for adaptive algorithm. Weights, priorities, etc.
CREATE TABLE adaptive_recommendation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  -- Weights: weak_systems, weak_domains, weak_skills, low_confidence, repeated_misses
  priority_weights JSONB NOT NULL DEFAULT '{}',
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam_track_id)
);

ALTER TABLE adaptive_recommendation_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_adaptive_recommendation_profiles_user ON adaptive_recommendation_profiles(user_id);

-- -----------------------------------------------------------------------------
-- adaptive_question_queue
-- -----------------------------------------------------------------------------
-- Prioritized question queue for adaptive study. Source: weak area, missed, etc.
CREATE TABLE adaptive_question_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  priority recommendation_priority NOT NULL DEFAULT 'medium',
  -- Reason: 'weak_system', 'weak_domain', 'weak_skill', 'repeated_miss', 'low_confidence'
  reason_slug TEXT NOT NULL,
  reason_entity_id UUID, -- system_id, domain_id, topic_id, etc.
  score NUMERIC(5,4), -- Priority score 0-1
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE adaptive_question_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_adaptive_question_queue_user ON adaptive_question_queue(user_id);
CREATE INDEX idx_adaptive_question_queue_pending ON adaptive_question_queue(user_id, priority, added_at)
  WHERE completed_at IS NULL;

-- -----------------------------------------------------------------------------
-- recommended_content_queue
-- -----------------------------------------------------------------------------
-- Recommended study materials, videos, flashcards.
CREATE TABLE recommended_content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'study_guide', 'video', 'flashcard_deck', 'topic_summary'
  content_id UUID NOT NULL,
  priority recommendation_priority NOT NULL DEFAULT 'medium',
  reason_slug TEXT NOT NULL,
  reason_entity_id UUID,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recommended_content_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_recommended_content_queue_user ON recommended_content_queue(user_id);
CREATE INDEX idx_recommended_content_queue_pending ON recommended_content_queue(user_id, priority, added_at)
  WHERE completed_at IS NULL;

-- -----------------------------------------------------------------------------
-- user_remediation_plans
-- -----------------------------------------------------------------------------
-- Structured remediation: "Focus on Cardiovascular, do these 3 sections, 10 questions."
CREATE TABLE user_remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Target: system_id, domain_id, or skill_slug
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL, -- UUID or slug
  -- Plan items: { "sections": [...], "videos": [...], "question_count": 10 }
  plan_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_remediation_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_remediation_plans_user ON user_remediation_plans(user_id);
CREATE INDEX idx_user_remediation_plans_active ON user_remediation_plans(user_id) WHERE is_active;
