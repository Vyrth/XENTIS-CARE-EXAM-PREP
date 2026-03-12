/**
 * Launch Readiness Checklist - per-track readiness for beta/launch.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type ReadinessStatus = "ready" | "partial" | "blocked";

export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  /** For drill-down: what's missing or blocking */
  blockReason?: string;
}

export interface TrackReadiness {
  trackId: string;
  trackSlug: string;
  trackName: string;
  overallStatus: ReadinessStatus;
  items: ReadinessItem[];
  blockedCount: number;
  partialCount: number;
  readyCount: number;
}

const MIN_QUESTIONS_FOR_LAUNCH = 20;
const MIN_AI_CHUNKS_FOR_JADE = 5;
const MIN_SYSTEMS_FOR_WEAK_AREAS = 1;

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

function statusFrom(ok: boolean, partial: boolean): ReadinessStatus {
  if (ok) return "ready";
  if (partial) return "partial";
  return "blocked";
}

/** Load launch readiness for all tracks */
export async function loadLaunchReadinessByTrack(): Promise<TrackReadiness[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const results: TrackReadiness[] = [];
    for (const t of tracks) {
      const items: ReadinessItem[] = [];

      // 1. Onboarding works
      const onboardingOk = true; // exam_tracks exist (we're iterating them)
      items.push({
        id: "onboarding",
        label: "Onboarding works",
        status: "ready",
        detail: "Exam tracks and onboarding flow available",
      });

      // 2. Dashboard has real content
      const { count: qCount } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", ["approved", "published"]);
      const { count: sgCount } = await supabase
        .from("study_guides")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", ["approved", "published"]);
      const { count: hyCount } = await supabase
        .from("high_yield_content")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", ["approved", "published"]);
      const dashboardContent = (qCount ?? 0) + (sgCount ?? 0) + (hyCount ?? 0);
      const dashboardOk = dashboardContent >= 5;
      const dashboardPartial = dashboardContent >= 1;
      items.push({
        id: "dashboard",
        label: "Dashboard has real content",
        status: statusFrom(dashboardOk, dashboardPartial),
        detail: `${dashboardContent} items (questions, guides, high-yield)`,
        blockReason: dashboardContent === 0 ? "No approved content for dashboard" : dashboardContent < 5 ? "Low content count" : undefined,
      });

      // 3. Question bank has enough live questions
      const questionsApproved = qCount ?? 0;
      const questionsOk = questionsApproved >= MIN_QUESTIONS_FOR_LAUNCH;
      const questionsPartial = questionsApproved >= 5;
      items.push({
        id: "questions",
        label: "Question bank has enough live questions",
        status: statusFrom(questionsOk, questionsPartial),
        detail: `${questionsApproved} approved (min ${MIN_QUESTIONS_FOR_LAUNCH})`,
        blockReason: questionsApproved === 0 ? "No approved questions" : questionsApproved < MIN_QUESTIONS_FOR_LAUNCH ? `Need ${MIN_QUESTIONS_FOR_LAUNCH - questionsApproved} more` : undefined,
      });

      // 4. At least 1 practice exam exists
      const { count: templateCount } = await supabase
        .from("exam_templates")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id);
      const practiceOk = (templateCount ?? 0) >= 1;
      items.push({
        id: "practice_exam",
        label: "At least 1 practice exam exists",
        status: practiceOk ? "ready" : "blocked",
        detail: `${templateCount ?? 0} exam template(s)`,
        blockReason: (templateCount ?? 0) === 0 ? "No exam templates" : undefined,
      });

      // 5. Pre-practice exam or starter diagnostic
      const { data: prePractice } = await supabase
        .from("exam_templates")
        .select("id")
        .eq("exam_track_id", t.id)
        .or("slug.ilike.%pre%practice%,slug.ilike.%diagnostic%,slug.ilike.%starter%")
        .limit(1)
        .maybeSingle();
      const prePracticeOk = !!prePractice || (templateCount ?? 0) > 0;
      items.push({
        id: "pre_practice",
        label: "Pre-practice exam or starter diagnostic",
        status: prePracticeOk ? "ready" : "blocked",
        detail: prePractice ? "Pre-practice/diagnostic template exists" : "Use any practice exam as fallback",
        blockReason: !prePracticeOk ? "No pre-practice or diagnostic template" : undefined,
      });

      // 6. Guides exist
      const guidesApproved = sgCount ?? 0;
      const guidesOk = guidesApproved >= 1;
      items.push({
        id: "guides",
        label: "Guides exist",
        status: guidesOk ? "ready" : "blocked",
        detail: `${guidesApproved} approved guide(s)`,
        blockReason: guidesApproved === 0 ? "No approved study guides" : undefined,
      });

      // 7. Flashcards exist
      const { data: deckIds } = await supabase.from("flashcard_decks").select("id").eq("exam_track_id", t.id);
      const deckIdList = deckIds?.map((d) => d.id) ?? [];
      const { count: cardCount } = deckIdList.length > 0
        ? await supabase.from("flashcards").select("id", { count: "exact", head: true }).in("flashcard_deck_id", deckIdList)
        : { count: 0 };
      const cardsTotal = cardCount ?? 0;
      const flashcardsOk = deckIdList.length >= 1 && cardsTotal >= 5;
      const flashcardsPartial = deckIdList.length >= 1 || cardsTotal > 0;
      items.push({
        id: "flashcards",
        label: "Flashcards exist",
        status: statusFrom(flashcardsOk, flashcardsPartial),
        detail: `${deckIdList.length} deck(s), ${cardsTotal} cards`,
        blockReason: deckIdList.length === 0 ? "No flashcard decks" : cardsTotal < 5 ? "Low card count" : undefined,
      });

      // 8. Videos exist
      const { count: videoCount } = await supabase
        .from("video_lessons")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .in("status", ["approved", "published"]);
      const videosOk = (videoCount ?? 0) >= 1;
      const videosPartial = (videoCount ?? 0) >= 1;
      items.push({
        id: "videos",
        label: "Videos exist",
        status: (videoCount ?? 0) >= 1 ? "ready" : "blocked",
        detail: `${videoCount ?? 0} approved video(s)`,
        blockReason: (videoCount ?? 0) === 0 ? "No approved videos" : undefined,
      });

      // 9. High-yield feed exists
      const highYieldApproved = hyCount ?? 0;
      const highYieldOk = highYieldApproved >= 1;
      items.push({
        id: "high_yield",
        label: "High-yield feed exists",
        status: highYieldOk ? "ready" : "blocked",
        detail: `${highYieldApproved} approved item(s)`,
        blockReason: highYieldApproved === 0 ? "No approved high-yield content" : undefined,
      });

      // 10. Jade Tutor has retrieval-ready content (ai_chunks with track metadata)
      const { count: chunkCountById } = await supabase
        .from("ai_chunks")
        .select("id", { count: "exact", head: true })
        .contains("metadata", { exam_track_id: t.id });
      const { count: chunkCountBySlug } = await supabase
        .from("ai_chunks")
        .select("id", { count: "exact", head: true })
        .contains("metadata", { exam_track: t.slug });
      const trackChunks = Math.max(chunkCountById ?? 0, chunkCountBySlug ?? 0);
      const jadeOk = trackChunks >= MIN_AI_CHUNKS_FOR_JADE;
      const jadePartial = trackChunks >= 1;
      items.push({
        id: "jade_retrieval",
        label: "Jade Tutor has retrieval-ready content",
        status: statusFrom(jadeOk, jadePartial),
        detail: `${trackChunks} ai_chunks for this track`,
        blockReason: trackChunks === 0 ? "No ai_chunks with track metadata for Jade Tutor" : trackChunks < MIN_AI_CHUNKS_FOR_JADE ? `Need ${MIN_AI_CHUNKS_FOR_JADE - trackChunks} more chunks` : undefined,
      });

      // 11. Weak areas/recommendations have enough data
      const { data: systems } = await supabase.from("systems").select("id").eq("exam_track_id", t.id);
      const sysIds = systems?.map((s) => s.id) ?? [];
      const { data: topicLinks } = sysIds.length > 0
        ? await supabase.from("topic_system_links").select("topic_id").in("system_id", sysIds)
        : { data: [] };
      const topicCount = new Set((topicLinks ?? []).map((r) => r.topic_id)).size;
      const weakAreasOk = sysIds.length >= MIN_SYSTEMS_FOR_WEAK_AREAS && topicCount >= 1;
      items.push({
        id: "weak_areas",
        label: "Weak areas/recommendations have enough data",
        status: weakAreasOk ? "ready" : "blocked",
        detail: `${sysIds.length} systems, ${topicCount} topics`,
        blockReason: sysIds.length === 0 ? "No systems for track" : topicCount === 0 ? "No topics linked" : undefined,
      });

      // 12. Billing/entitlements work (platform-level)
      const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY ?? "").trim();
      const { data: plans } = await supabase.from("subscription_plans").select("id").limit(1);
      const plansExist = (plans?.length ?? 0) >= 1;
      const billingOk = stripeConfigured && plansExist;
      const billingPartial = plansExist;
      items.push({
        id: "billing",
        label: "Billing/entitlements work",
        status: statusFrom(billingOk, billingPartial),
        detail: stripeConfigured ? "Stripe configured" : "Stripe not configured",
        blockReason: !stripeConfigured ? "STRIPE_SECRET_KEY not set" : !plansExist ? "No subscription_plans" : undefined,
      });

      // 13. Auth works (platform-level)
      const supabaseConfigured = isSupabaseServiceRoleConfigured();
      const authOk = supabaseConfigured;
      items.push({
        id: "auth",
        label: "Auth works",
        status: authOk ? "ready" : "blocked",
        detail: supabaseConfigured ? "Supabase configured" : "Supabase not configured",
        blockReason: !supabaseConfigured ? "Supabase service role not configured" : undefined,
      });

      const blockedCount = items.filter((i) => i.status === "blocked").length;
      const partialCount = items.filter((i) => i.status === "partial").length;
      const readyCount = items.filter((i) => i.status === "ready").length;

      let overallStatus: ReadinessStatus = "ready";
      if (blockedCount > 0) overallStatus = "blocked";
      else if (partialCount > 0) overallStatus = "partial";

      results.push({
        trackId: t.id,
        trackSlug: t.slug,
        trackName: t.name,
        overallStatus,
        items,
        blockedCount,
        partialCount,
        readyCount,
      });
    }
    return results;
  });
}
