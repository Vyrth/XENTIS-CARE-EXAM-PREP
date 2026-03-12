/**
 * Analytics sub-page loaders - Progress, Weak Areas, Strength Report, Confidence Calibration.
 * All data is track-scoped and user-specific. No mock data.
 */

import { createClient } from "@/lib/supabase/server";
import type { RawPerformanceRecord } from "@/lib/readiness/mastery-rollups";

/** Confidence raw data: range (e.g. "51-75%"), correct count, total count */
export interface ConfidenceRawPoint {
  range: string;
  correct: number;
  total: number;
}

/**
 * Load confidence calibration data from user_question_attempts and exam_session_questions.
 * Expects response_data to include confidence or confidenceRange (0-25, 26-50, 51-75, 76-100).
 * Returns empty array when no confidence data is captured (feature not yet in question flow).
 */
export async function loadConfidenceData(
  userId: string | null,
  trackId: string | null
): Promise<ConfidenceRawPoint[]> {
  if (!userId || !trackId) return [];

  const supabase = await createClient();

  const ranges = ["0-25", "26-50", "51-75", "76-100"];
  const byRange = new Map<string, { correct: number; total: number }>();
  for (const r of ranges) byRange.set(r, { correct: 0, total: 0 });

  const { data: attempts } = await supabase
    .from("user_question_attempts")
    .select("response_data, is_correct, question_id")
    .eq("user_id", userId);

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  let esqRows: { response_data: unknown; is_correct: boolean | null }[] = [];
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("exam_session_questions")
      .select("response_data, is_correct")
      .in("exam_session_id", sessionIds);
    esqRows = (data ?? []) as { response_data: unknown; is_correct: boolean | null }[];
  }

  function getRange(rd: unknown): string | null {
    if (!rd || typeof rd !== "object") return null;
    const o = rd as Record<string, unknown>;
    const conf = o.confidence ?? o.confidenceRange ?? o.confidence_level;
    if (typeof conf === "number") {
      if (conf <= 25) return "0-25";
      if (conf <= 50) return "26-50";
      if (conf <= 75) return "51-75";
      return "76-100";
    }
    if (typeof conf === "string") {
      const m = conf.match(/(\d+)\s*-\s*(\d+)/);
      if (m) {
        const mid = (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2;
        if (mid <= 25) return "0-25";
        if (mid <= 50) return "26-50";
        if (mid <= 75) return "51-75";
        return "76-100";
      }
    }
    return null;
  }

  const attemptQuestionIds = [...new Set((attempts ?? []).map((a) => a.question_id))];
  let trackQuestionIds = new Set<string>();
  if (attemptQuestionIds.length > 0) {
    const { data: trackQData } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_track_id", trackId)
      .in("id", attemptQuestionIds);
    trackQuestionIds = new Set((trackQData ?? []).map((q) => q.id));
  }

  for (const a of attempts ?? []) {
    if (!trackQuestionIds.has(a.question_id)) continue;
    const range = getRange(a.response_data);
    if (!range) continue;
    const cur = byRange.get(range)!;
    cur.total++;
    if (a.is_correct) cur.correct++;
  }
  for (const e of esqRows) {
    const range = getRange(e.response_data);
    if (!range) continue;
    const cur = byRange.get(range)!;
    cur.total++;
    if (e.is_correct) cur.correct++;
  }

  const result: ConfidenceRawPoint[] = [];
  for (const r of ranges) {
    const cur = byRange.get(r)!;
    if (cur.total > 0) {
      result.push({ range: `${r}%`, correct: cur.correct, total: cur.total });
    }
  }
  return result;
}

/**
 * Count total unique questions answered (from systems - each question has one system).
 * Avoids double-counting when summing systems + domains.
 */
export function countTotalQuestionsAnswered(mastery: {
  systems: RawPerformanceRecord[];
}): number {
  return mastery.systems.reduce((s, r) => s + r.total, 0);
}
