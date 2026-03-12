/**
 * Jade Tutor - Persistence Layer
 *
 * Saves AI-generated content into Supabase production tables with:
 * - Track-safe relationships (exam_track_id, system_id, topic_id)
 * - Draft/editor_review status (never auto-publish)
 * - content_dedupe_registry registration
 * - Transaction-safe rollback on partial failure
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  checkDedupeBeforeSave,
  registerAfterSave,
  recordDuplicateSkipped,
  prepareQuestionDedupe,
  prepareGuideDedupe,
  prepareFlashcardDedupe,
  prepareHighYieldDedupe,
} from "@/lib/ai/dedupe-check";
import {
  mapQuestionTypeToExistingSlug,
  mapHighYieldTypeToExistingEnum,
  resolveDraftStatusForGeneratedContent,
} from "./jade-persistence-mappings";
import type { GenerationConfig, PersistResult } from "./factory/types";
import {
  persistQuestion,
  persistFullStudyGuide,
  persistFullFlashcardDeck,
  persistHighYieldContent,
  isExtendedQuestionOutput,
  toQuestionPayload,
} from "./factory/persistence";
import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import type {
  StudyGuideOutput,
  FlashcardDeckOutput,
  CommonConfusionOutput,
  BoardTrapOutput,
  CompareContrastOutput,
} from "@/lib/ai/content-factory/types";
import type { HighYieldSummaryDraftOutput } from "@/lib/ai/admin-drafts/types";

/** Result with optional dedupe registration info */
export interface JadePersistResult extends PersistResult {
  dedupeRegistered?: boolean;
}

export interface JadeSaveOptions {
  preferredStatus?: "draft" | "editor_review";
  auditId?: string | null;
  createdBy?: string | null;
  batchPlanId?: string | null;
  campaignId?: string | null;
  shardId?: string | null;
}

/** Resolve question_type_id from slug via DB lookup */
async function resolveQuestionTypeId(slug: string): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("question_types")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

const scope = (config: GenerationConfig) => ({
  examTrackId: config.trackId,
  systemId: config.systemId ?? null,
  topicId: config.topicId ?? null,
});

/** Insert default question_calibration row if missing (for adaptive/IRT) */
async function ensureQuestionCalibration(
  questionId: string,
  difficultyTier?: number
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const difficultyB = difficultyTier != null && difficultyTier >= 1 && difficultyTier <= 5
    ? difficultyTier - 3
    : 0;
  await supabase.from("question_calibration").upsert(
    {
      question_id: questionId,
      difficulty_b: difficultyB,
      discrimination_a: 1,
      guessing_c: 0,
      slip_d: 1,
      exposure_count: 0,
      calibration_source: "jade_tutor_default",
    },
    { onConflict: "question_id" }
  );
}

/**
 * Save generated question draft.
 * Inserts into questions, question_options, question_calibration (default if needed).
 * Maps AI itemType to valid question_type_slug, resolves question_type_id from DB.
 * Pre-save: checks content_dedupe_registry + near-duplicate rules.
 */
export async function saveGeneratedQuestionDraft(
  config: GenerationConfig,
  draft: QuestionDraftOutput | ExtendedQuestionOutput,
  options?: JadeSaveOptions
): Promise<JadePersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const stem = isExtendedQuestionOutput(draft)
    ? toQuestionPayload(draft).stem
    : (draft as QuestionDraftOutput).stem;
  const prep = prepareQuestionDedupe(stem);
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "question",
    normalizedHash: prep.normalizedHash,
    secondaryHash: prep.secondaryHash,
    scope: scope(config),
    rawStem: stem,
    normalizedPreview: prep.normalizedTextPreview,
  });
  if (dedupeCheck.isDuplicate) {
    if (options?.batchPlanId) {
      await recordDuplicateSkipped({
        batchPlanId: options.batchPlanId,
        contentType: "question",
        normalizedHash: prep.normalizedHash,
        reason: dedupeCheck.reason,
        campaignId: options.campaignId,
        shardId: options.shardId,
      });
    }
    return { success: false, error: "Duplicate stem", duplicate: true };
  }

  const status = resolveDraftStatusForGeneratedContent(options?.preferredStatus);
  const effectiveConfig: GenerationConfig = { ...config, saveStatus: status };

  const aiItemType = isExtendedQuestionOutput(draft) ? draft.itemType : "single_best_answer";
  const slug = mapQuestionTypeToExistingSlug(aiItemType);
  const questionTypeId = await resolveQuestionTypeId(slug);
  if (!questionTypeId) {
    return { success: false, error: `Question type slug '${slug}' not found in question_types` };
  }

  const result = await persistQuestion(
    effectiveConfig,
    draft,
    questionTypeId,
    options?.auditId,
    options?.createdBy
  );

  if (!result.success || !result.contentId) return result;

  const questionId = result.contentId;

  if (isExtendedQuestionOutput(draft) && draft.difficulty != null) {
    await ensureQuestionCalibration(questionId, draft.difficulty);
  } else {
    await ensureQuestionCalibration(questionId);
  }

  const dedupeRegistered = await registerAfterSave({
    contentType: "question",
    normalizedHash: prep.normalizedHash,
    secondaryHash: prep.secondaryHash,
    scope: scope(config),
    sourceTable: "questions",
    sourceId: questionId,
    sourceStatus: status,
    normalizedTextPreview: prep.normalizedTextPreview,
    createdByBatchPlanId: options?.batchPlanId ?? null,
  });

  return { ...result, dedupeRegistered };
}

/**
 * Save generated study guide draft.
 * Inserts into study_guides and study_material_sections.
 * Pre-save: checks content_dedupe_registry.
 */
export async function saveGeneratedStudyGuideDraft(
  config: GenerationConfig,
  draft: StudyGuideOutput,
  options?: JadeSaveOptions
): Promise<JadePersistResult> {
  const prep = prepareGuideDedupe(draft.title.trim());
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "study_guide",
    normalizedHash: prep.normalizedHash,
    scope: scope(config),
  });
  if (dedupeCheck.isDuplicate) {
    if (options?.batchPlanId) {
      await recordDuplicateSkipped({
        batchPlanId: options.batchPlanId,
        contentType: "study_guide",
        normalizedHash: prep.normalizedHash,
        reason: dedupeCheck.reason,
        campaignId: options.campaignId,
        shardId: options.shardId,
      });
    }
    return { success: false, error: "Duplicate study guide title", duplicate: true };
  }

  const status = resolveDraftStatusForGeneratedContent(options?.preferredStatus);
  const effectiveConfig: GenerationConfig = { ...config, saveStatus: status };

  const result = await persistFullStudyGuide(effectiveConfig, draft, options?.auditId);
  if (!result.success || !result.contentId) return result;

  const dedupeRegistered = await registerAfterSave({
    contentType: "study_guide",
    normalizedHash: prep.normalizedHash,
    scope: scope(config),
    sourceTable: "study_guides",
    sourceId: result.contentId,
    sourceStatus: status,
    normalizedTextPreview: prep.normalizedTextPreview,
    createdByBatchPlanId: options?.batchPlanId ?? null,
  });

  return { ...result, dedupeRegistered };
}

/**
 * Save generated flashcard deck draft.
 * Inserts into flashcard_decks and flashcards.
 * Rollback: if deck insert succeeds but cards fail, deck is deleted.
 * Pre-save: checks content_dedupe_registry.
 */
export async function saveGeneratedFlashcardDeckDraft(
  config: GenerationConfig,
  draft: FlashcardDeckOutput,
  options?: JadeSaveOptions
): Promise<JadePersistResult> {
  const prep = prepareFlashcardDedupe(draft.name.trim());
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "flashcard_deck",
    normalizedHash: prep.normalizedHash,
    scope: scope(config),
  });
  if (dedupeCheck.isDuplicate) {
    if (options?.batchPlanId) {
      await recordDuplicateSkipped({
        batchPlanId: options.batchPlanId,
        contentType: "flashcard_deck",
        normalizedHash: prep.normalizedHash,
        reason: dedupeCheck.reason,
        campaignId: options.campaignId,
        shardId: options.shardId,
      });
    }
    return { success: false, error: "Duplicate flashcard deck name", duplicate: true };
  }

  const status = resolveDraftStatusForGeneratedContent(options?.preferredStatus);
  const effectiveConfig: GenerationConfig = { ...config, saveStatus: status };

  const result = await persistFullFlashcardDeck(effectiveConfig, draft, options?.auditId);
  if (!result.success || !result.contentId) return result;

  const dedupeRegistered = await registerAfterSave({
    contentType: "flashcard_deck",
    normalizedHash: prep.normalizedHash,
    scope: scope(config),
    sourceTable: "flashcard_decks",
    sourceId: result.contentId,
    sourceStatus: status,
    normalizedTextPreview: prep.normalizedTextPreview,
    createdByBatchPlanId: options?.batchPlanId ?? null,
  });

  return { ...result, dedupeRegistered };
}

export type HighYieldDraft =
  | HighYieldSummaryDraftOutput
  | CommonConfusionOutput
  | BoardTrapOutput
  | CompareContrastOutput;

/** Map high-yield draft to content_type enum */
function getHighYieldContentType(
  draft: HighYieldDraft,
  aiType?: string | null
): "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary" {
  if (aiType) {
    return mapHighYieldTypeToExistingEnum(aiType) as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
  }
  if ("commonConfusion" in draft && draft.commonConfusion) return "common_confusion";
  if ("trapDescription" in draft && draft.trapDescription) return "board_trap";
  if ("keyDifference" in draft && draft.keyDifference) return "compare_contrast_summary";
  return "high_yield_summary";
}

/**
 * Save generated high-yield content draft.
 * Inserts into high_yield_content using real enum labels.
 * Pre-save: checks content_dedupe_registry.
 */
export async function saveGeneratedHighYieldDraft(
  config: GenerationConfig,
  draft: HighYieldDraft,
  options?: JadeSaveOptions & { aiType?: string | null }
): Promise<JadePersistResult> {
  const title = (draft as { title?: string }).title ?? "";
  const prep = prepareHighYieldDedupe(title.trim());
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "high_yield_content",
    normalizedHash: prep.normalizedHash,
    secondaryHash: prep.secondaryHash,
    scope: scope(config),
  });
  if (dedupeCheck.isDuplicate) {
    if (options?.batchPlanId) {
      await recordDuplicateSkipped({
        batchPlanId: options.batchPlanId,
        contentType: "high_yield_content",
        normalizedHash: prep.normalizedHash,
        reason: dedupeCheck.reason,
        campaignId: options.campaignId,
        shardId: options.shardId,
      });
    }
    return { success: false, error: "Duplicate high-yield title", duplicate: true };
  }

  const status = resolveDraftStatusForGeneratedContent(options?.preferredStatus);
  const effectiveConfig: GenerationConfig = { ...config, saveStatus: status };

  const contentType = getHighYieldContentType(draft, options?.aiType);

  const result = await persistHighYieldContent(
    effectiveConfig,
    draft,
    contentType,
    options?.auditId
  );

  if (!result.success || !result.contentId) return result;

  const dedupeRegistered = await registerAfterSave({
    contentType: "high_yield_content",
    normalizedHash: prep.normalizedHash,
    secondaryHash: prep.secondaryHash,
    scope: scope(config),
    sourceTable: "high_yield_content",
    sourceId: result.contentId,
    sourceStatus: status,
    normalizedTextPreview: prep.normalizedTextPreview,
    createdByBatchPlanId: options?.batchPlanId ?? null,
  });

  return { ...result, dedupeRegistered };
}
