/**
 * POST /api/adaptive/finish - Finalize adaptive exam session
 * Body: { sessionId: string }
 * Returns: { result: final summary with readiness, confidence band, performance }
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { computeReadinessFromTheta } from "@/lib/adaptive";
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

    const supabase = createServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("adaptive_exam_sessions")
      .select("id, user_id, status, theta_estimate, standard_error, question_count, correct_count, incorrect_count, completed_at, stop_reason, readiness_score, confidence_band, result, adaptive_exam_configs(passing_theta)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      const result = await buildFinalResult(supabase, sessionId, session as Record<string, unknown>);
      return NextResponse.json({ result });
    }

    const theta = Number(session.theta_estimate ?? 0);
    const standardError = Number(session.standard_error ?? 9.99);
    const config = Array.isArray(session.adaptive_exam_configs)
      ? session.adaptive_exam_configs[0]
      : session.adaptive_exam_configs;
    const passingTheta = Number(config?.passing_theta ?? 0);

    const readiness = computeReadinessFromTheta({ theta, standardError, passingTheta });

    await supabase
      .from("adaptive_exam_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        stop_reason: "manual_finish",
        readiness_score: readiness.score,
        confidence_band: readiness.band,
        result: {
          theta,
          standardError,
          readinessScore: readiness.score,
          confidenceBand: readiness.band,
          questionCount: session.question_count,
          correctCount: session.correct_count,
          incorrectCount: session.incorrect_count,
        },
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    logAdaptiveEvent("session_finished", sessionId, user.id, { manual: true });

    const completedAt = new Date().toISOString();
    const result = await buildFinalResult(supabase, sessionId, {
      ...session,
      status: "completed",
      completed_at: completedAt,
      readiness_score: readiness.score,
      confidence_band: readiness.band,
    });

    return NextResponse.json({ result });
  } catch (e) {
    console.error("[adaptive/finish]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function buildFinalResult(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string,
  session: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data: items } = await supabase
    .from("adaptive_exam_items")
    .select("domain_id, system_id, topic_id, is_correct")
    .eq("adaptive_exam_session_id", sessionId);

  const byDomain: Record<string, { correct: number; total: number }> = {};
  const bySystem: Record<string, { correct: number; total: number }> = {};
  const byTopic: Record<string, { correct: number; total: number }> = {};

  for (const it of items ?? []) {
    const correct = it.is_correct ? 1 : 0;
    if (it.domain_id) {
      const k = it.domain_id;
      if (!byDomain[k]) byDomain[k] = { correct: 0, total: 0 };
      byDomain[k].total++;
      if (it.is_correct) byDomain[k].correct++;
    }
    if (it.system_id) {
      const k = it.system_id;
      if (!bySystem[k]) bySystem[k] = { correct: 0, total: 0 };
      bySystem[k].total++;
      if (it.is_correct) bySystem[k].correct++;
    }
    if (it.topic_id) {
      const k = it.topic_id;
      if (!byTopic[k]) byTopic[k] = { correct: 0, total: 0 };
      byTopic[k].total++;
      if (it.is_correct) byTopic[k].correct++;
    }
  }

  const addPercent = (m: Record<string, { correct: number; total: number }>) =>
    Object.fromEntries(
      Object.entries(m).map(([k, v]) => [
        k,
        { ...v, percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 },
      ])
    );

  return {
    sessionId,
    status: session.status,
    theta: session.theta_estimate,
    standardError: session.standard_error,
    readinessScore: session.readiness_score,
    confidenceBand: session.confidence_band,
    questionCount: session.question_count,
    correctCount: session.correct_count,
    incorrectCount: session.incorrect_count,
    percentCorrect:
      (session.question_count as number) > 0
        ? Math.round(((session.correct_count as number) / (session.question_count as number)) * 100)
        : 0,
    byDomain: addPercent(byDomain),
    bySystem: addPercent(bySystem),
    byTopic: addPercent(byTopic),
    completedAt: session.completed_at,
    stopReason: session.stop_reason,
  };
}
