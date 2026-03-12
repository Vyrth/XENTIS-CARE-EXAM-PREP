"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { validateDraft, type QuestionFormData } from "@/lib/admin/question-validation";

export interface BulkImportResult {
  success: boolean;
  batchId?: string;
  importedCount: number;
  failedCount: number;
  errors?: string[];
}

export async function commitBulkImport(
  rows: QuestionFormData[],
  options: {
    sourceName?: string;
    sourceType?: string;
    fileName?: string;
  } = {}
): Promise<BulkImportResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, importedCount: 0, failedCount: rows.length, errors: ["Supabase not configured"] };
  }

  const supabase = createServiceClient();
  let importedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  let batch: { id: string } | null = null;
  let batchErr: { message?: string } | null = null;

  try {
    const res = await supabase
      .from("question_import_batches")
      .insert({
      source_name: options.sourceName || "Bulk import",
      source_type: options.sourceType || "manual",
      file_name: options.fileName || null,
      total_rows: rows.length,
      status: "importing",
    })
      .select("id")
      .single();
    batch = res.data;
    batchErr = res.error;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("relation") || msg.includes("does not exist")) {
      return {
        success: false,
        importedCount: 0,
        failedCount: rows.length,
        errors: ["question_import_batches table not found. Run: supabase db push"],
      };
    }
    throw e;
  }

  if (batchErr || !batch) {
    return {
      success: false,
      importedCount: 0,
      failedCount: rows.length,
      errors: [batchErr?.message ?? "Failed to create import batch"],
    };
  }

  const batchId = batch.id;

  for (let i = 0; i < rows.length; i++) {
    const data = rows[i];
    const validation = validateDraft(data);
    if (!validation.success) {
      failedCount++;
      errors.push(`Row ${i + 1}: ${validation.errors.join("; ")}`);
      continue;
    }

    try {
      const stemMetadata: Record<string, unknown> = {
        leadIn: data.leadIn || undefined,
        instructions: data.instructions || undefined,
        rationale: data.rationale || undefined,
        imageUrl: data.imageUrl || undefined,
        import_source: { batchId, rowIndex: i + 1 },
      };

      const insertPayload: Record<string, unknown> = {
        exam_track_id: data.examTrackId,
        question_type_id: data.questionTypeId,
        system_id: data.systemId,
        domain_id: data.domainId || null,
        topic_id: data.topicId || null,
        subtopic_id: data.subtopicId || null,
        stem: data.stem.trim(),
        stem_metadata: stemMetadata,
        status: "draft",
        import_batch_id: batchId,
      };

      const { data: q, error: qErr } = await supabase
        .from("questions")
        .insert(insertPayload)
        .select("id")
        .single();

      if (qErr || !q) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${qErr?.message ?? "Insert failed"}`);
        continue;
      }

      for (let j = 0; j < data.options.length; j++) {
        const opt = data.options[j];
        const optionMetadata: Record<string, unknown> = {};
        if (opt.distractorRationale?.trim()) {
          optionMetadata.rationale = opt.distractorRationale;
        }
        await supabase.from("question_options").insert({
          question_id: q.id,
          option_key: opt.key.trim(),
          option_text: opt.text.trim(),
          is_correct: opt.isCorrect ?? false,
          option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
          display_order: j,
        });
      }

      if (data.difficultyTier != null && data.difficultyTier >= 1 && data.difficultyTier <= 5) {
        await supabase.from("question_adaptive_profiles").upsert(
          { question_id: q.id, difficulty_tier: data.difficultyTier },
          { onConflict: "question_id" }
        );
      }

      if (data.imageUrl?.trim()) {
        await supabase.from("question_exhibits").insert({
          question_id: q.id,
          exhibit_type: "image",
          content_url: data.imageUrl,
          display_order: 0,
        });
      }

      importedCount++;
    } catch (e) {
      failedCount++;
      errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  const status = failedCount === 0 ? "completed" : importedCount > 0 ? "partial" : "failed";
  await supabase
    .from("question_import_batches")
    .update({
      imported_count: importedCount,
      failed_count: failedCount,
      status,
    })
    .eq("id", batchId);

  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/import");

  return {
    success: importedCount > 0,
    batchId,
    importedCount,
    failedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}
