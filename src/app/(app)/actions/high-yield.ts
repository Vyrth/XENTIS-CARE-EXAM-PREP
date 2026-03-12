"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type {
  HighYieldContentType,
  ConfusionFrequency,
} from "@/lib/admin/high-yield-studio-loaders";
import { ensureSourceEvidenceForAdminContent } from "@/lib/admin/source-evidence";

export interface HighYieldItemFormData {
  contentType: HighYieldContentType;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  title: string;
  explanation?: string | null;
  whyHighYield?: string | null;
  commonConfusion?: string | null;
  suggestedPracticeLink?: string | null;
  suggestedGuideLink?: string | null;
  highYieldScore?: number | null;
  trapSeverity?: number | null;
  confusionFrequency?: ConfusionFrequency | null;
  trapDescription?: string | null;
  correctApproach?: string | null;
  conceptA?: string | null;
  conceptB?: string | null;
  keyDifference?: string | null;
  status?: string;
  displayOrder?: number;
}

export interface SaveHighYieldResult {
  success: boolean;
  id?: string;
  error?: string;
  validationErrors?: string[];
}

export async function createHighYieldItem(
  data: HighYieldItemFormData
): Promise<SaveHighYieldResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim()) {
    return { success: false, validationErrors: ["Track and title are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("high_yield_content")
      .insert({
        content_type: data.contentType,
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        title: data.title.trim(),
        explanation: data.explanation?.trim() || null,
        why_high_yield: data.whyHighYield?.trim() || null,
        common_confusion: data.commonConfusion?.trim() || null,
        suggested_practice_link: data.suggestedPracticeLink?.trim() || null,
        suggested_guide_link: data.suggestedGuideLink?.trim() || null,
        high_yield_score: data.highYieldScore ?? null,
        trap_severity: data.trapSeverity ?? null,
        confusion_frequency: data.confusionFrequency || null,
        trap_description: data.trapDescription?.trim() || null,
        correct_approach: data.correctApproach?.trim() || null,
        concept_a: data.conceptA?.trim() || null,
        concept_b: data.conceptB?.trim() || null,
        key_difference: data.keyDifference?.trim() || null,
        status: data.status || "draft",
        display_order: data.displayOrder ?? 0,
      })
      .select("id")
      .single();

    if (error || !row) {
      return { success: false, error: error?.message ?? "Failed to create" };
    }

    await ensureSourceEvidenceForAdminContent("high_yield_content", row.id);

    revalidatePath("/admin/high-yield");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateHighYieldItem(
  id: string,
  data: HighYieldItemFormData
): Promise<SaveHighYieldResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim()) {
    return { success: false, validationErrors: ["Track and title are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("high_yield_content")
      .update({
        content_type: data.contentType,
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        title: data.title.trim(),
        explanation: data.explanation?.trim() || null,
        why_high_yield: data.whyHighYield?.trim() || null,
        common_confusion: data.commonConfusion?.trim() || null,
        suggested_practice_link: data.suggestedPracticeLink?.trim() || null,
        suggested_guide_link: data.suggestedGuideLink?.trim() || null,
        high_yield_score: data.highYieldScore ?? null,
        trap_severity: data.trapSeverity ?? null,
        confusion_frequency: data.confusionFrequency || null,
        trap_description: data.trapDescription?.trim() || null,
        correct_approach: data.correctApproach?.trim() || null,
        concept_a: data.conceptA?.trim() || null,
        concept_b: data.conceptB?.trim() || null,
        key_difference: data.keyDifference?.trim() || null,
        status: data.status || "draft",
        display_order: data.displayOrder ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/high-yield");
    revalidatePath(`/admin/high-yield/${id}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteHighYieldItem(
  id: string
): Promise<SaveHighYieldResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase.from("high_yield_content").delete().eq("id", id);
    revalidatePath("/admin/high-yield");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
