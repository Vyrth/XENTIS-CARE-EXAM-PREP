# Onboarding Plan Selection Flow

## Overview

First-time users now see a deliberate plan selection step before completing onboarding. The free trial is no longer auto-assigned on onboarding form submission.

## Root Cause of Previous Auto-Free Assignment

**Location:** `src/app/api/onboarding/route.ts` (lines 133–140, now removed)

The free trial was created when the user submitted the onboarding form (track, target date, study minutes, study mode). The flow was:

1. User signs up → auth callback → `/onboarding`
2. User fills study-plan form → POST `/api/onboarding`
3. API called `completeOnboarding()` then `createFreeTrialSubscription()`
4. Trial was auto-assigned with no user choice

## New First-Time User Flow

1. **Sign up** (email, Google, Apple) → auth callback → `/onboarding`
2. **Plan selection step** (if no subscription):
   - 1-month free trial (recommended badge)
   - 3-month, 6-month, 12-month paid plans
   - Value summary for each
3. **If user selects free trial:**
   - POST `/api/onboarding/select-plan` with `{ plan: "trial" }`
   - Trial is created
   - Page refreshes → study-plan form is shown
4. **If user selects paid plan:**
   - POST `/api/stripe/checkout` with `{ planSlug }`
   - Redirect to Stripe Checkout
   - After purchase → webhook creates subscription
   - Success URL: `/onboarding?checkout=success`
   - Page shows study-plan form (with brief polling if webhook is delayed)
5. **Study-plan form** (track, target date, study minutes, study mode)
6. POST `/api/onboarding` → `completeOnboarding()` only (no trial creation)
7. Redirect to `/dashboard`

## Existing Users

- Users with `onboarding_completed_at` and `primary_exam_track_id` are redirected to `/dashboard` by the onboarding layout.
- They never see the plan selection step.
- Auth callback sends them to `/dashboard` when `needsOnboarding` is false.

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/onboarding/select-plan/route.ts` | **New** – Activates free trial when user chooses it |
| `src/app/api/stripe/checkout/route.ts` | **New** – Creates Stripe checkout session for paid plans |
| `src/app/api/onboarding/route.ts` | Removed `createFreeTrialSubscription` call |
| `src/app/onboarding/page.tsx` | Two-step flow: fetches subscription, passes to `OnboardingFlow` |
| `src/app/onboarding/OnboardingFlow.tsx` | **New** – Client wrapper: plan step vs study form |
| `src/app/onboarding/OnboardingForm.tsx` | Unchanged (still used for study-plan step) |
| `src/components/billing/PlanSelectStep.tsx` | **New** – Plan comparison and selection UI |

## Confirmation

- **Users can choose trial or paid plan:** Yes. Plan selection shows trial and all paid plans. User must choose before continuing.
- **Existing users unaffected:** Yes. Onboarding layout redirects users with `onboarding_completed_at` to dashboard. Auth callback routes returning users to dashboard.
- **Auth flows preserved:** No changes to signup, login, OAuth callback, or middleware.
- **Billing model intact:** `createFreeTrialSubscription`, `user_subscriptions`, Stripe webhook, and entitlements unchanged.

## Environment

Stripe checkout requires:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_3MO`, `STRIPE_PRICE_ID_6MO`, `STRIPE_PRICE_ID_12MO` (from `config/billing.ts`)

If Stripe is not configured, paid plan buttons return 503.
