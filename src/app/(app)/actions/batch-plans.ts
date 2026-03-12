"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { BatchPlanStatus } from "@/lib/admin/batch-planner-loaders";

export interface CreateBatchPlanInput {
  examTrackId: string;
  systemId?: string | null;
  topicId?: string | null;
  targetQuestions?: number;
  targetGuides?: number;
  targetDecks?: number;
  targetVideos?: number;
  targetHighYield?: number;
  notes?: string | null;
}

export interface UpdateBatchPlanInput {
  targetQuestions?: number;
  targetGuides?: number;
  targetDecks?: number;
  targetVideos?: number;
  targetHighYield?: number;
  status?: BatchPlanStatus;
  ownerId?: string | null;
  reviewerId?: string | null;
  notes?: string | null;
}

export interface BatchPlanResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function createBatchPlan(input: CreateBatchPlanInput): Promise<BatchPlanResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("batch_plans")
      .insert({
        exam_track_id: input.examTrackId,
        system_id: input.systemId || null,
        topic_id: input.topicId || null,
        target_questions: input.targetQuestions ?? 0,
        target_guides: input.targetGuides ?? 0,
        target_decks: input.targetDecks ?? 0,
        target_videos: input.targetVideos ?? 0,
        target_high_yield: input.targetHighYield ?? 0,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/batch-planner");
    return { success: true, id: data?.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateBatchPlan(id: string, input: UpdateBatchPlanInput): Promise<BatchPlanResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }
  try {
    const supabase = createServiceClient();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.targetQuestions !== undefined) updates.target_questions = input.targetQuestions;
    if (input.targetGuides !== undefined) updates.target_guides = input.targetGuides;
    if (input.targetDecks !== undefined) updates.target_decks = input.targetDecks;
    if (input.targetVideos !== undefined) updates.target_videos = input.targetVideos;
    if (input.targetHighYield !== undefined) updates.target_high_yield = input.targetHighYield;
    if (input.status !== undefined) updates.status = input.status;
    if (input.ownerId !== undefined) updates.owner_id = input.ownerId;
    if (input.reviewerId !== undefined) updates.reviewer_id = input.reviewerId;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase.from("batch_plans").update(updates).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/batch-planner");
    return { success: true, id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteBatchPlan(id: string): Promise<BatchPlanResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("batch_plans").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/batch-planner");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
