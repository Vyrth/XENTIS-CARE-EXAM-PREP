/**
 * Centralized learner access control
 *
 * RULE: During active 30-day trial, learners have FULL access (no quotas, no locked pages).
 * After trial expires, package rules apply (free = limited, paid = full).
 *
 * All learner gates MUST use getEntitlements() or helpers below. Admin routes are independent.
 */

import { getSubscription, getEntitlements, isSubscriptionValid } from "./subscription";

/** Plan from learner perspective: paid = trial OR paid subscription */
export type LearnerPlan = "free" | "paid";

/**
 * True when user has full learner access (active trial OR paid subscription).
 * Use this for high-level checks; for specific limits use getEntitlements.
 */
export async function hasFullLearnerAccess(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  return isSubscriptionValid(sub);
}

/** Re-export - single source of truth for entitlements */
export { getEntitlements, isSubscriptionValid, hasActiveSubscription } from "./subscription";
