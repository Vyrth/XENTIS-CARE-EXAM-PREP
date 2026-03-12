/**
 * POST /api/adaptive/answer - Submit answer and update theta
 * Body: { sessionId, itemId, answer: ExamResponse, timeSpentSeconds?: number }
 * Returns: { correct, theta, standardError, readinessScore, confidenceBand, stop, stopReason? }
 * Uses adaptive-engine submitAdaptiveAnswer.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { submitAdaptiveAnswer } from "@/lib/adaptive/adaptive-engine";
import { logAdaptiveEvent } from "@/lib/adaptive/api-helpers";
import type { ExamResponse } from "@/types/exam";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidExamResponse(v: unknown): v is ExamResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.type !== "string") return false;
  if (o.type === "single" && typeof o.value !== "string") return false;
  if ((o.type === "multiple" || o.type === "ordered") && !Array.isArray(o.value)) return false;
  if (o.type === "numeric" && typeof o.value !== "number") return false;
  if ((o.type === "hotspot" || o.type === "highlight") && !Array.isArray(o.value)) return false;
  if ((o.type === "dropdown" || o.type === "matrix") && (typeof o.value !== "object" || Array.isArray(o.value)))
    return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { sessionId?: string; itemId?: string; answer?: unknown; timeSpentSeconds?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "sessionId is required and must be a valid UUID" }, { status: 400 });
    }
    if (!itemId || !UUID_REGEX.test(itemId)) {
      return NextResponse.json({ error: "itemId is required and must be a valid UUID" }, { status: 400 });
    }
    if (!isValidExamResponse(body.answer)) {
      return NextResponse.json({ error: "answer is required and must be a valid ExamResponse" }, { status: 400 });
    }
    const timeSpentSeconds =
      typeof body.timeSpentSeconds === "number" && body.timeSpentSeconds >= 0
        ? Math.floor(body.timeSpentSeconds)
        : undefined;

    const result = await submitAdaptiveAnswer({
      sessionId,
      itemId,
      userId: user.id,
      answerPayload: body.answer as ExamResponse,
      timeSpentSeconds,
    });

    if (!result.success) {
      const status = result.error === "Session not found" ? 404 : result.error === "Item not found" ? 404 : result.error === "Item already answered" ? 409 : 500;
      return NextResponse.json({ error: result.error ?? "Failed to submit answer" }, { status });
    }

    logAdaptiveEvent("answer_submitted", sessionId, user.id, {
      itemId,
      isCorrect: result.correct,
      stop: result.stop,
      stopReason: result.stopReason,
    });

    return NextResponse.json({
      correct: result.correct,
      theta: result.theta,
      standardError: result.standardError,
      readinessScore: result.readinessScore,
      confidenceBand: result.confidenceBand,
      stop: result.stop,
      ...(result.stop && result.stopReason ? { stopReason: result.stopReason } : {}),
    });
  } catch (e) {
    console.error("[adaptive/answer]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
