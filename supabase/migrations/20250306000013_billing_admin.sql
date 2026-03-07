-- =============================================================================
-- Migration 013: Billing and Admin
-- =============================================================================
-- Design: subscription_plans maps to Stripe products/prices. user_subscriptions
-- stores current subscription state (synced via webhooks). Stripe is source of
-- truth; this table for quick access control and display.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- subscription_plans
-- -----------------------------------------------------------------------------
-- Platform subscription plans. Links to Stripe price_id.
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID REFERENCES exam_tracks(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  price_cents INT,
  interval TEXT, -- 'month', 'year'
  features JSONB DEFAULT '[]',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plans_track ON subscription_plans(exam_track_id) WHERE exam_track_id IS NOT NULL;
CREATE INDEX idx_subscription_plans_stripe_price ON subscription_plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- user_subscriptions
-- -----------------------------------------------------------------------------
-- Current subscription state. Synced from Stripe webhooks.
-- Stripe customer_id, subscription_id stored for webhook idempotency.
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_user_subscriptions_stripe_sub ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
