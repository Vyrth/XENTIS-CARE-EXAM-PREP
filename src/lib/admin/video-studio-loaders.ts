/**
 * Video Lesson Production Workflow loaders
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface SystemOption {
  id: string;
  slug: string;
  name: string;
  examTrackId: string;
}

export interface TopicOption {
  id: string;
  slug: string;
  name: string;
  domainId: string;
  systemIds?: string[];
}

export interface TranscriptSection {
  id: string;
  text: string;
  displayOrder: number;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  isRetrievalEligible: boolean;
}

export interface AdminVideoForEdit {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  status: string;
  transcriptSections: TranscriptSection[];
  quizQuestionIds: string[];
}

export interface QuestionOption {
  id: string;
  stem: string;
  status: string;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

export async function loadAllSystemsForAdmin(): Promise<SystemOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("systems")
      .select("id, slug, name, exam_track_id")
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      examTrackId: s.exam_track_id,
    }));
  });
}

export async function loadTopicsForTrackAdmin(trackId: string | null): Promise<TopicOption[]> {
  return safeQuery(async () => {
    if (!trackId) return [];
    const supabase = createServiceClient();
    const { data: systems } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId);
    const systemIds = (systems ?? []).map((s) => s.id);
    if (systemIds.length === 0) return [];

    const { data: links } = await supabase
      .from("topic_system_links")
      .select("topic_id, system_id")
      .in("system_id", systemIds);
    const topicToSystems = new Map<string, string[]>();
    for (const l of links ?? []) {
      const list = topicToSystems.get(l.topic_id) ?? [];
      list.push(l.system_id);
      topicToSystems.set(l.topic_id, list);
    }
    const topicIds = [...topicToSystems.keys()];
    if (topicIds.length === 0) return [];

    const { data: topics } = await supabase
      .from("topics")
      .select("id, slug, name, domain_id")
      .in("id", topicIds)
      .order("display_order", { ascending: true });
    return (topics ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      domainId: t.domain_id ?? "",
      systemIds: topicToSystems.get(t.id) ?? [],
    }));
  });
}

/** Load video for edit with transcript sections and quiz links */
export async function loadAdminVideoForEdit(
  videoId: string
): Promise<AdminVideoForEdit | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data: v, error } = await supabase
      .from("video_lessons")
      .select("id, slug, title, description, exam_track_id, system_id, topic_id, video_url, duration_seconds, thumbnail_url, transcript, status")
      .eq("id", videoId)
      .single();
    if (error || !v) return null;

    const { data: sections } = await supabase
      .from("video_transcript_sections")
      .select("id, text, display_order, start_time_seconds, end_time_seconds, is_retrieval_eligible")
      .eq("video_lesson_id", videoId)
      .order("display_order", { ascending: true });

    const { data: quizLinks } = await supabase
      .from("video_quiz_links")
      .select("question_id")
      .eq("video_lesson_id", videoId)
      .order("display_order", { ascending: true });

    const transcriptSections: TranscriptSection[] = (sections ?? []).map((s) => ({
      id: s.id,
      text: s.text ?? "",
      displayOrder: s.display_order ?? 0,
      startTimeSeconds: s.start_time_seconds ?? undefined,
      endTimeSeconds: s.end_time_seconds ?? undefined,
      isRetrievalEligible: s.is_retrieval_eligible ?? true,
    }));

    const quizQuestionIds = (quizLinks ?? []).map((l) => l.question_id);

    return {
      id: v.id,
      slug: v.slug ?? "",
      title: v.title ?? "",
      description: v.description ?? null,
      examTrackId: v.exam_track_id ?? "",
      systemId: v.system_id ?? null,
      topicId: v.topic_id ?? null,
      videoUrl: v.video_url ?? "",
      durationSeconds: v.duration_seconds ?? null,
      thumbnailUrl: v.thumbnail_url ?? null,
      transcript: v.transcript ?? null,
      status: v.status ?? "draft",
      transcriptSections,
      quizQuestionIds,
    };
  } catch {
    return null;
  }
}

/** Load questions for track (for quiz association) */
export async function loadQuestionsForTrackAdmin(
  trackId: string | null,
  limit = 100
): Promise<QuestionOption[]> {
  return safeQuery(async () => {
    if (!trackId) return [];
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("questions")
      .select("id, stem, status")
      .eq("exam_track_id", trackId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((q) => ({
      id: q.id,
      stem: (q.stem ?? "").slice(0, 80),
      status: q.status ?? "draft",
    }));
  });
}
