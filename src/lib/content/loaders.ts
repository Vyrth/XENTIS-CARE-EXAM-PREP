/**
 * Content loaders - study guides, flashcards, videos
 * All queries are track-filtered at the database level.
 * Only approved/published content is visible to learners.
 */

import { createClient } from "@/lib/supabase/server";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";

export interface StudyGuideListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  systemId: string | null;
  systemSlug: string | null;
  systemName: string | null;
  sectionCount: number;
}

export interface StudyGuideSection {
  id: string;
  slug: string;
  title: string;
  content: string;
  displayOrder: number;
}

export interface StudyGuideDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  systemId: string | null;
  systemSlug: string | null;
  systemName: string | null;
  sections: StudyGuideSection[];
}

export interface FlashcardDeckListItem {
  id: string;
  name: string;
  description: string | null;
  systemId: string | null;
  systemSlug: string | null;
  systemName: string | null;
  cardCount: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  displayOrder: number;
}

export interface VideoListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  systemId: string | null;
  systemSlug: string | null;
  systemName: string | null;
}

export interface VideoDetail extends VideoListItem {
  transcript?: string;
}

/**
 * Load published study guides for a track.
 * Optional filters: systemId, systemSlug, topicSlug (via topic_system_links).
 */
export async function loadStudyGuides(
  trackId: string | null,
  filters?: { systemId?: string; systemSlug?: string; topicSlug?: string }
): Promise<StudyGuideListItem[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  let query = supabase
    .from("study_guides")
    .select("id, slug, title, description, system_id, systems(id, slug, name)")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .order("display_order", { ascending: true });

  if (filters?.systemId) query = query.eq("system_id", filters.systemId);
  if (filters?.systemSlug) {
    const { data: sys } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId)
      .eq("slug", filters.systemSlug)
      .single();
    if (sys) query = query.eq("system_id", sys.id);
  }

  const { data } = await query;

  const guides: StudyGuideListItem[] = [];
  for (const g of data ?? []) {
    const sys = Array.isArray(g.systems) ? g.systems[0] : g.systems;
    const { count } = await supabase
      .from("study_material_sections")
      .select("id", { count: "exact", head: true })
      .eq("study_guide_id", g.id)
      .is("parent_section_id", null);

    guides.push({
      id: g.id,
      slug: g.slug,
      title: g.title,
      description: g.description ?? null,
      systemId: g.system_id ?? null,
      systemSlug: (sys as { slug?: string })?.slug ?? null,
      systemName: (sys as { name?: string })?.name ?? null,
      sectionCount: count ?? 0,
    });
  }

  return guides;
}

/**
 * Load a single study guide by ID, track-scoped.
 */
export async function loadStudyGuideById(
  trackId: string | null,
  guideId: string
): Promise<StudyGuideDetail | null> {
  if (!trackId) return null;

  const supabase = await createClient();
  const { data: g, error } = await supabase
    .from("study_guides")
    .select("id, slug, title, description, system_id, systems(id, slug, name)")
    .eq("id", guideId)
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .single();

  if (error && process.env.NODE_ENV !== "test") {
    console.warn("[content] loadStudyGuideById failed", { guideId, trackId, code: error.code, message: error.message });
  }
  if (error || !g) return null;

  const { data: sections } = await supabase
    .from("study_material_sections")
    .select("id, slug, title, content_markdown, content_html, display_order")
    .eq("study_guide_id", guideId)
    .is("parent_section_id", null)
    .order("display_order", { ascending: true });

  const sys = Array.isArray(g.systems) ? g.systems[0] : g.systems;

  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    description: g.description ?? null,
    systemId: g.system_id ?? null,
    systemSlug: (sys as { slug?: string })?.slug ?? null,
    systemName: (sys as { name?: string })?.name ?? null,
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      content: (s.content_markdown ?? s.content_html ?? "").trim(),
      displayOrder: s.display_order,
    })),
  };
}

/**
 * Load published flashcard decks for a track.
 * Learners see only approved/published decks. Includes platform and public user decks.
 */
export async function loadFlashcardDecks(
  trackId: string | null,
  userId?: string | null
): Promise<FlashcardDeckListItem[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  const orParts = ["source.eq.platform", "is_public.eq.true"];
  if (userId) orParts.push(`user_id.eq.${userId}`);
  const { data } = await supabase
    .from("flashcard_decks")
    .select("id, name, description, system_id, systems(id, slug, name)")
    .eq("exam_track_id", trackId)
    .or(orParts.join(","))
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .order("name", { ascending: true });

  const decks: FlashcardDeckListItem[] = [];
  for (const d of data ?? []) {
    const { count } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("flashcard_deck_id", d.id);

    const sys = Array.isArray(d.systems) ? d.systems[0] : d.systems;
    decks.push({
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      systemId: d.system_id ?? null,
      systemSlug: (sys as { slug?: string })?.slug ?? null,
      systemName: (sys as { name?: string })?.name ?? null,
      cardCount: count ?? 0,
    });
  }

  return decks.filter((d) => d.cardCount > 0);
}

/**
 * Load flashcards for a deck. Track-scoped via deck.
 */
export async function loadFlashcardsByDeck(
  trackId: string | null,
  deckId: string
): Promise<Flashcard[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("id", deckId)
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .single();

  if (!deck) return [];

  const { data } = await supabase
    .from("flashcards")
    .select("id, front_text, back_text, display_order")
    .eq("flashcard_deck_id", deckId)
    .order("display_order", { ascending: true });

  return (data ?? []).map((c) => ({
    id: c.id,
    front: c.front_text,
    back: c.back_text,
    displayOrder: c.display_order,
  }));
}

/**
 * Load user flashcard progress for a deck (correct/incorrect counts).
 */
export async function loadFlashcardProgress(
  userId: string | null,
  deckId: string
): Promise<Record<string, { correct: number; incorrect: number }>> {
  if (!userId) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_flashcard_progress")
    .select("flashcard_id, correct_count, incorrect_count")
    .eq("user_id", userId);

  const map: Record<string, { correct: number; incorrect: number }> = {};
  for (const p of data ?? []) {
    map[p.flashcard_id] = {
      correct: p.correct_count ?? 0,
      incorrect: p.incorrect_count ?? 0,
    };
  }
  return map;
}

/**
 * Load published videos for a track.
 */
export async function loadVideos(
  trackId: string | null,
  filters?: { systemId?: string; systemSlug?: string }
): Promise<VideoListItem[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  let query = supabase
    .from("video_lessons")
    .select("id, slug, title, description, video_url, duration_seconds, thumbnail_url, system_id, systems(id, slug, name)")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .order("display_order", { ascending: true });

  if (filters?.systemId) query = query.eq("system_id", filters.systemId);
  if (filters?.systemSlug) {
    const { data: sys } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId)
      .eq("slug", filters.systemSlug)
      .single();
    if (sys) query = query.eq("system_id", sys.id);
  }

  const { data } = await query;

  return (data ?? []).map((v) => {
    const sys = Array.isArray(v.systems) ? v.systems[0] : v.systems;
    return {
      id: v.id,
      slug: v.slug,
      title: v.title,
      description: v.description ?? null,
      videoUrl: v.video_url,
      durationSeconds: v.duration_seconds ?? null,
      thumbnailUrl: v.thumbnail_url ?? null,
      systemId: v.system_id ?? null,
      systemSlug: (sys as { slug?: string })?.slug ?? null,
      systemName: (sys as { name?: string })?.name ?? null,
    };
  });
}

/**
 * Load a single video by ID, track-scoped.
 * Transcript: use metadata or future transcript column if present.
 */
export async function loadVideoById(
  trackId: string | null,
  videoId: string
): Promise<VideoDetail | null> {
  if (!trackId) return null;

  const supabase = await createClient();
  const { data: v, error } = await supabase
    .from("video_lessons")
    .select("id, slug, title, description, video_url, duration_seconds, thumbnail_url, transcript, system_id, systems(id, slug, name)")
    .eq("id", videoId)
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .single();

  if (error && process.env.NODE_ENV !== "test") {
    console.warn("[content] loadVideoById failed", { videoId, trackId, code: error.code, message: error.message });
  }
  if (error || !v) return null;

  const sys = Array.isArray(v.systems) ? v.systems[0] : v.systems;
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    description: v.description ?? null,
    videoUrl: v.video_url,
    durationSeconds: v.duration_seconds ?? null,
    thumbnailUrl: v.thumbnail_url ?? null,
    systemId: v.system_id ?? null,
    systemSlug: (sys as { slug?: string })?.slug ?? null,
    systemName: (sys as { name?: string })?.name ?? null,
    transcript: v.transcript ?? undefined,
  };
}

/**
 * Content inventory by track - for empty state messaging and dev diagnostics.
 * All counts use approved/published status for learner-facing content.
 */
export async function loadContentInventoryByTrack(
  trackId: string | null
): Promise<{ guides: number; decks: number; videos: number; questions?: number; highYield?: number }> {
  if (!trackId) return { guides: 0, decks: 0, videos: 0 };

  const supabase = await createClient();

  const [guidesRes, decksRes, videosRes, questionsRes, highYieldRes] = await Promise.all([
    supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("exam_track_id", trackId).in("status", [...LEARNER_VISIBLE_STATUSES]),
    supabase.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("exam_track_id", trackId).in("status", [...LEARNER_VISIBLE_STATUSES]),
    supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("exam_track_id", trackId).in("status", [...LEARNER_VISIBLE_STATUSES]),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_track_id", trackId).in("status", [...LEARNER_VISIBLE_STATUSES]),
    supabase.from("high_yield_content").select("id", { count: "exact", head: true }).eq("exam_track_id", trackId).in("status", [...LEARNER_VISIBLE_STATUSES]),
  ]);

  return {
    guides: guidesRes.count ?? 0,
    decks: decksRes.count ?? 0,
    videos: videosRes.count ?? 0,
    questions: questionsRes.count ?? 0,
    highYield: highYieldRes.count ?? 0,
  };
}
