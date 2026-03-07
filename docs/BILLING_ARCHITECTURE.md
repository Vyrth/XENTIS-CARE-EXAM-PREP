# Billing & Entitlements Architecture

## Plans

| Plan | Duration | Stripe | Entitlements |
|------|----------|--------|---------------|
| Free | — | None | Limited questions, limited AI/day, 1 diagnostic slice |
| 3 months | 3 months | Recurring | Full access |
| 6 months | 6 months | Recurring | Full access |
| 12 months | 12 months | Recurring | Full access |

## Stripe Product/Price Modeling

**Recommendation**: Single product "Xentis Care Premium" with 3 prices:

- `price_3mo` — $X every 3 months
- `price_6mo` — $Y every 6 months (discount)
- `price_12mo` — $Z every 12 months (best value)

**Environment variables**:
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_ID_3MO=price_...
STRIPE_PRICE_ID_6MO=price_...
STRIPE_PRICE_ID_12MO=price_...
```

**Coupon codes**: Create in Stripe Dashboard. Pass `coupon` or `promotion_code` to Checkout Session.

## Flow

1. User clicks "Upgrade" → POST `/api/stripe/checkout` with `priceId`, `coupon?`
2. Create Stripe checkout session with `success_url`, `cancel_url`, `customer_email`
3. Redirect to Stripe Checkout
4. On success: redirect to `/billing/success?session_id=...`
5. Webhook `checkout.session.completed` → create/update `user_subscriptions`
6. Webhook `customer.subscription.updated/deleted` → update `user_subscriptions`

## Downgrade

- **Canceled**: `cancel_at_period_end=true` → access until `current_period_end`
- **Expired**: `status=canceled` → set `user_subscriptions.status='canceled'`
- **Past due**: `status=past_due` → grace period; may restrict access

## Entitlement Checks

- `getSubscription(userId)` → `user_subscriptions` or null
- `hasActiveSubscription(userId)` → status in ['active','trialing']
- `getEntitlements(userId)` → { questionsLimit, aiLimit, prePracticeAccess, ... }

## Customer Portal

- `createBillingPortalSession(customerId, returnUrl)` → Stripe Customer Portal
- User manages payment method, cancel, view invoices
