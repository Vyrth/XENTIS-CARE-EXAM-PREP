/**
 * Admin loaders - fetch content for CMS with track filter
 * Uses service client to bypass RLS and access all statuses (draft, review, approved).
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface ExamTrackRow {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
}

export interface AdminQuestionRow {
  id: string;
  stem: string;
  status: string;
  examTrackId: string;
  examTrackSlug: string | null;
  systemId: string | null;
  systemName: string | null;
  createdAt: string;
}

export interface AdminQuestionForEdit {
  id: string;
  stem: string;
  leadIn?: string;
  instructions?: string;
  rationale?: string;
  examTrackId: string;
  questionTypeId: string;
  questionTypeSlug: string;
  systemId: string | null;
  domainId: string | null;
  topicId: string | null;
  subtopicId: string | null;
  difficultyTier: number | null;
  imageUrl?: string;
  options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
}

export interface AdminStudyGuideRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  examTrackId: string;
  examTrackSlug: string | null;
  systemId: string | null;
  systemName: string | null;
  sectionCount: number;
  createdAt: string;
}

export interface AdminVideoRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  examTrackId: string;
  examTrackSlug: string | null;
  systemId: string | null;
  systemName: string | null;
  createdAt: string;
}

export interface AdminFlashcardDeckRow {
  id: string;
  name: string;
  examTrackId: string;
  examTrackSlug: string | null;
  systemId: string | null;
  systemName: string | null;
  cardCount: number;
  source: string;
  createdAt: string;
}

export interface AdminBundleRow {
  id: string;
  name: string;
  examTrackId: string;
  examTrackSlug: string | null;
  systemId: string | null;
  systemName: string | null;
  createdAt: string;
}

export interface AdminPublishQueueItem {
  type: "question" | "study_guide" | "video" | "flashcard_deck" | "high_yield_content";
  id: string;
  title: string;
  status: string;
  examTrackId: string;
  examTrackSlug: string | null;
}

/** Load exam tracks for filter dropdown */
export async function loadExamTracks(): Promise<ExamTrackRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("exam_tracks")
      .select("id, slug, name, display_order")
      .order("display_order", { ascending: true });
    return (data ?? []).map((t: { id: string; slug: string; name: string; display_order: number }) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      displayOrder: t.display_order,
    }));
  } catch {
    return [];
  }
}

/** Load single question for edit (admin) */
export async function loadQuestionForEdit(questionId: string): Promise<AdminQuestionForEdit | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data: q, error } = await supabase
      .from("questions")
      .select("id, stem, stem_metadata, exam_track_id, question_type_id, system_id, domain_id, topic_id, subtopic_id")
      .eq("id", questionId)
      .single();
    if (error || !q) return null;

    const qtRes = await supabase.from("question_types").select("slug").eq("id", q.question_type_id).single();
    const typeSlug = qtRes.data?.slug ?? "single_best_answer";

    const { data: opts } = await supabase
      .from("question_options")
      .select("option_key, option_text, is_correct, option_metadata")
      .eq("question_id", questionId)
      .order("display_order", { ascending: true });

    const stemMeta = (q.stem_metadata as Record<string, unknown>) ?? {};
    const { data: profile } = await supabase
      .from("question_adaptive_profiles")
      .select("difficulty_tier")
      .eq("question_id", questionId)
      .single();
    const { data: exhibits } = await supabase
      .from("question_exhibits")
      .select("content_url")
      .eq("question_id", questionId)
      .eq("exhibit_type", "image")
      .limit(1);
    const firstImg = exhibits?.[0];
    const imageUrl = firstImg?.content_url ?? (stemMeta.imageUrl as string) ?? undefined;

    return {
      id: q.id,
      stem: q.stem ?? "",
      leadIn: stemMeta.leadIn as string | undefined,
      instructions: stemMeta.instructions as string | undefined,
      rationale: stemMeta.rationale as string | undefined,
      examTrackId: q.exam_track_id ?? "",
      questionTypeId: q.question_type_id ?? "",
      questionTypeSlug: typeSlug,
      systemId: q.system_id ?? null,
      domainId: q.domain_id ?? null,
      topicId: q.topic_id ?? null,
      subtopicId: q.subtopic_id ?? null,
      difficultyTier: profile?.difficulty_tier ?? null,
      imageUrl,
      options: (opts ?? []).map((o) => ({
        key: o.option_key,
        text: o.option_text ?? "",
        isCorrect: o.is_correct ?? false,
        distractorRationale: (o.option_metadata as Record<string, string>)?.rationale,
      })),
    };
  } catch {
    return null;
  }
}

/** Load questions for admin with optional track filter */
export async function loadAdminQuestions(trackId?: string | null): Promise<AdminQuestionRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    let query = supabase
      .from("questions")
      .select("id, stem, status, exam_track_id, exam_tracks(slug), system_id, systems(name), created_at")
      .order("created_at", { ascending: false });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    return (data ?? []).map((q: Record<string, unknown>) => {
      const track = Array.isArray(q.exam_tracks) ? q.exam_tracks[0] : q.exam_tracks;
      const sys = Array.isArray(q.systems) ? q.systems[0] : q.systems;
      return {
        id: String(q.id ?? ""),
        stem: (q.stem as string)?.slice(0, 120) ?? "",
        status: String(q.status ?? "draft"),
        examTrackId: String(q.exam_track_id ?? ""),
        examTrackSlug: (track as { slug?: string })?.slug ?? null,
        systemId: q.system_id ? String(q.system_id) : null,
        systemName: (sys as { name?: string })?.name ?? null,
        createdAt: String(q.created_at ?? ""),
      };
    }) as AdminQuestionRow[];
  } catch {
    return [];
  }
}

/** Load study guides for admin with optional track filter */
export async function loadAdminStudyGuides(trackId?: string | null): Promise<AdminStudyGuideRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    let query = supabase
      .from("study_guides")
      .select("id, slug, title, status, exam_track_id, exam_tracks(slug), system_id, systems(name), created_at")
      .order("created_at", { ascending: false });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    const rows: AdminStudyGuideRow[] = [];
    for (const g of data ?? []) {
      const { count } = await supabase
        .from("study_material_sections")
        .select("id", { count: "exact", head: true })
        .eq("study_guide_id", g.id)
        .is("parent_section_id", null);
      const track = Array.isArray(g.exam_tracks) ? g.exam_tracks[0] : g.exam_tracks;
      const sys = Array.isArray(g.systems) ? g.systems[0] : g.systems;
      rows.push({
        id: String(g.id ?? ""),
        slug: String(g.slug ?? ""),
        title: String(g.title ?? ""),
        status: String(g.status ?? "draft"),
        examTrackId: String(g.exam_track_id ?? ""),
        examTrackSlug: (track as { slug?: string })?.slug ?? null,
        systemId: g.system_id ? String(g.system_id) : null,
        systemName: (sys as { name?: string })?.name ?? null,
        sectionCount: count ?? 0,
        createdAt: String(g.created_at ?? ""),
      });
    }
    return rows;
  } catch {
    return [];
  }
}

/** Load videos for admin with optional track filter */
export async function loadAdminVideos(trackId?: string | null): Promise<AdminVideoRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    let query = supabase
      .from("video_lessons")
      .select("id, slug, title, status, exam_track_id, exam_tracks(slug), system_id, systems(name), created_at")
      .order("created_at", { ascending: false });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    return (data ?? []).map((v: Record<string, unknown>) => {
      const track = Array.isArray(v.exam_tracks) ? v.exam_tracks[0] : v.exam_tracks;
      const sys = Array.isArray(v.systems) ? v.systems[0] : v.systems;
      return {
        id: String(v.id ?? ""),
        slug: String(v.slug ?? ""),
        title: String(v.title ?? ""),
        status: String(v.status ?? "draft"),
        examTrackId: String(v.exam_track_id ?? ""),
        examTrackSlug: (track as { slug?: string })?.slug ?? null,
        systemId: v.system_id ? String(v.system_id) : null,
        systemName: (sys as { name?: string })?.name ?? null,
        createdAt: String(v.created_at ?? ""),
      };
    }) as AdminVideoRow[];
  } catch {
    return [];
  }
}

/** Load flashcard decks for admin with optional track filter */
export async function loadAdminFlashcardDecks(trackId?: string | null): Promise<AdminFlashcardDeckRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    let query = supabase
      .from("flashcard_decks")
      .select("id, name, exam_track_id, exam_tracks(slug), system_id, systems(name), source, created_at")
      .order("name", { ascending: true });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    const rows: AdminFlashcardDeckRow[] = [];
    for (const d of data ?? []) {
      const { count } = await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("flashcard_deck_id", d.id);
      const track = Array.isArray(d.exam_tracks) ? d.exam_tracks[0] : d.exam_tracks;
      const sys = Array.isArray(d.systems) ? d.systems[0] : d.systems;
      rows.push({
        id: String(d.id ?? ""),
        name: String(d.name ?? ""),
        examTrackId: String(d.exam_track_id ?? ""),
        examTrackSlug: (track as { slug?: string })?.slug ?? null,
        systemId: d.system_id ? String(d.system_id) : null,
        systemName: (sys as { name?: string })?.name ?? null,
        cardCount: count ?? 0,
        source: String(d.source ?? "platform"),
        createdAt: String(d.created_at ?? ""),
      });
    }
    return rows;
  } catch {
    return [];
  }
}

/** Load system study bundles for admin with optional track filter */
export async function loadAdminBundles(trackId?: string | null): Promise<AdminBundleRow[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    let query = supabase
      .from("system_study_bundles")
      .select("id, name, exam_track_id, exam_tracks(slug), system_id, systems(name), created_at")
      .order("display_order", { ascending: true });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    return (data ?? []).map((b: Record<string, unknown>) => {
      const track = Array.isArray(b.exam_tracks) ? b.exam_tracks[0] : b.exam_tracks;
      const sys = Array.isArray(b.systems) ? b.systems[0] : b.systems;
      return {
        id: String(b.id ?? ""),
        name: String(b.name ?? ""),
        examTrackId: String(b.exam_track_id ?? ""),
        examTrackSlug: (track as { slug?: string })?.slug ?? null,
        systemId: b.system_id ? String(b.system_id) : null,
        systemName: (sys as { name?: string })?.name ?? null,
        createdAt: String(b.created_at ?? ""),
      };
    }) as AdminBundleRow[];
  } catch {
    return [];
  }
}

/** Load publish queue (approved items ready to publish) with optional track filter */
export async function loadAdminPublishQueue(trackId?: string | null): Promise<AdminPublishQueueItem[]> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [];
    const supabase = createServiceClient();
    const items: AdminPublishQueueItem[] = [];

    const [qRes, sgRes, vRes, fdRes, hyRes] = await Promise.all([
      (() => {
        let q = supabase.from("questions").select("id, stem, status, exam_track_id, exam_tracks(slug)").eq("status", "approved");
        if (trackId) q = q.eq("exam_track_id", trackId);
        return q;
      })(),
      (() => {
        let q = supabase.from("study_guides").select("id, title, status, exam_track_id, exam_tracks(slug)").eq("status", "approved");
        if (trackId) q = q.eq("exam_track_id", trackId);
        return q;
      })(),
      (() => {
        let q = supabase.from("video_lessons").select("id, title, status, exam_track_id, exam_tracks(slug)").eq("status", "approved");
        if (trackId) q = q.eq("exam_track_id", trackId);
        return q;
      })(),
      (() => {
        let q = supabase.from("flashcard_decks").select("id, name, status, exam_track_id, exam_tracks(slug)").eq("status", "approved");
        if (trackId) q = q.eq("exam_track_id", trackId);
        return q;
      })(),
      (() => {
        let q = supabase.from("high_yield_content").select("id, title, status, exam_track_id, exam_tracks(slug)").eq("status", "approved");
        if (trackId) q = q.eq("exam_track_id", trackId);
        return q;
      })(),
    ]);

    const pushItems = (
      type: "question" | "study_guide" | "video" | "flashcard_deck" | "high_yield_content",
      data: unknown[],
      titleKey: string
    ) => {
      for (const r of data as Record<string, unknown>[]) {
        const track = Array.isArray(r.exam_tracks) ? r.exam_tracks[0] : r.exam_tracks;
        items.push({
          type,
          id: String(r.id ?? ""),
          title: (r[titleKey] as string)?.slice(0, 80) ?? "",
          status: String(r.status ?? "approved"),
          examTrackId: String(r.exam_track_id ?? ""),
          examTrackSlug: (track as { slug?: string })?.slug ?? null,
        });
      }
    };

    pushItems("question", qRes.data ?? [], "stem");
    pushItems("study_guide", sgRes.data ?? [], "title");
    pushItems("video", vRes.data ?? [], "title");
    pushItems("flashcard_deck", fdRes.data ?? [], "name");
    pushItems("high_yield_content", hyRes.data ?? [], "title");

    return items;
  } catch {
    return [];
  }
}
