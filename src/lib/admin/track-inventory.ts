/**
 * Content inventory and missing content reports by track
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS } from "@/config/exam";

export interface StatusBreakdown {
  draft: number;
  review: number;
  approved: number;
  archived: number;
}

export interface TrackInventoryRow {
  trackId: string;
  trackSlug: string;
  trackName: string;
  systems: number;
  topics: number;
  questions: number;
  questionsApproved: number;
  questionsByStatus: StatusBreakdown;
  studyGuides: number;
  studyGuidesApproved: number;
  studyGuidesByStatus: StatusBreakdown;
  videos: number;
  videosApproved: number;
  videosByStatus: StatusBreakdown;
  flashcardDecks: number;
  flashcardCards: number;
  examTemplates: number;
  systemExams: number;
  topicSummaries: number;
  bundles: number;
  prePracticeQuestionPool: number;
  hasPrePracticeTemplate: boolean;
  highYieldTopics: number;
}

export interface MissingContentByTrack {
  trackId: string;
  trackSlug: string;
  trackName: string;
  systemsWithoutQuestions: { systemId: string; systemName: string }[];
  systemsWithoutGuides: { systemId: string; systemName: string }[];
  systemsWithoutVideos: { systemId: string; systemName: string }[];
  systemsWithoutDecks: { systemId: string; systemName: string }[];
  systemsWithoutBundles: { systemId: string; systemName: string }[];
  hasPrePracticeTemplate: boolean;
  systemExamsBelowMin: { systemId: string; systemName: string; count: number; minRequired: number }[];
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load content inventory by track */
export async function loadContentInventoryByTrack(): Promise<TrackInventoryRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const rows: TrackInventoryRow[] = [];
    const statuses = ["draft", "review", "approved", "archived"] as const;

    for (const t of tracks) {
      const { data: systemIds } = await supabase.from("systems").select("id").eq("exam_track_id", t.id);
      const sysIds = systemIds?.map((s) => s.id) ?? [];

      const [
        qAll,
        qApproved,
        qDraft,
        qReview,
        qArchived,
        sgAll,
        sgApproved,
        sgDraft,
        sgReview,
        sgArchived,
        vAll,
        vApproved,
        vDraft,
        vReview,
        vArchived,
        decks,
        templates,
        exams,
        summaries,
        bundles,
      ] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "approved"),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "draft"),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "review"),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "archived"),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "approved"),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "draft"),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "review"),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "archived"),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "approved"),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "draft"),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "review"),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("status", "archived"),
        supabase.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("exam_templates").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("system_exams").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
        supabase.from("topic_summaries").select("id", { count: "exact", head: true }).or(`exam_track_id.eq.${t.id},exam_track_id.is.null`),
        supabase.from("system_study_bundles").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id),
      ]);

      const deckIds = (await supabase.from("flashcard_decks").select("id").eq("exam_track_id", t.id)).data?.map((d) => d.id) ?? [];
      const cardsRes = deckIds.length > 0
        ? await supabase.from("flashcards").select("id", { count: "exact", head: true }).in("flashcard_deck_id", deckIds)
        : { count: 0 };

      const { data: prePractice } = await supabase
        .from("exam_templates")
        .select("id")
        .eq("exam_track_id", t.id)
        .ilike("slug", "%pre%practice%")
        .limit(1)
        .maybeSingle();

      let prePracticePool = 0;
      if (prePractice?.id) {
        const poolRes = await supabase
          .from("exam_template_question_pool")
          .select("id", { count: "exact", head: true })
          .eq("exam_template_id", prePractice.id);
        prePracticePool = poolRes.count ?? 0;
      }
      if (prePracticePool === 0 && (qApproved.count ?? 0) > 0) {
        prePracticePool = qApproved.count ?? 0;
      }

      const topicsRes = sysIds.length > 0
        ? await supabase.from("topic_system_links").select("topic_id").in("system_id", sysIds)
        : { data: [] };
      const uniqueTopics = new Set((topicsRes.data ?? []).map((r) => r.topic_id));

      const { data: blueprintSystems } = await supabase
        .from("exam_blueprints")
        .select("system_id")
        .eq("exam_track_id", t.id)
        .gt("weight_pct", 0)
        .not("system_id", "is", null);
      const highYieldSystemIds = new Set((blueprintSystems ?? []).map((b) => b.system_id).filter(Boolean));
      const highYieldTopicsRes = highYieldSystemIds.size > 0
        ? await supabase.from("topic_system_links").select("topic_id").in("system_id", [...highYieldSystemIds])
        : { data: [] };
      const highYieldTopics = new Set((highYieldTopicsRes.data ?? []).map((r) => r.topic_id)).size;

      rows.push({
        trackId: t.id,
        trackSlug: t.slug,
        trackName: t.name,
        systems: sysIds.length,
        topics: uniqueTopics.size,
        questions: qAll.count ?? 0,
        questionsApproved: qApproved.count ?? 0,
        questionsByStatus: {
          draft: qDraft.count ?? 0,
          review: qReview.count ?? 0,
          approved: qApproved.count ?? 0,
          archived: qArchived.count ?? 0,
        },
        studyGuides: sgAll.count ?? 0,
        studyGuidesApproved: sgApproved.count ?? 0,
        studyGuidesByStatus: {
          draft: sgDraft.count ?? 0,
          review: sgReview.count ?? 0,
          approved: sgApproved.count ?? 0,
          archived: sgArchived.count ?? 0,
        },
        videos: vAll.count ?? 0,
        videosApproved: vApproved.count ?? 0,
        videosByStatus: {
          draft: vDraft.count ?? 0,
          review: vReview.count ?? 0,
          approved: vApproved.count ?? 0,
          archived: vArchived.count ?? 0,
        },
        flashcardDecks: decks.count ?? 0,
        flashcardCards: cardsRes.count ?? 0,
        examTemplates: templates.count ?? 0,
        systemExams: exams.count ?? 0,
        topicSummaries: summaries.count ?? 0,
        bundles: bundles.count ?? 0,
        prePracticeQuestionPool: prePracticePool,
        hasPrePracticeTemplate: !!prePractice,
        highYieldTopics,
      });
    }
    return rows;
  });
}

/** Load missing content report by track for production planning */
export async function loadMissingContentByTrack(): Promise<MissingContentByTrack[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (!tracks?.length) return [];

    const results: MissingContentByTrack[] = [];
    for (const t of tracks) {
      const { data: systems } = await supabase
        .from("systems")
        .select("id, name")
        .eq("exam_track_id", t.id);

      const systemsWithoutQuestions: { systemId: string; systemName: string }[] = [];
      const systemsWithoutGuides: { systemId: string; systemName: string }[] = [];
      const systemsWithoutVideos: { systemId: string; systemName: string }[] = [];
      const systemsWithoutDecks: { systemId: string; systemName: string }[] = [];
      const systemsWithoutBundles: { systemId: string; systemName: string }[] = [];
      const systemExamsBelowMin: { systemId: string; systemName: string; count: number; minRequired: number }[] = [];

      for (const sys of systems ?? []) {
        const [qCount, sgCount, vCount, dCount, bCount, examRows] = await Promise.all([
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id).eq("status", "approved"),
          supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id).eq("status", "approved"),
          supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id).eq("status", "approved"),
          supabase.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id),
          supabase.from("system_study_bundles").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id),
          supabase.from("system_exams").select("id, question_count").eq("exam_track_id", t.id).eq("system_id", sys.id),
        ]);

        if ((qCount.count ?? 0) === 0) systemsWithoutQuestions.push({ systemId: sys.id, systemName: sys.name });
        if ((sgCount.count ?? 0) === 0) systemsWithoutGuides.push({ systemId: sys.id, systemName: sys.name });
        if ((vCount.count ?? 0) === 0) systemsWithoutVideos.push({ systemId: sys.id, systemName: sys.name });
        if ((dCount.count ?? 0) === 0) systemsWithoutDecks.push({ systemId: sys.id, systemName: sys.name });
        if ((bCount.count ?? 0) === 0) systemsWithoutBundles.push({ systemId: sys.id, systemName: sys.name });

        const approvedQ = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", t.id).eq("system_id", sys.id).eq("status", "approved");
        const qCountApproved = approvedQ.count ?? 0;
        if (qCountApproved > 0 && qCountApproved < SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS) {
          systemExamsBelowMin.push({
            systemId: sys.id,
            systemName: sys.name,
            count: qCountApproved,
            minRequired: SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS,
          });
        }
      }

      const { data: prePractice } = await supabase
        .from("exam_templates")
        .select("id")
        .eq("exam_track_id", t.id)
        .ilike("slug", "%pre%practice%")
        .limit(1)
        .maybeSingle();

      results.push({
        trackId: t.id,
        trackSlug: t.slug,
        trackName: t.name,
        systemsWithoutQuestions,
        systemsWithoutGuides,
        systemsWithoutVideos,
        systemsWithoutDecks,
        systemsWithoutBundles,
        hasPrePracticeTemplate: !!prePractice,
        systemExamsBelowMin,
      });
    }
    return results;
  });
}
