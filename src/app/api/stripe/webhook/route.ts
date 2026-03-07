/**
 * Stripe webhook handler - idempotent, retry-safe.
 * Returns 200 quickly; process sync. On error return 500 so Stripe retries.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { upsertSubscription } from "@/lib/billing/subscription";
import Stripe from "stripe";

const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  console.warn("STRIPE_WEBHOOK_SECRET not set - webhook will fail");
}

export async function POST(request: Request) {
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, sig, secret);
  } catch (err) {
    console.warn("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency: skip if already processed
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string | null;

        if (!userId || !subscriptionId) {
          console.warn("[webhook] checkout.session.completed missing user_id or subscription");
          break;
        }

        // Fetch subscription details from Stripe
        const { getStripe } = await import("@/lib/billing/stripe");
        const stripe = getStripe();
        if (!stripe) throw new Error("Stripe not configured");
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const item = sub.items.data[0];
        const priceId = item?.price?.id ?? null;
        const periodStart = item?.current_period_start;
        const periodEnd = item?.current_period_end;

        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: session.customer as string | null,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: sub.status,
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!existingSub) {
          console.warn("[webhook] No user_subscription for customer", customerId);
          break;
        }

        const item = sub.items.data[0];
        const priceId = item?.price?.id ?? null;
        const periodStart = item?.current_period_start;
        const periodEnd = item?.current_period_end;

        await upsertSubscription({
          user_id: existingSub.user_id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status: sub.status,
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
        });
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    // Record processed event for idempotency
    await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload_summary: { type: event.type },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Processing failed:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
