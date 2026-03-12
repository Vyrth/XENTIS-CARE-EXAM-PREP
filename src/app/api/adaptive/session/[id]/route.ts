/**
 * GET /api/adaptive/session/[id] - Get adaptive exam session summary
 * Returns: session metadata, items, performance by domain/system/topic
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("adaptive_exam_sessions")
      .select(`
        id,
        user_id,
        exam_track_id,
        status,
        started_at,
        completed_at,
        theta_estimate,
        standard_error,
        readiness_score,
        confidence_band,
        question_count,
        correct_count,
        incorrect_count,
        stop_reason,
        result,
        exam_tracks(slug, name),
        adaptive_exam_configs(slug, name)
      `)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("adaptive_exam_items")
      .select(`
        id,
        question_id,
        served_order,
        domain_id,
        system_id,
        topic_id,
        difficulty_b,
        is_correct,
        time_spent_seconds,
        theta_before,
        theta_after,
        domains(slug, name),
        systems(slug, name),
        topics(slug, name)
      `)
      .eq("adaptive_exam_session_id", sessionId)
      .order("served_order", { ascending: true });

    const byDomain: Record<string, { correct: number; total: number; slug?: string; name?: string }> = {};
    const bySystem: Record<string, { correct: number; total: number; slug?: string; name?: string }> = {};
    const byTopic: Record<string, { correct: number; total: number; slug?: string; name?: string }> = {};

    for (const it of items ?? []) {
      const correct = it.is_correct ? 1 : 0;
      const dom = Array.isArray(it.domains) ? it.domains[0] : it.domains;
      const sys = Array.isArray(it.systems) ? it.systems[0] : it.systems;
      const top = Array.isArray(it.topics) ? it.topics[0] : it.topics;

      if (it.domain_id) {
        const k = it.domain_id;
        if (!byDomain[k]) byDomain[k] = { correct: 0, total: 0, slug: (dom as { slug?: string })?.slug, name: (dom as { name?: string })?.name };
        byDomain[k].total++;
        if (it.is_correct) byDomain[k].correct++;
      }
      if (it.system_id) {
        const k = it.system_id;
        if (!bySystem[k]) bySystem[k] = { correct: 0, total: 0, slug: (sys as { slug?: string })?.slug, name: (sys as { name?: string })?.name };
        bySystem[k].total++;
        if (it.is_correct) bySystem[k].correct++;
      }
      if (it.topic_id) {
        const k = it.topic_id;
        if (!byTopic[k]) byTopic[k] = { correct: 0, total: 0, slug: (top as { slug?: string })?.slug, name: (top as { name?: string })?.name };
        byTopic[k].total++;
        if (it.is_correct) byTopic[k].correct++;
      }
    }

    const addPercent = <T extends { correct: number; total: number }>(
      m: Record<string, T & { slug?: string; name?: string }>
    ) =>
      Object.fromEntries(
        Object.entries(m).map(([k, v]) => [
          k,
          {
            ...v,
            percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
          },
        ])
      );

    const track = Array.isArray(session.exam_tracks) ? session.exam_tracks[0] : session.exam_tracks;
    const config = Array.isArray(session.adaptive_exam_configs) ? session.adaptive_exam_configs[0] : session.adaptive_exam_configs;

    const summary = {
      id: session.id,
      examTrackId: session.exam_track_id,
      trackSlug: (track as { slug?: string })?.slug,
      trackName: (track as { name?: string })?.name,
      configSlug: (config as { slug?: string })?.slug,
      configName: (config as { name?: string })?.name,
      status: session.status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      thetaEstimate: session.theta_estimate,
      standardError: session.standard_error,
      readinessScore: session.readiness_score,
      confidenceBand: session.confidence_band,
      questionCount: session.question_count,
      correctCount: session.correct_count,
      incorrectCount: session.incorrect_count,
      percentCorrect:
        (session.question_count ?? 0) > 0
          ? Math.round(((session.correct_count ?? 0) / (session.question_count ?? 1)) * 100)
          : 0,
      stopReason: session.stop_reason,
      result: session.result,
    };

    const itemSummaries = (items ?? []).map((it) => ({
      id: it.id,
      questionId: it.question_id,
      servedOrder: it.served_order,
      domainId: it.domain_id,
      systemId: it.system_id,
      topicId: it.topic_id,
      difficultyB: it.difficulty_b,
      isCorrect: it.is_correct,
      timeSpentSeconds: it.time_spent_seconds,
      thetaBefore: it.theta_before,
      thetaAfter: it.theta_after,
    }));

    return NextResponse.json({
      session: summary,
      items: itemSummaries,
      byDomain: addPercent(byDomain),
      bySystem: addPercent(bySystem),
      byTopic: addPercent(byTopic),
    });
  } catch (e) {
    console.error("[adaptive/session]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
