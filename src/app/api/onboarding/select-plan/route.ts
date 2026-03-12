/**
 * Plan selection API - activates free trial for first-time users.
 * Called when user explicitly chooses the free trial during onboarding.
 * No-op if user already has a subscription.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createFreeTrialSubscription } from "@/lib/billing/subscription";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.plan !== "trial") {
    return NextResponse.json(
      { error: "Invalid plan. Use plan: 'trial' for free trial." },
      { status: 400 }
    );
  }

  const result = await createFreeTrialSubscription(user.id);
  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    created: result.created,
  });
}
