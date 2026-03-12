"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { TranscriptSection } from "@/lib/admin/video-studio-loaders";
import { ensureSourceEvidenceForAdminContent } from "@/lib/admin/source-evidence";

export interface VideoFormData {
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  slug: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  status?: string;
}

export interface TranscriptSectionInput {
  id?: string;
  text: string;
  displayOrder: number;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  isRetrievalEligible: boolean;
}

export interface SaveVideoResult {
  success: boolean;
  videoId?: string;
  error?: string;
  validationErrors?: string[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createVideo(
  data: VideoFormData
): Promise<SaveVideoResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim() || !data.videoUrl?.trim()) {
    return { success: false, validationErrors: ["Track, title, and video URL are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const slug = data.slug?.trim() || slugify(data.title);
  if (!slug) return { success: false, validationErrors: ["Slug is required"] };

  try {
    const supabase = createServiceClient();
    const { data: v, error } = await supabase
      .from("video_lessons")
      .insert({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        slug,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        video_url: data.videoUrl.trim(),
        duration_seconds: data.durationSeconds ?? null,
        thumbnail_url: data.thumbnailUrl?.trim() || null,
        display_order: 0,
        status: data.status || "draft",
      })
      .select("id")
      .single();

    if (error || !v) {
      if (error?.code === "23505") {
        return { success: false, validationErrors: ["A video with this slug already exists for this track"] };
      }
      return { success: false, error: error?.message ?? "Failed to create video" };
    }

    await ensureSourceEvidenceForAdminContent("video", v.id);

    revalidatePath("/admin/videos");
    return { success: true, videoId: v.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateVideo(
  videoId: string,
  data: VideoFormData
): Promise<SaveVideoResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim() || !data.videoUrl?.trim()) {
    return { success: false, validationErrors: ["Track, title, and video URL are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const slug = data.slug?.trim() || slugify(data.title);
  if (!slug) return { success: false, validationErrors: ["Slug is required"] };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("video_lessons")
      .update({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        slug,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        video_url: data.videoUrl.trim(),
        duration_seconds: data.durationSeconds ?? null,
        thumbnail_url: data.thumbnailUrl?.trim() || null,
        status: data.status || "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", videoId);

    if (error) {
      if (error.code === "23505") {
        return { success: false, validationErrors: ["A video with this slug already exists for this track"] };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/videos");
    revalidatePath(`/admin/videos/${videoId}`);
    return { success: true, videoId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveTranscriptSections(
  videoId: string,
  sections: TranscriptSectionInput[],
  fullTranscript: string
): Promise<SaveVideoResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    await supabase
      .from("video_transcript_sections")
      .delete()
      .eq("video_lesson_id", videoId);

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      await supabase.from("video_transcript_sections").insert({
          video_lesson_id: videoId,
          text: s.text.trim(),
          display_order: i,
          start_time_seconds: s.startTimeSeconds ?? null,
          end_time_seconds: s.endTimeSeconds ?? null,
          is_retrieval_eligible: s.isRetrievalEligible ?? true,
        });
    }

    await supabase
      .from("video_lessons")
      .update({
        transcript: fullTranscript.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", videoId);

    revalidatePath("/admin/videos");
    revalidatePath(`/admin/videos/${videoId}`);
    return { success: true, videoId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveVideoQuizLinks(
  videoId: string,
  questionIds: string[]
): Promise<SaveVideoResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("video_quiz_links")
      .delete()
      .eq("video_lesson_id", videoId);

    for (let i = 0; i < questionIds.length; i++) {
      await supabase.from("video_quiz_links").insert({
        video_lesson_id: videoId,
        question_id: questionIds[i],
        display_order: i,
      });
    }

    revalidatePath("/admin/videos");
    revalidatePath(`/admin/videos/${videoId}`);
    return { success: true, videoId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
