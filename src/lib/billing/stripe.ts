/**
 * Stripe helpers - checkout, portal, webhook verification
 */

import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@/config/billing";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function getStripe(): Stripe | null {
  return stripe;
}

export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  coupon?: string;
  promotionCode?: string;
}) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: params.userEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      metadata: { user_id: params.userId },
      ...(params.coupon && { coupon: params.coupon }),
      ...(params.promotionCode && { promotion_code: params.promotionCode }),
    },
    metadata: { user_id: params.userId },
    allow_promotion_codes: true,
  });

  return session;
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export function getPriceIdForPlan(planSlug: string): string | null {
  return STRIPE_PRICE_IDS[planSlug] ?? null;
}
