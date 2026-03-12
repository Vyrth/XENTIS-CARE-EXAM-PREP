/**
 * POST /api/adaptive/next - Get next adaptive question
 * Body: { sessionId: string }
 * Returns: { question, itemId, servedOrder, difficultyB } (no correct answer)
 * Uses adaptive-engine: creates item, updates session, updates question_calibration.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getNextAdaptiveQuestion } from "@/lib/adaptive/adaptive-engine";
import { logAdaptiveEvent } from "@/lib/adaptive/api-helpers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { sessionId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "sessionId is required and must be a valid UUID" }, { status: 400 });
    }

    const result = await getNextAdaptiveQuestion({ sessionId, userId: user.id });
    if (!result) {
      return NextResponse.json(
        { error: "No next question available. Session may be completed or no candidates." },
        { status: 404 }
      );
    }

    logAdaptiveEvent("question_served", sessionId, user.id, {
      questionId: result.questionId,
      itemId: result.itemId,
      servedOrder: result.servedOrder,
    });

    return NextResponse.json({
      itemId: result.itemId,
      questionId: result.questionId,
      question: result.question,
      servedOrder: result.servedOrder,
      difficultyB: result.difficultyB,
    });
  } catch (e) {
    console.error("[adaptive/next]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
