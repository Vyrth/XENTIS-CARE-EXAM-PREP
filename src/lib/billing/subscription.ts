/**
 * Subscription service - read user_subscriptions, sync from Stripe
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  if (ACTIVE_STATUSES.includes(sub.status as (typeof ACTIVE_STATUSES)[number])) return true;
  if (sub.status === "canceled" && sub.currentPeriodEnd) {
    return new Date(sub.currentPeriodEnd) > new Date();
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
