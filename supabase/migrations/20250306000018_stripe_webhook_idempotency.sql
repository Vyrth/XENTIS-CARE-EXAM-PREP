-- =============================================================================
-- Migration 018: Stripe Webhook Idempotency
-- =============================================================================
-- Store processed Stripe event IDs to handle retries safely.
-- =============================================================================

CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_summary JSONB DEFAULT '{}'
);

CREATE INDEX idx_stripe_webhook_events_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed_at DESC);

-- Webhook handler uses service role (bypasses RLS)
-- RLS enabled to restrict anon/authenticated; service role still has full access
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Deny anon/authenticated; service role bypasses RLS
CREATE POLICY "No direct access"
  ON stripe_webhook_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
