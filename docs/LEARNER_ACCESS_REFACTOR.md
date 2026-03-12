# Learner Access Control Refactor – Trial Model

## Summary

Centralized learner access for the 1-month free trial model. During trial, full access; after expiry, package rules apply. Admin routes remain independent.

---

## 1. Centralized Access Rule

**Single source:** `src/lib/billing/access.ts`

| Condition | Entitlements |
|-----------|--------------|
| Active trial (`status=trialing`, `current_period_end` in future) | Full (PAID_ENTITLEMENTS) |
| Paid subscription (`status=active`) | Full (PAID_ENTITLEMENTS) |
| Expired trial or no subscription | Limited (FREE_ENTITLEMENTS) |

**Rule:** All learner gates use `getEntitlements(userId)` from `@/lib/billing/access`.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/billing/access.ts` | **Created** – Central access module, `hasFullLearnerAccess`, re-exports |
| `src/lib/billing/subscription.ts` | Added trial model comment |
| `src/lib/billing/entitlements.ts` | Import from `access` instead of `subscription` |
| `src/app/(app)/billing/page.tsx` | Import from `access` |
| `src/app/(app)/flashcards/page.tsx` | Import from `access` |
| `src/app/(app)/flashcards/[deckId]/page.tsx` | Import from `access` |
| `src/app/api/me/route.ts` | Import from `access` |
| `src/app/api/ai/route.ts` | Import from `access` |
| `supabase/migrations/20250312000002_has_subscription_include_trial.sql` | **Created** – RLS `has_subscription_for_track` includes trialing |

---

## 3. Old Rules Removed

- None removed. Logic was already correct; changes are centralization and RLS fix.
- `has_subscription_for_track` previously only checked `status='active'`; it now also treats valid `trialing` as full access.

---

## 4. Routes Verified

| Route / Area | Gate | Trial = Full? |
|--------------|------|---------------|
| `/api/ai` (Jade Tutor) | `canPerformAIAction` → `getEntitlements` | ✓ |
| `/api/questions/ids` | `canAnswerQuestions` → `getEntitlements` | ✓ |
| `/api/me` | `getEntitlements` | ✓ |
| `/flashcards` | `flashcardDecksLimit` from entitlements | ✓ |
| `/flashcards/[deckId]` | `flashcardDecksLimit` | ✓ |
| `/exam/system/[systemId]` | `canAccessSystemExams` → `getEntitlements` | ✓ |
| `/billing` | `getEntitlements` for plan display | ✓ |
| `/admin/*` | `isAdmin` (independent) | N/A |

---

## 5. Middleware

- No subscription checks in middleware. Auth only; admin role checked in layout.

---

## 6. Billing Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `getEntitlements` | `access.ts` | Single source for plan + limits |
| `hasFullLearnerAccess` | `access.ts` | Boolean full-access check |
| `canPerformAIAction` | `entitlements.ts` | AI daily limit |
| `canAnswerQuestions` | `entitlements.ts` | Question daily limit |
| `canAccessSystemExams` | `entitlements.ts` | System exam access |
| `canAccessFullPrePractice` | `entitlements.ts` | Pre-practice full vs diagnostic (currently unused) |

---

## 7. AI Gating

- `canPerformAIAction` uses `getEntitlements` → `aiActionsPerDay`.
- Trial: 999/day (PAID_ENTITLEMENTS).
- Rate limit: `checkRateLimit(userId, isPaid)` – trial users treated as paid.

---

## 8. Dashboard & Study Feature Locks

- Flashcards: `flashcardDecksLimit` (trial = 999).
- System exams: `canAccessSystemExams` (trial = true).
- Study guides, videos: no per-item limits; content loaded by track.
- Pre-practice: no gate; `canAccessFullPrePractice` exists but is unused.
