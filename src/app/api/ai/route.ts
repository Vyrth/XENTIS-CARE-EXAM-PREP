/**
 * AI Tutor API - server-side only, no API keys exposed to client
 * Rate limited per user (free: 20/min, paid: 100/min)
 * Entitlement: Free users limited to aiActionsPerDay (e.g. 3/day)
 * Track is resolved from signed-in user's primary track (hard constraint).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/access";
import { canPerformAIAction } from "@/lib/billing/entitlements";
import { checkRateLimit } from "@/lib/rate-limit";
import { runAIAction } from "@/lib/ai/orchestrator";
import { logAIInteraction } from "@/lib/ai/logging";
import { enforceJadeTrackContext } from "@/lib/ai/jade-track-context";
import { loadAnalyticsForJade } from "@/lib/ai/jade-analytics";
import type { AIRequest, AIAction } from "@/types/ai-tutor";

const VALID_ACTIONS: AIAction[] = [
  "explain_question",
  "explain_highlight",
  "compare_concepts",
  "generate_flashcards",
  "summarize_to_notebook",
  "weak_area_coaching",
  "quiz_followup",
  "generate_mnemonic",
];

const VALID_TRACKS = ["lvn", "rn", "fnp", "pmhnp"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to use Jade Tutor" },
      { status: 401 }
    );
  }

  let body: AIRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, track: clientTrack } = body;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (clientTrack && !VALID_TRACKS.includes(clientTrack)) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }

  const trackContext = await enforceJadeTrackContext(
    user.id,
    clientTrack,
    action
  );
  if (!trackContext) {
    return NextResponse.json(
      { error: "Complete onboarding to set your exam track" },
      { status: 400 }
    );
  }
  const track = trackContext.track;

  // Entitlement: daily AI action limit (Free: 3/day)
  const aiCheck = await canPerformAIAction(user.id);
  if (!aiCheck.allowed) {
    return NextResponse.json(
      {
        error: `Daily Jade Tutor limit reached (${aiCheck.used}/${aiCheck.limit}). Upgrade for unlimited access.`,
        code: "ENTITLEMENT_LIMIT",
        upgradeRequired: true,
      },
      { status: 402 }
    );
  }

  // Rate limit (free: 20/min, paid: 100/min)
  const entitlements = await getEntitlements(user.id);
  const isPaid = entitlements?.plan === "paid";
  const rateCheck = checkRateLimit(user.id, isPaid);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      {
        status: 429,
        headers: rateCheck.retryAfter
          ? { "Retry-After": String(rateCheck.retryAfter) }
          : undefined,
      }
    );
  }

  const analytics = await loadAnalyticsForJade(user.id);
  const req: AIRequest = {
    ...body,
    userId: user.id,
    action,
    track,
    analytics: analytics ? (analytics as AIRequest["analytics"]) : undefined,
  };

  const result = await runAIAction(req);

  const supabase = await createClient();
  if (result.success && result.data) {
    await logAIInteraction(
      {
        userId: user.id,
        action,
        track,
        promptTokens: undefined,
        completionTokens: undefined,
        model: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : undefined,
        contentRefs: result.data.contentRefs,
      },
      supabase
    );
    return NextResponse.json({ success: true, data: result.data });
  }

  await logAIInteraction(
    {
      userId: user.id,
      action,
      track,
      error: result.error,
    },
    supabase
  );

  if (process.env.NODE_ENV !== "test") {
    console.warn("[jade-tutor] request failed", {
      action,
      userId: user.id.slice(0, 8),
      error: result.error,
    });
  }

  return NextResponse.json(
    { success: false, error: result.error ?? "AI request failed" },
    { status: 500 }
  );
}
