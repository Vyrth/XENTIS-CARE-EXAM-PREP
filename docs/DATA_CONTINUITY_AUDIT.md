# Data Continuity Audit: Subscription Changes

**Date:** 2025-03-11  
**Goal:** Ensure learner data remains attached to the same profile when users move from free trial → paid, or when subscription changes (upgrade/downgrade).

---

## Executive Summary

**Confirmation: Upgrading keeps all prior learner data.** All learner data is keyed by `user_id` (which references `profiles.id`). Subscription state lives in `user_subscriptions`, which uses `UNIQUE(user_id)` and is updated in-place via upsert. No learner tables reference `subscription_id` or `user_subscriptions`. Subscription changes do not create new profiles or detach data.

---

## 1. Root Causes Found

**None.** The schema and application logic already enforce data continuity:

- All learner tables use `user_id UUID NOT NULL REFERENCES profiles(id)`.
- `user_subscriptions` has `UNIQUE(user_id)` — one row per user.
- Stripe webhook and `upsertSubscription` use `onConflict: "user_id"` — upgrades/downgrades update the same row.
- Checkout sessions pass `metadata: { user_id }` so webhooks can associate Stripe events with the correct profile.

---

## 2. Tables Audited

| Data Area | Table(s) | Key | Status |
|-----------|----------|-----|--------|
| Exam sessions | `exam_sessions` | `user_id` | ✓ |
| Exam answers | `exam_session_questions` (via `exam_session_id` → `exam_sessions.user_id`) | Indirect via session | ✓ |
| System exam attempts | `system_exam_attempts` | `user_id` | ✓ |
| Standalone attempts | `user_question_attempts` | `user_id` | ✓ |
| Readiness | `user_readiness_snapshots`, `user_performance_trends` | `user_id` | ✓ |
| Mastery | `user_topic_mastery`, `user_subtopic_mastery`, `user_system_mastery`, `user_domain_mastery`, `user_skill_mastery`, `user_item_type_performance` | `user_id` | ✓ |
| Weak areas / recommendations | `adaptive_recommendation_profiles`, `adaptive_question_queue`, `recommended_content_queue`, `user_remediation_plans` | `user_id` | ✓ |
| Notes | `user_notes` | `user_id` | ✓ |
| Highlights | `user_highlights` | `user_id` | ✓ |
| Flashcard progress | `user_flashcard_progress` | `user_id` | ✓ |
| Study guide progress | `study_material_progress` | `user_id` | ✓ |
| Video progress | `video_progress` | `user_id` | ✓ |
| Streaks | `user_streaks` | `user_id` | ✓ |
| Checkpoint progress | `user_system_checkpoint_progress` | `user_id` | ✓ |
| Adaptive exam | `adaptive_exam_sessions` | `user_id` | ✓ |
| Achievements | (no dedicated table; derived from other data) | — | N/A |

**Subscription model:**

| Table | Key | Notes |
|-------|-----|-------|
| `user_subscriptions` | `user_id` (UNIQUE) | One row per user; upsert on subscription change |

---

## 3. Subscription Flow Verification

### Trial → Paid Upgrade

1. User signs up → `handle_new_user` creates `profiles` row with `id = auth.users.id`.
2. Onboarding creates free trial via `createFreeTrialSubscription(userId)` → inserts `user_subscriptions` with `user_id`, no Stripe IDs.
3. User upgrades → `createCheckoutSession({ userId, ... })` creates Stripe checkout with `metadata: { user_id }`.
4. Webhook `checkout.session.completed` → `upsertSubscription({ user_id: session.metadata.user_id, ... })`.
5. `upsertSubscription` uses `onConflict: "user_id"` → **updates** existing trial row (same `user_id`).
6. All learner data remains attached to the same `profiles.id`.

### Downgrade / Cancel

- `customer.subscription.updated` / `customer.subscription.deleted` → webhook looks up `user_id` from `user_subscriptions` by `stripe_customer_id`, then upserts with that `user_id`.
- Same profile, same data.

---

## 4. Auth Provider Considerations

**Current behavior:** One `auth.users` row per sign-in. `handle_new_user` creates one `profiles` row per `auth.users` insert. `profiles.id = auth.users.id` (1:1).

**Risk:** Supabase can create separate `auth.users` for the same email when using different providers (e.g., Google vs Apple). That would create duplicate profiles and split learner data.

**Recommendation:** In Supabase Dashboard → Authentication → Providers:

- Enable **Confirm email** so email is the stable identifier.
- Consider **Account linking** (if available) so multiple providers map to one `auth.users` row.
- Document that users should use the same sign-in method (or linked account) to avoid duplicate profiles.

No code changes required for the typical case; our code does not create duplicate profiles. The risk is at the Supabase Auth configuration level.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `docs/DATA_CONTINUITY_AUDIT.md` | **Created** — this audit document |

No schema or application code changes were required. All tables and flows already enforce data continuity.

---

## 6. Migrations / Safeguards

**No migrations required.** Schema already enforces:

- `user_subscriptions.UNIQUE(user_id)` — prevents multiple subscription rows per user.
- All learner tables: `user_id REFERENCES profiles(id)` — data tied to profile, not subscription.

**Optional future safeguard:** Add a migration comment or CHECK constraint documenting that learner data must be keyed by `user_id`. Not strictly necessary given current design.

---

## 7. RLS Policies

All learner tables use `user_id = auth.uid()` in RLS policies (`supabase/migrations/20250306000014_rls_policies.sql`). Access is based on authenticated user, not subscription. Subscription changes do not affect RLS.

---

## 8. Confirmation

**Upgrading keeps all prior learner data.** Data continuity is enforced by:

1. Learner data keyed by `user_id` (profile), never by subscription.
2. `user_subscriptions` upsert by `user_id` — no new rows on upgrade.
3. Stripe checkout and webhooks pass/lookup `user_id` correctly.
4. RLS uses `auth.uid()` — same user, same access regardless of subscription tier.
