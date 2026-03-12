"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";
import {
  loadTemplatePoolComposition,
  validatePool,
  loadBlueprintWeights,
  type AssemblyRules,
  type CompositionStats,
  type BlueprintWarning,
} from "@/lib/admin/exam-assembly-pool";

export interface SaveExamTemplateResult {
  success: boolean;
  id?: string;
  error?: string;
  validationErrors?: string[];
}

export interface SaveSystemExamResult {
  success: boolean;
  id?: string;
  error?: string;
  validationErrors?: string[];
}

export interface PoolActionResult {
  success: boolean;
  error?: string;
}

export async function createExamTemplate(data: {
  examTrackId: string;
  slug: string;
  name: string;
  description?: string | null;
  questionCount: number;
  durationMinutes: number;
  blueprintType?: string | null;
  assemblyMode?: "manual" | "rule_based" | "hybrid";
  assemblyRules?: AssemblyRules;
}): Promise<SaveExamTemplateResult> {
  if (!data.examTrackId?.trim() || !data.slug?.trim() || !data.name?.trim()) {
    return { success: false, validationErrors: ["Track, slug, and name are required"] };
  }
  if (data.questionCount < 1 || data.questionCount > 300) {
    return { success: false, validationErrors: ["Question count must be 1–300"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("exam_templates")
      .insert({
        exam_track_id: data.examTrackId,
        slug: data.slug.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        question_count: data.questionCount,
        duration_minutes: data.durationMinutes,
        blueprint_type: data.blueprintType?.trim() || null,
        assembly_mode: data.assemblyMode ?? "manual",
        assembly_rules: data.assemblyRules ?? {},
      })
      .select("id")
      .single();

    if (error || !row) {
      return { success: false, error: error?.message ?? "Failed to create" };
    }

    revalidatePath("/admin/exams");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateExamTemplate(
  id: string,
  data: {
    slug?: string;
    name?: string;
    description?: string | null;
    questionCount?: number;
    durationMinutes?: number;
    blueprintType?: string | null;
    assemblyMode?: "manual" | "rule_based" | "hybrid";
    assemblyRules?: AssemblyRules;
  }
): Promise<SaveExamTemplateResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.slug !== undefined) update.slug = data.slug.trim();
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.description !== undefined) update.description = data.description?.trim() || null;
    if (data.questionCount !== undefined) update.question_count = data.questionCount;
    if (data.durationMinutes !== undefined) update.duration_minutes = data.durationMinutes;
    if (data.blueprintType !== undefined) update.blueprint_type = data.blueprintType?.trim() || null;
    if (data.assemblyMode !== undefined) update.assembly_mode = data.assemblyMode;
    if (data.assemblyRules !== undefined) update.assembly_rules = data.assemblyRules;

    const { error } = await supabase
      .from("exam_templates")
      .update(update)
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/templates/${id}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function addQuestionsToTemplatePool(
  templateId: string,
  questionIds: string[],
  trackId: string
): Promise<PoolActionResult> {
  if (!templateId || questionIds.length === 0) {
    return { success: false, error: "Template and question IDs required" };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: valid } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_track_id", trackId)
      .in("status", [...LEARNER_VISIBLE_STATUSES])
      .in("id", questionIds);

    const validIds = (valid ?? []).map((q) => q.id);
    if (validIds.length === 0) {
      return { success: false, error: "No valid questions found for this track" };
    }

    const rows = validIds.map((questionId) => ({
      exam_template_id: templateId,
      question_id: questionId,
    }));

    const { error } = await supabase
      .from("exam_template_question_pool")
      .upsert(rows, { onConflict: "exam_template_id,question_id", ignoreDuplicates: true });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/templates/${templateId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function removeQuestionFromTemplatePool(
  templateId: string,
  questionId: string
): Promise<PoolActionResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("exam_template_question_pool")
      .delete()
      .eq("exam_template_id", templateId)
      .eq("question_id", questionId);

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/templates/${templateId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createSystemExam(data: {
  examTrackId: string;
  systemId: string;
  name: string;
  description?: string | null;
  questionCount: number;
  durationMinutes: number;
  assemblyMode?: "manual" | "rule_based" | "hybrid";
  assemblyRules?: AssemblyRules;
}): Promise<SaveSystemExamResult> {
  if (!data.examTrackId || !data.systemId || !data.name?.trim()) {
    return { success: false, validationErrors: ["Track, system, and name are required"] };
  }
  if (data.questionCount < 50) {
    return { success: false, validationErrors: ["System exams require at least 50 questions"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("system_exams")
      .insert({
        exam_track_id: data.examTrackId,
        system_id: data.systemId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        question_count: data.questionCount,
        duration_minutes: data.durationMinutes,
        assembly_mode: data.assemblyMode ?? "manual",
        assembly_rules: data.assemblyRules ?? {},
      })
      .select("id")
      .single();

    if (error || !row) {
      return { success: false, error: error?.message ?? "Failed to create" };
    }

    revalidatePath("/admin/exams");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateSystemExam(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    questionCount?: number;
    durationMinutes?: number;
    assemblyMode?: "manual" | "rule_based" | "hybrid";
    assemblyRules?: AssemblyRules;
  }
): Promise<SaveSystemExamResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.description !== undefined) update.description = data.description?.trim() || null;
    if (data.questionCount !== undefined) update.question_count = data.questionCount;
    if (data.durationMinutes !== undefined) update.duration_minutes = data.durationMinutes;
    if (data.assemblyMode !== undefined) update.assembly_mode = data.assemblyMode;
    if (data.assemblyRules !== undefined) update.assembly_rules = data.assemblyRules;

    const { error } = await supabase
      .from("system_exams")
      .update(update)
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/system/${id}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getTemplatePoolComposition(
  templateId: string,
  trackId: string,
  options?: { expectedTotal?: number; assemblyRules?: AssemblyRules }
): Promise<{
  composition: CompositionStats;
  questionIds: string[];
  invalidTrackIds: string[];
  warnings: BlueprintWarning[];
}> {
  const { composition, questionIds, invalidTrackIds } = await loadTemplatePoolComposition(
    templateId,
    trackId
  );
  const validation = await validatePool(
    trackId,
    questionIds,
    options?.assemblyRules,
    options?.expectedTotal
  );
  const warnings = [...validation.warnings];
  if (invalidTrackIds.length > 0) {
    warnings.push({
      type: "unbalanced",
      message: `${invalidTrackIds.length} questions from wrong track`,
    });
  }
  return { composition, questionIds, invalidTrackIds, warnings };
}

export async function getBlueprintWeights(
  trackId: string
): Promise<{ systemId: string; systemName: string; weightPct: number }[]> {
  return loadBlueprintWeights(trackId);
}

export async function addQuestionsToSystemExamPool(
  systemExamId: string,
  questionIds: string[],
  trackId: string
): Promise<PoolActionResult> {
  if (!systemExamId || questionIds.length === 0) {
    return { success: false, error: "Exam and question IDs required" };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: valid } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_track_id", trackId)
      .in("status", [...LEARNER_VISIBLE_STATUSES])
      .in("id", questionIds);

    const validIds = (valid ?? []).map((q) => q.id);
    if (validIds.length === 0) {
      return { success: false, error: "No valid questions found for this track" };
    }

    const rows = validIds.map((questionId, i) => ({
      system_exam_id: systemExamId,
      question_id: questionId,
      display_order: i,
    }));

    const { error } = await supabase
      .from("system_exam_question_pool")
      .upsert(rows, { onConflict: "system_exam_id,question_id", ignoreDuplicates: true });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/system/${systemExamId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
