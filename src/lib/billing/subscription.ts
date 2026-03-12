/**
 * Subscription service - read user_subscriptions, sync from Stripe
 *
 * Trial model: status=trialing + current_period_end in future = full access (PAID_ENTITLEMENTS).
 * After trial expires, user gets FREE_ENTITLEMENTS until they upgrade.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { FREE_ENTITLEMENTS, PAID_ENTITLEMENTS } from "@/config/billing";
import type { UserSubscription, Entitlements } from "@/types/billing";

const ACTIVE_STATUSES = ["active", "trialing"] as const;

/** Get subscription for current user (uses session) */
export async function getSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserSubscription;
}

/** Get subscription using service role (for webhooks) */
export function getSubscriptionByStripeCustomer(stripeCustomerId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();
}

/** Create 1-month free trial subscription for new learners. No-op if user already has a subscription. */
export async function createFreeTrialSubscription(userId: string): Promise<{ created: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { created: false, error: "Service role not configured" };
  }
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { created: false };

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { error } = await supabase.from("user_subscriptions").insert({
    user_id: userId,
    subscription_plan_id: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    status: "trialing",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
  });
  if (error) return { created: false, error: error.message };
  return { created: true };
}

/** Upsert user_subscriptions (service role only) */
export async function upsertSubscription(row: {
  user_id: string;
  subscription_plan_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}) {
  const supabase = createServiceClient();
  return supabase.from("user_subscriptions").upsert(
    {
      ...row,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/** Check if user has active paid subscription */
export function hasActiveSubscription(sub: UserSubscription | null): boolean {
  if (!sub) return false;
  return ACTIVE_STATUSES.includes(sub.status as (typeof ACTIVE_STATUSES)[number]);
}

/** Check if subscription is still valid (active or within grace period) */
export function isSubscriptionValid(sub: UserSubscription | null): boolean {
  if (!sub) return false;
  const periodEnd = (sub as { currentPeriodEnd?: string; current_period_end?: string }).currentPeriodEnd
    ?? (sub as { current_period_end?: string }).current_period_end;
  if (ACTIVE_STATUSES.includes(sub.status as (typeof ACTIVE_STATUSES)[number])) {
    if (sub.status === "trialing" && periodEnd && new Date(periodEnd) <= new Date()) return false;
    return true;
  }
  if (sub.status === "canceled" && periodEnd) {
    return new Date(periodEnd) > new Date();
  }
  return false;
}

/** Get entitlements for user */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sub = await getSubscription(userId);
  const hasPaid = isSubscriptionValid(sub);

  return {
    plan: hasPaid ? "paid" : "free",
    ...(hasPaid ? PAID_ENTITLEMENTS : FREE_ENTITLEMENTS),
  };
}
