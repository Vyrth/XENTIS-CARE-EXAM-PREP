/**
 * AI Tutor API - server-side only, no API keys exposed to client
 * Rate limited per user (free: 20/min, paid: 100/min)
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/subscription";
import { checkRateLimit } from "@/lib/rate-limit";
import { runAIAction } from "@/lib/ai/orchestrator";
import { logAIInteraction } from "@/lib/ai/logging";
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
  const userId = user?.id;

  let body: AIRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, track } = body;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!track || !VALID_TRACKS.includes(track)) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }

  // Rate limit (free: 20/min, paid: 100/min)
  const entitlements = userId ? await getEntitlements(userId) : null;
  const isPaid = entitlements?.plan === "paid";
  const rateCheck = checkRateLimit(userId ?? "anon", isPaid);
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

  const req: AIRequest = {
    ...body,
    userId,
    action,
    track,
  };

  const result = await runAIAction(req);

  if (result.success && result.data) {
    await logAIInteraction({
      userId,
      action,
      track,
      promptTokens: undefined,
      completionTokens: undefined,
      model: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : undefined,
      contentRefs: result.data.contentRefs,
    });
    return NextResponse.json({ success: true, data: result.data });
  }

  await logAIInteraction({
    userId,
    action,
    track,
    error: result.error,
  });

  return NextResponse.json(
    { success: false, error: result.error ?? "AI request failed" },
    { status: 500 }
  );
}
