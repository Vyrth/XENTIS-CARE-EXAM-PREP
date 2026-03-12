/**
 * Load learner analytics for Jade Tutor context.
 * Enables weak-area-aware, readiness-aware tutoring responses.
 * Uses: user's selected track, weak areas, missed questions, adaptive exam results,
 * recent study guide usage, flashcard performance.
 */

import { createClient } from "@/lib/supabase/server";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadMasteryData, loadReadinessScore } from "@/lib/dashboard/loaders";
import {
  rollupBySystem,
  rollupByDomain,
  rollupBySkill,
  rollupByItemType,
  getWeakRollups,
} from "@/lib/readiness";
import { getReadinessBand } from "@/lib/readiness/readiness-score";
import type { AnalyticsPayload } from "@/lib/readiness/adaptive-context";

/** Load recent missed question topic/system names for same-track context */
async function loadRecentMistakes(
  userId: string,
  trackId: string,
  limit = 10
): Promise<string[]> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // From exam_session_questions
  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .gte("started_at", sevenDaysAgo);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const names: string[] = [];

  if (sessionIds.length > 0) {
    const { data: esq } = await supabase
      .from("exam_session_questions")
      .select("question_id")
      .in("exam_session_id", sessionIds)
      .eq("is_correct", false);
    const qIds = [...new Set((esq ?? []).map((e) => e.question_id))];
    if (qIds.length > 0) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, topics(name), systems(name)")
        .in("id", qIds.slice(0, 20));
      for (const q of qs ?? []) {
        const topic = (q as { topics?: { name: string } | { name: string }[] }).topics;
        const sys = (q as { systems?: { name: string } | { name: string }[] }).systems;
        const t = Array.isArray(topic) ? topic[0] : topic;
        const s = Array.isArray(sys) ? sys[0] : sys;
        if (t?.name) names.push(t.name);
        if (s?.name && !names.includes(s.name)) names.push(s.name);
      }
    }
  }

  // From user_question_attempts (standalone)
  const { data: attempts } = await supabase
    .from("user_question_attempts")
    .select("question_id")
    .eq("user_id", userId)
    .eq("is_correct", false)
    .gte("created_at", sevenDaysAgo);
  const attemptQIds = [...new Set((attempts ?? []).map((a) => a.question_id))];
  if (attemptQIds.length > 0) {
    const { data: qs } = await supabase
      .from("questions")
      .select("id, topics(name), systems(name)")
      .in("id", attemptQIds.slice(0, 15))
      .eq("exam_track_id", trackId);
    for (const q of qs ?? []) {
      const topic = (q as { topics?: { name: string } | { name: string }[] }).topics;
      const sys = (q as { systems?: { name: string } | { name: string }[] }).systems;
      const t = Array.isArray(topic) ? topic[0] : topic;
      const s = Array.isArray(sys) ? sys[0] : sys;
      if (t?.name && !names.includes(t.name)) names.push(t.name);
      if (s?.name && !names.includes(s.name)) names.push(s.name);
    }
  }

  return [...new Set(names)].slice(0, limit);
}

/** Load study guide completion % for track */
async function loadStudyGuideCompletion(
  userId: string,
  trackId: string
): Promise<number | undefined> {
  const supabase = await createClient();
  const { data: guides } = await supabase
    .from("study_guides")
    .select("id")
    .eq("exam_track_id", trackId)
    .eq("status", "published");
  const guideIds = (guides ?? []).map((g) => g.id);
  if (guideIds.length === 0) return undefined;

  const { data: sectionRows } = await supabase
    .from("study_material_sections")
    .select("id")
    .in("study_guide_id", guideIds);
  const sectionIds = (sectionRows ?? []).map((s) => s.id);
  if (sectionIds.length === 0) return undefined;

  const { count } = await supabase
    .from("study_material_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .in("study_material_section_id", sectionIds);
  const completed = count ?? 0;
  return Math.round((completed / sectionIds.length) * 100);
}

/** Load flashcard performance summary for track */
async function loadFlashcardPerformance(
  userId: string,
  trackId: string
): Promise<{ correct: number; total: number } | undefined> {
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("exam_track_id", trackId);
  const deckIds = (decks ?? []).map((d) => d.id);
  if (deckIds.length === 0) return undefined;

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id")
    .in("flashcard_deck_id", deckIds);
  const cardIds = (cards ?? []).map((c) => c.id);
  if (cardIds.length === 0) return undefined;

  const { data: progress } = await supabase
    .from("user_flashcard_progress")
    .select("correct_count, incorrect_count")
    .eq("user_id", userId)
    .in("flashcard_id", cardIds);
  const correct = (progress ?? []).reduce((s, p) => s + (p.correct_count ?? 0), 0);
  const incorrect = (progress ?? []).reduce((s, p) => s + (p.incorrect_count ?? 0), 0);
  const total = correct + incorrect;
  if (total === 0) return undefined;
  return { correct, total };
}

/**
 * Load analytics for Jade Tutor - readiness, weak areas, missed questions,
 * study guide usage, flashcard performance. All same-track only.
 * Call from server actions before runAIAction to personalize responses.
 */
export async function loadAnalyticsForJade(
  userId: string | null
): Promise<AnalyticsPayload | null> {
  if (!userId) return null;

  const primary = await getPrimaryTrack(userId);
  if (!primary) return null;

  const [mastery, recentMistakes, studyGuideCompletion, flashcardPerf, confidenceData] = await Promise.all([
    loadMasteryData(userId, primary.trackId),
    loadRecentMistakes(userId, primary.trackId),
    loadStudyGuideCompletion(userId, primary.trackId),
    loadFlashcardPerformance(userId, primary.trackId),
    import("@/lib/analytics/loaders").then((m) => m.loadConfidenceData(userId, primary.trackId)),
  ]);

  const readinessResult = await loadReadinessScore(userId, primary.trackId, mastery);
  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const skillRollups = rollupBySkill(mastery.skills);
  const itemTypeRollups = rollupByItemType(mastery.itemTypes);
  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);
  const weakSkills = getWeakRollups(skillRollups);
  const weakItemTypes = getWeakRollups(itemTypeRollups);

  const score = readinessResult?.score ?? 0;
  const band = getReadinessBand(score);

  let confidenceCalibration: number | undefined;
  let overconfidentRanges: string[] | undefined;
  if (confidenceData && confidenceData.length > 0) {
    const { buildConfidenceBuckets, computeCalibrationScore } = await import("@/lib/readiness/confidence-calibration");
    const buckets = buildConfidenceBuckets(confidenceData.map((r) => ({ range: r.range, correct: r.correct, total: r.total })));
    confidenceCalibration = computeCalibrationScore(buckets);
    overconfidentRanges = buckets
      .filter((b) => b.total > 0 && b.actualPercent < b.expectedMidpoint - 15)
      .map((b) => b.range);
  }

  const payload: AnalyticsPayload = {
    readinessScore: score,
    readinessBand: band,
    weakSystems: weakSystems.map((s) => ({ name: s.name, percent: s.percent })),
    weakDomains: weakDomains.map((d) => ({ name: d.name, percent: d.percent })),
    weakSkills: weakSkills.map((s) => ({ name: s.name, percent: s.percent })),
    weakItemTypes: weakItemTypes.map((t) => ({ name: t.name, percent: t.percent })),
    recentMistakes: recentMistakes.length > 0 ? recentMistakes : undefined,
    studyGuideCompletion,
    confidenceCalibration,
    overconfidentRanges,
  };

  if (flashcardPerf && flashcardPerf.total > 0) {
    payload.lastStudyMaterialsCompleted = [
      `Flashcards: ${flashcardPerf.correct}/${flashcardPerf.total} correct (${Math.round((flashcardPerf.correct / flashcardPerf.total) * 100)}%)`,
    ];
  }

  return payload;
}
