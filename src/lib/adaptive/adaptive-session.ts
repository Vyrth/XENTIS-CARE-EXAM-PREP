/**
 * Adaptive Exam Session Service
 *
 * Session lifecycle: create, complete, get.
 * Uses adaptive_exam_configs, adaptive_exam_sessions.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface CreateAdaptiveExamSessionParams {
  userId: string;
  examTrackId: string;
  configSlug?: string | null;
}

export interface CreateAdaptiveExamSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface AdaptiveSessionRow {
  id: string;
  userId: string;
  examTrackId: string;
  adaptiveExamConfigId: string;
  status: string;
  thetaEstimate: number;
  standardError: number;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  completedAt: string | null;
  stopReason: string | null;
}

/**
 * Create a new adaptive exam session for a user and track.
 * Resolves config by slug (e.g. "rn-cat") or uses default for track.
 */
export async function createAdaptiveExamSession(
  params: CreateAdaptiveExamSessionParams
): Promise<CreateAdaptiveExamSessionResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const { userId, examTrackId, configSlug } = params;

  const trackSlug = await resolveTrackSlug(supabase, examTrackId);
  const slugToUse = configSlug?.trim() || `${trackSlug}-cat`;

  const { data: config, error: configError } = await supabase
    .from("adaptive_exam_configs")
    .select("id")
    .eq("exam_track_id", examTrackId)
    .eq("slug", slugToUse)
    .maybeSingle();

  let configId: string;
  if (configError || !config) {
    const { data: fallback } = await supabase
      .from("adaptive_exam_configs")
      .select("id")
      .eq("exam_track_id", examTrackId)
      .limit(1)
      .maybeSingle();
    if (!fallback) {
      return { success: false, error: "No adaptive config found for this track" };
    }
    configId = fallback.id;
  } else {
    configId = config.id;
  }

  const { data: session, error: insertError } = await supabase
    .from("adaptive_exam_sessions")
    .insert({
      user_id: userId,
      exam_track_id: examTrackId,
      adaptive_exam_config_id: configId,
      status: "in_progress",
      theta_estimate: 0,
      standard_error: 9.99,
      question_count: 0,
      correct_count: 0,
      incorrect_count: 0,
    })
    .select("id")
    .single();

  if (insertError || !session) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to create session",
    };
  }

  return { success: true, sessionId: session.id };
}

/**
 * Complete an adaptive exam session.
 * Sets status=completed, completed_at, stop_reason, readiness_score, confidence_band, result.
 */
export async function completeAdaptiveExamSession(
  sessionId: string,
  userId: string,
  stopReason: string,
  readinessScore?: number,
  confidenceBand?: string,
  result?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("adaptive_exam_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stop_reason: stopReason,
      readiness_score: readinessScore ?? null,
      confidence_band: confidenceBand ?? null,
      result: result ?? {},
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get adaptive session by ID, verifying user ownership.
 */
export async function getAdaptiveSession(
  sessionId: string,
  userId: string
): Promise<AdaptiveSessionRow | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("adaptive_exam_sessions")
    .select("id, user_id, exam_track_id, adaptive_exam_config_id, status, theta_estimate, standard_error, question_count, correct_count, incorrect_count, completed_at, stop_reason")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    examTrackId: data.exam_track_id,
    adaptiveExamConfigId: data.adaptive_exam_config_id,
    status: data.status,
    thetaEstimate: Number(data.theta_estimate ?? 0),
    standardError: Number(data.standard_error ?? 9.99),
    questionCount: data.question_count ?? 0,
    correctCount: data.correct_count ?? 0,
    incorrectCount: data.incorrect_count ?? 0,
    completedAt: data.completed_at,
    stopReason: data.stop_reason,
  };
}

async function resolveTrackSlug(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  examTrackId: string
): Promise<string> {
  const { data } = await supabase
    .from("exam_tracks")
    .select("slug")
    .eq("id", examTrackId)
    .single();
  return (data?.slug as string) ?? "rn";
}
