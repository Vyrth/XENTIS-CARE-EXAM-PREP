# 1-Month Free Trial Implementation

## Summary

Every new learner who completes onboarding automatically receives a 1-month free trial with full access. No feature gating or quota limits during the trial.

---

## 1. Files Changed

| File | Change |
|------|--------|
| `src/lib/billing/subscription.ts` | Added `createFreeTrialSubscription()`; updated `isSubscriptionValid()` to expire trialing when `current_period_end` is past |
| `src/app/api/onboarding/route.ts` | Call `createFreeTrialSubscription(user.id)` after successful onboarding |
| `src/app/onboarding/page.tsx` | Added trial messaging: "You get 1 month free with full access." |
| `src/app/signup/page.tsx` | Added trial messaging: "You get 1 month free with full access." |

---

## 2. DB Fields / Tables Used

| Table | Fields | Purpose |
|-------|--------|---------|
| `user_subscriptions` | `user_id`, `subscription_plan_id`, `status`, `current_period_start`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `cancel_at_period_end` | Stores trial subscription |
| `subscription_plans` | (not used for trial) | Trial uses `subscription_plan_id = null` |

**Trial row values:**
- `user_id`: learner's profile id
- `subscription_plan_id`: null (platform trial, no Stripe)
- `status`: `'trialing'`
- `current_period_start`: now (ISO string)
- `current_period_end`: now + 30 days (ISO string)
- `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`: null
- `cancel_at_period_end`: false

---

## 3. How the Trial Is Activated

1. User signs up (Google, Apple, or email magic link).
2. User is redirected to `/onboarding` (new users) or `/dashboard` (returning).
3. User completes onboarding form (track, target date, study minutes, study mode) and submits.
4. `POST /api/onboarding` runs:
   - `completeOnboarding()` updates profile and `user_exam_tracks`
   - `createFreeTrialSubscription(user.id)` inserts a `user_subscriptions` row with `status='trialing'` and `current_period_end` = now + 30 days
5. If user already has a `user_subscriptions` row (e.g. paid, or previous trial), `createFreeTrialSubscription` does nothing (no duplicate).

---

## 4. How Full Access Is Granted During Trial

1. `getEntitlements(userId)` calls `getSubscription(userId)` → reads `user_subscriptions`.
2. `isSubscriptionValid(sub)` returns true when:
   - `status` is `'active'` or `'trialing'`, and
   - for `'trialing'`, `current_period_end` is in the future (or null).
3. When valid, `getEntitlements` returns `PAID_ENTITLEMENTS` (full access, no quota limits).
4. All learner access checks use `getEntitlements` or `canAnswerQuestions` / `canPerformAIAction` / etc., which all flow through `getEntitlements`. So trial users get full access.

---

## 5. No Duplicate Trials

`createFreeTrialSubscription` checks for an existing `user_subscriptions` row for the user before inserting. If one exists, it returns `{ created: false }` and does not insert.

---

## 6. Trial Expiry

When `current_period_end` is in the past, `isSubscriptionValid` returns false for `status='trialing'`. The user then receives `FREE_ENTITLEMENTS` (limited access). No automatic conversion to paid; the row stays as `trialing` with expired period.
