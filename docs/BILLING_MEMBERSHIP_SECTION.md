# Billing Membership Section

## Overview

The Billing page now includes a dedicated Membership section that clearly shows current plan details and available plans for upgrade.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/billing/plans.ts` | **New** – Plan definitions, slug resolution, helpers |
| `src/components/billing/MembershipSection.tsx` | **New** – Membership UI component |
| `src/app/(app)/billing/page.tsx` | Refactored to use MembershipSection |

## Current Plan Fields Shown

| Field | Source | Display |
|-------|--------|---------|
| Plan name | Resolved from subscription | Free, 1-Month Free Trial, 3 Month, 6 Month, 12 Month, or Pro |
| Status | Subscription status | Free, Trial active, Paid |
| Price | Plan config | $0, $99, $179, $299 |
| Period | Plan config | forever, for 1 month, /3 months, /6 months, /year |
| Expiration/renewal date | `current_period_end` | "Trial ends Jan 15, 2026" or "Renews Mar 15, 2026" |
| Benefits summary | Plan features | Bullet list of included features |

## Available Plan Fields Shown

| Field | Display |
|-------|---------|
| Plan name | 3 Month, 6 Month, 12 Month |
| Price | $99, $179, $299 |
| Period | /3 months, /6 months, /year |
| Features | Top 4 features per plan |
| CTA | "Upgrade plan" (button) or "View pricing" (link) |
| Current badge | Shown on active paid plan when applicable |

## Honest Placeholders

| Scenario | Placeholder |
|----------|-------------|
| Stripe not configured | "Payment processing is being set up. Contact support to upgrade." |
| No Stripe price ID for plan | "View pricing" link instead of "Upgrade plan" button |
| No Stripe customer (paid user) | "View pricing" link for "Manage subscription" |
| Unknown paid plan (e.g. custom price) | "Pro" with generic paid features |

## No Fake Data

- No fake invoices
- No fake payment history
- No fake renewal data
- All dates come from `user_subscriptions.current_period_end`
- Status reflects actual subscription state
