-- =============================================================================
-- Migration: Include trialing in has_subscription_for_track
-- =============================================================================
-- Trial users (status=trialing, current_period_end in future) must be treated
-- as having full access, consistent with getEntitlements / access.ts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_subscription_for_track(p_track_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Paid: active subscription for track
    SELECT 1 FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON sp.id = us.subscription_plan_id
    WHERE us.user_id = auth.uid()
      AND (
        (us.status = 'active' AND (sp.exam_track_id = p_track_id OR sp.exam_track_id IS NULL))
        OR
        (us.status = 'trialing' AND (us.current_period_end IS NULL OR us.current_period_end > now()))
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_subscription_for_track(UUID) IS 'True if user has active paid subscription OR valid trial (full access).';
