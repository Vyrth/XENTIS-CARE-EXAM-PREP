/**
 * Stripe checkout session API - creates checkout for paid plans.
 * Returns checkout URL for redirect.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createCheckoutSession, getPriceIdForPlan } from "@/lib/billing/stripe";
import { getAuthBaseUrl } from "@/lib/auth/url";

const PAID_SLUGS = ["3_month", "6_month", "12_month"] as const;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { planSlug?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planSlug = body.planSlug?.trim();
  if (!planSlug || !PAID_SLUGS.includes(planSlug as (typeof PAID_SLUGS)[number])) {
    return NextResponse.json(
      { error: "Invalid plan. Use planSlug: '3_month', '6_month', or '12_month'." },
      { status: 400 }
    );
  }

  const priceId = getPriceIdForPlan(planSlug);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe not configured for this plan." },
      { status: 503 }
    );
  }

  const baseUrl = getAuthBaseUrl();
  const successUrl = `${baseUrl}/onboarding?checkout=success`;
  const cancelUrl = `${baseUrl}/onboarding`;

  try {
    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? "",
      priceId,
      successUrl,
      cancelUrl,
    });

    const url = session.url;
    if (!url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
