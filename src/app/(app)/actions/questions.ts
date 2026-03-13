"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { validateDraft, type QuestionFormData } from "@/lib/admin/question-validation";
import { ensureSourceEvidenceForAdminContent } from "@/lib/admin/source-evidence";
import { ensureContentEvidenceMetadata } from "@/lib/admin/source-governance";
import { getTrackSlug } from "@/lib/admin/source-governance-helpers";
import { computeQuestionQualityScore } from "@/lib/ai/content-quality-scoring";
import { upsertContentQualityMetadata, runAutoPublishFlow } from "@/lib/admin/auto-publish";

export interface SaveQuestionResult {
  success: boolean;
  questionId?: string;
  error?: string;
  validationErrors?: string[];
}

export async function createQuestion(
  data: QuestionFormData
): Promise<SaveQuestionResult> {
  const validation = validateDraft(data);
  if (!validation.success) {
    return { success: false, validationErrors: validation.errors };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    const stemMetadata: Record<string, unknown> = {
      leadIn: data.leadIn || undefined,
      instructions: data.instructions || undefined,
      rationale: data.rationale || undefined,
      imageUrl: data.imageUrl || undefined,
      aiGenerated: data.aiGenerated || undefined,
    };

    const { data: q, error: qErr } = await supabase
      .from("questions")
      .insert({
        exam_track_id: data.examTrackId,
        question_type_id: data.questionTypeId,
        system_id: data.systemId,
        domain_id: data.domainId || null,
        topic_id: data.topicId || null,
        subtopic_id: data.subtopicId || null,
        stem: data.stem.trim(),
        stem_metadata: stemMetadata,
        status: "draft",
      })
      .select("id")
      .single();

    if (qErr || !q) {
      return { success: false, error: qErr?.message ?? "Failed to create question" };
    }

    const questionId = q.id;

    for (let i = 0; i < data.options.length; i++) {
      const opt = data.options[i];
      const optionMetadata: Record<string, unknown> = {};
      if (opt.distractorRationale?.trim()) {
        optionMetadata.rationale = opt.distractorRationale;
      }
      await supabase.from("question_options").insert({
        question_id: questionId,
        option_key: opt.key.trim(),
        option_text: opt.text.trim(),
        is_correct: opt.isCorrect ?? false,
        option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
        display_order: i,
      });
    }

    if (data.difficultyTier != null && data.difficultyTier >= 1 && data.difficultyTier <= 5) {
      await supabase.from("question_adaptive_profiles").upsert({
        question_id: questionId,
        difficulty_tier: data.difficultyTier,
      }, { onConflict: "question_id" });
    }

    if (data.imageUrl?.trim()) {
      await supabase.from("question_exhibits").insert({
        question_id: questionId,
        exhibit_type: "image",
        content_url: data.imageUrl,
        display_order: 0,
      });
    }

    await ensureSourceEvidenceForAdminContent("question", questionId);
    const trackSlug = await getTrackSlug(data.examTrackId);
    if (trackSlug) {
      await ensureContentEvidenceMetadata("question", questionId, trackSlug, {});
    }

    const draft = {
      stem: data.stem.trim(),
      rationale: data.rationale ?? "",
      options: data.options.map((o) => ({
        key: o.key.trim(),
        text: o.text.trim(),
        isCorrect: o.isCorrect ?? false,
      })),
    };
    const quality = computeQuestionQualityScore(draft);
    await upsertContentQualityMetadata("question", questionId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: data.aiGenerated ? { source: "admin_draft" } : undefined,
    });
    await runAutoPublishFlow("question", questionId, "question", "draft", null);

    revalidatePath("/admin/questions");
    return { success: true, questionId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateQuestion(
  questionId: string,
  data: QuestionFormData
): Promise<SaveQuestionResult> {
  const validation = validateDraft(data);
  if (!validation.success) {
    return { success: false, validationErrors: validation.errors };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    const stemMetadata: Record<string, unknown> = {
      leadIn: data.leadIn || undefined,
      instructions: data.instructions || undefined,
      rationale: data.rationale || undefined,
      imageUrl: data.imageUrl || undefined,
      aiGenerated: data.aiGenerated || undefined,
    };

    const { error: qErr } = await supabase
      .from("questions")
      .update({
        question_type_id: data.questionTypeId,
        system_id: data.systemId,
        domain_id: data.domainId || null,
        topic_id: data.topicId || null,
        subtopic_id: data.subtopicId || null,
        stem: data.stem.trim(),
        stem_metadata: stemMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (qErr) {
      return { success: false, error: qErr.message };
    }

    await supabase.from("question_options").delete().eq("question_id", questionId);

    for (let i = 0; i < data.options.length; i++) {
      const opt = data.options[i];
      const optionMetadata: Record<string, unknown> = {};
      if (opt.distractorRationale?.trim()) {
        optionMetadata.rationale = opt.distractorRationale;
      }
      await supabase.from("question_options").insert({
        question_id: questionId,
        option_key: opt.key.trim(),
        option_text: opt.text.trim(),
        is_correct: opt.isCorrect ?? false,
        option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
        display_order: i,
      });
    }

    if (data.difficultyTier != null && data.difficultyTier >= 1 && data.difficultyTier <= 5) {
      await supabase.from("question_adaptive_profiles").upsert({
        question_id: questionId,
        difficulty_tier: data.difficultyTier,
      }, { onConflict: "question_id" });
    }

    const { data: exhibits } = await supabase
      .from("question_exhibits")
      .select("id")
      .eq("question_id", questionId)
      .eq("exhibit_type", "image");
    if (exhibits?.length) {
      await supabase
        .from("question_exhibits")
        .update({ content_url: data.imageUrl || null })
        .eq("id", exhibits[0].id);
    } else if (data.imageUrl?.trim()) {
      await supabase.from("question_exhibits").insert({
        question_id: questionId,
        exhibit_type: "image",
        content_url: data.imageUrl,
        display_order: 0,
      });
    }

    const trackSlugForUpdate = await getTrackSlug(data.examTrackId);
    if (trackSlugForUpdate) {
      await ensureContentEvidenceMetadata("question", questionId, trackSlugForUpdate, {});
    }

    const { data: row } = await supabase.from("questions").select("status").eq("id", questionId).single();
    const fromStatus = (row?.status as string) ?? "draft";
    const draft = {
      stem: data.stem.trim(),
      rationale: data.rationale ?? "",
      options: data.options.map((o) => ({
        key: o.key.trim(),
        text: o.text.trim(),
        isCorrect: o.isCorrect ?? false,
      })),
    };
    const quality = computeQuestionQualityScore(draft);
    await upsertContentQualityMetadata("question", questionId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: data.aiGenerated ? { source: "admin_draft" } : undefined,
    });
    await runAutoPublishFlow("question", questionId, "question", fromStatus, null);

    revalidatePath("/admin/questions");
    revalidatePath(`/admin/questions/${questionId}`);
    return { success: true, questionId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
