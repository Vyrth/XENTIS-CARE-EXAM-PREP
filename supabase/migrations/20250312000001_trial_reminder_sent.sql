-- =============================================================================
-- Migration: Trial Reminder Sent (Idempotent Tracking)
-- =============================================================================
-- Tracks which users have received trial expiration reminder emails.
-- UNIQUE(user_id, reminder_type) ensures exactly one reminder per user per type.
-- Used by cron to prevent duplicate sends (retry-safe, idempotent).
-- =============================================================================

CREATE TABLE trial_reminder_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reminder_type)
);

CREATE INDEX idx_trial_reminder_sent_user ON trial_reminder_sent(user_id);
CREATE INDEX idx_trial_reminder_sent_type ON trial_reminder_sent(reminder_type);

ALTER TABLE trial_reminder_sent ENABLE ROW LEVEL SECURITY;
-- No policies: service role (cron) bypasses RLS; authenticated users have no access.

COMMENT ON TABLE trial_reminder_sent IS 'Tracks trial expiration reminder emails. Prevents duplicate sends across cron retries.';
