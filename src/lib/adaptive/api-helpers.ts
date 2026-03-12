/**
 * Adaptive exam API helpers - scoring, correct answer lookup, validation.
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { ExamResponse } from "@/types/exam";

/** Map question type to correct answer format from question_options */
export type CorrectAnswer = string | string[] | number | Record<string, string>;

/**
 * Get correct answer for a question from question_options.
 * Returns format suitable for scoring (option_key for single, array for multiple, etc.)
 */
export async function getCorrectAnswerForQuestion(
  questionId: string
): Promise<{ correctAnswer: CorrectAnswer | undefined; itemType: string }> {
  const supabase = createServiceClient();

  const { data: q } = await supabase
    .from("questions")
    .select("question_type_id, question_types(slug)")
    .eq("id", questionId)
    .single();

  const { data: options } = await supabase
    .from("question_options")
    .select("option_key, is_correct, option_metadata")
    .eq("question_id", questionId)
    .order("display_order", { ascending: true });

  const typeSlug = (Array.isArray(q?.question_types) ? q?.question_types[0] : q?.question_types)?.slug ?? "single_best_answer";
  const correctKeys = (options ?? []).filter((o) => o.is_correct).map((o) => o.option_key);

  let correctAnswer: CorrectAnswer | undefined;
  if (typeSlug === "single_best_answer" || typeSlug === "image_based" || typeSlug === "hotspot" || typeSlug === "highlight_text_table") {
    correctAnswer = correctKeys.length === 1 ? correctKeys[0] : correctKeys.length > 1 ? correctKeys : undefined;
  } else if (typeSlug === "multiple_response" || typeSlug === "select_n" || typeSlug === "ordered_response") {
    correctAnswer = correctKeys.length > 0 ? correctKeys : undefined;
  } else if (typeSlug === "dropdown_cloze" || typeSlug === "matrix") {
    const meta = (options ?? []).find((o) => o.is_correct)?.option_metadata as Record<string, string> | undefined;
    correctAnswer = meta ?? undefined;
  } else if (typeSlug === "dosage_calc") {
    const num = (options ?? []).find((o) => o.is_correct);
    const meta = num?.option_metadata as { numericValue?: number } | undefined;
    const val = meta?.numericValue ?? num?.option_key;
    const parsed = typeof val === "number" ? val : parseFloat(String(val ?? ""));
    correctAnswer = !Number.isNaN(parsed) ? parsed : undefined;
  } else {
    correctAnswer = correctKeys.length === 1 ? correctKeys[0] : correctKeys.length > 1 ? correctKeys : undefined;
  }

  return { correctAnswer, itemType: typeSlug };
}

/**
 * Score a single response against correct answer.
 */
export function scoreAdaptiveResponse(
  response: ExamResponse,
  correctAnswer: CorrectAnswer | undefined,
  itemType: string
): boolean {
  if (!correctAnswer) return false;
  if (!response) return false;

  switch (response.type) {
    case "single": {
      const correct = Array.isArray(correctAnswer)
        ? correctAnswer.includes(response.value)
        : String(response.value) === String(correctAnswer);
      return correct;
    }
    case "multiple":
    case "ordered": {
      const expected = Array.isArray(correctAnswer)
        ? correctAnswer.map(String)
        : [String(correctAnswer)];
      const user = response.value.map(String);
      if (response.type === "ordered") {
        return expected.length === user.length && expected.every((e, i) => e === user[i]);
      }
      return (
        expected.length === user.length &&
        expected.every((e) => user.includes(e)) &&
        user.every((u) => expected.includes(u))
      );
    }
    case "numeric": {
      const expected = typeof correctAnswer === "number" ? correctAnswer : parseFloat(String(correctAnswer));
      return !Number.isNaN(expected) && Math.abs(response.value - expected) < 0.01;
    }
    case "hotspot":
    case "highlight": {
      const expected = Array.isArray(correctAnswer)
        ? correctAnswer.map(String).sort()
        : [String(correctAnswer)].sort();
      const user = response.value.map(String).sort();
      return expected.length === user.length && expected.every((e, i) => e === user[i]);
    }
    case "dropdown":
    case "matrix": {
      const expected = correctAnswer && typeof correctAnswer === "object" && !Array.isArray(correctAnswer)
        ? (correctAnswer as Record<string, string>)
        : {};
      const user = response.value as Record<string, string>;
      const keys = new Set([...Object.keys(expected), ...Object.keys(user)]);
      for (const k of keys) {
        if (String(expected[k] ?? "") !== String(user[k] ?? "")) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * Verify user has access to exam track (primary or user_exam_tracks).
 */
export async function userHasTrackAccess(
  userId: string,
  examTrackId: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_exam_track_id")
    .eq("id", userId)
    .single();

  if (profile?.primary_exam_track_id === examTrackId) return true;

  const { data: userTrack } = await supabase
    .from("user_exam_tracks")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_track_id", examTrackId)
    .single();

  return !!userTrack;
}

/**
 * Log adaptive exam event for audit (dev only).
 */
export function logAdaptiveEvent(
  event: string,
  sessionId: string,
  userId: string,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[adaptive]", event, { sessionId, userId, ...metadata });
  }
}
