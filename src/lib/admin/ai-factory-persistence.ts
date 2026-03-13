/**
 * AI Content Factory - Admin persistence layer.
 *
 * Persists AI-generated content into Supabase. Content is:
 * - Track-scoped (exam_track_id)
 * - Auto-published when quality gate passes (score >= threshold, source valid, track set)
 * - Routed to editor_review when gates fail (score below threshold, validation fails, etc.)
 * - Tagged as AI-generated in metadata/audit
 *
 * Tables: questions, question_options, study_guides, study_material_sections,
 * flashcard_decks, flashcards, high_yield_content, ai_generation_audit,
 * content_quality_metadata, content_evidence_metadata.
 */

import {
  persistQuestion,
  persistStudySection,
  persistStudyGuide,
  persistFullStudyGuide,
  persistStudyGuideSectionPack,
  persistFlashcardDeck,
  persistFullFlashcardDeck,
  persistFlashcard,
  persistHighYieldContent,
} from "@/lib/ai/factory/persistence";
import {
  checkDedupeBeforeSave,
  registerAfterSave,
  recordDuplicateSkipped,
  prepareGuideDedupe,
  prepareFlashcardDedupe,
  prepareHighYieldDedupe,
} from "@/lib/ai/dedupe-check";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import type {
  StudyGuideOutput,
  StudyGuideSectionPackOutput,
  FlashcardDeckOutput,
} from "@/lib/ai/content-factory/types";
import type { HighYieldDraft } from "@/lib/ai/factory/persistence";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/** Extended persist result with admin-facing summary */
export interface AIPersistResult {
  success: boolean;
  contentId?: string;
  auditId?: string;
  error?: string;
  /** Human-readable summary for admin UI */
  summary?: string;
  /** True when content was skipped due to duplicate */
  duplicate?: boolean;
  /** True when content was auto-published by quality gate */
  autoPublished?: boolean;
  /** Reason when routed to editor_review instead of auto-publish */
  routedToReviewReason?: string;
}

/** Persist a question (stem + options). Returns summary for admin. */
export async function saveAIQuestion(
  config: GenerationConfig,
  draft: QuestionDraftOutput | ExtendedQuestionOutput,
  questionTypeId: string,
  auditId?: string | null,
  createdBy?: string | null
): Promise<AIPersistResult> {
  const result = await persistQuestion(config, draft, questionTypeId, auditId, createdBy);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      summary: result.duplicate ? "Duplicate stem skipped" : `Failed to save question: ${result.error}`,
      duplicate: result.duplicate,
    };
  }
  if (result.contentId) {
    const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id && isSupabaseServiceRoleConfigured()) {
      const supabase = (await import("@/lib/supabase/service")).createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: "question", entity_id: result.contentId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");
    const ext = draft as { primaryReference?: string; guidelineReference?: string; evidenceTier?: 1 | 2 | 3 };
    await ensureContentEvidenceMetadata("question", result.contentId, config.trackSlug, {
      aiPrimarySlug: ext.primaryReference ?? null,
      aiGuidelineSlug: ext.guidelineReference ?? null,
      aiEvidenceTier: ext.evidenceTier ?? null,
      sourceFrameworkId: framework?.id ?? null,
    });
    const { computeQuestionQualityScore } = await import("@/lib/ai/content-quality-scoring");
    const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
    const quality = computeQuestionQualityScore(draft);
    await upsertContentQualityMetadata("question", result.contentId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: { source: "ai_content_factory", trackId: config.trackId },
    });
    const apResult = await runAutoPublishFlow(
      "question",
      result.contentId,
      "question",
      config.saveStatus ?? "draft",
      createdBy
    );
    const optionCount = Array.isArray(draft.options) ? draft.options.length : 0;
    const summary = apResult.published
      ? `Question auto-published. 1 question, ${optionCount} options.`
      : apResult.routedToReview
        ? `Question routed to editor review: ${apResult.reason ?? "Quality/source gates not met"}. 1 question, ${optionCount} options.`
        : `Question saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 question, ${optionCount} options.`;
    return {
      ...result,
      summary,
      autoPublished: apResult.published,
      routedToReviewReason: apResult.routedToReview ? apResult.reason : undefined,
    };
  }
  const optionCount = Array.isArray(draft.options) ? draft.options.length : 0;
  return {
    ...result,
    summary: `Question saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 question, ${optionCount} options.`,
  };
}

/** Persist a full study guide (title + sections). */
export async function saveAIStudyGuide(
  config: GenerationConfig,
  draft: StudyGuideOutput,
  auditId?: string | null
): Promise<AIPersistResult> {
  const result = await persistFullStudyGuide(config, draft, auditId);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      summary: `Failed to save study guide: ${result.error}`,
    };
  }
  if (result.contentId) {
    const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id && isSupabaseServiceRoleConfigured()) {
      const supabase = (await import("@/lib/supabase/service")).createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: "study_guide", entity_id: result.contentId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");
    const ext = draft as { primaryReference?: string; guidelineReference?: string; evidenceTier?: number };
    await ensureContentEvidenceMetadata("study_guide", result.contentId, config.trackSlug, {
      aiPrimarySlug: ext.primaryReference ?? null,
      aiGuidelineSlug: ext.guidelineReference ?? null,
      aiEvidenceTier: ext.evidenceTier ?? null,
      sourceFrameworkId: framework?.id ?? null,
    });
    const { computeStudyGuideQualityScore } = await import("@/lib/ai/content-quality-scoring");
    const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
    const quality = computeStudyGuideQualityScore(draft, "full");
    await upsertContentQualityMetadata("study_guide", result.contentId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: { source: "ai_content_factory", trackId: config.trackId },
    });
    const apResult = await runAutoPublishFlow(
      "study_guide",
      result.contentId,
      "study_guide",
      config.saveStatus ?? "draft",
      undefined
    );
    const summary = apResult.published
      ? `Study guide auto-published. 1 guide, ${draft.sections.length} sections.`
      : apResult.routedToReview
        ? `Study guide routed to editor review: ${apResult.reason ?? "Quality/source gates not met"}. 1 guide, ${draft.sections.length} sections.`
        : `Study guide saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 guide, ${draft.sections.length} sections.`;
    return {
      ...result,
      summary,
      autoPublished: apResult.published,
      routedToReviewReason: apResult.routedToReview ? apResult.reason : undefined,
    };
  }
  return {
    ...result,
    summary: `Study guide saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 guide, ${draft.sections.length} sections.`,
  };
}

/** Persist a study guide section pack (sections only, with generated title). */
export async function saveAIStudyGuideSectionPack(
  config: GenerationConfig,
  draft: StudyGuideSectionPackOutput,
  guideTitle: string,
  auditId?: string | null,
  options?: { batchPlanId?: string; campaignId?: string; shardId?: string }
): Promise<AIPersistResult> {
  const prep = prepareGuideDedupe(guideTitle.trim());
  const scope = { examTrackId: config.trackId, systemId: config.systemId ?? null, topicId: config.topicId ?? null };
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "study_guide",
    normalizedHash: prep.normalizedHash,
    scope,
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

  const result = await persistStudyGuideSectionPack(config, draft, guideTitle, auditId);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      summary: `Failed to save section pack: ${result.error}`,
    };
  }
  if (result.contentId) {
    await registerAfterSave({
      contentType: "study_guide",
      normalizedHash: prep.normalizedHash,
      scope,
      sourceTable: "study_guides",
      sourceId: result.contentId,
      sourceStatus: config.saveStatus ?? "draft",
      normalizedTextPreview: prep.normalizedTextPreview,
      createdByBatchPlanId: options?.batchPlanId ?? null,
    });
    const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id && isSupabaseServiceRoleConfigured()) {
      const supabase = (await import("@/lib/supabase/service")).createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: "study_guide", entity_id: result.contentId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");
    await ensureContentEvidenceMetadata("study_guide", result.contentId, config.trackSlug, {
      sourceFrameworkId: framework?.id ?? null,
    });
    const { computeStudyGuideQualityScore } = await import("@/lib/ai/content-quality-scoring");
    const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
    const quality = computeStudyGuideQualityScore(
      { title: guideTitle, description: "", sections: draft.sections },
      "section_pack"
    );
    await upsertContentQualityMetadata("study_guide", result.contentId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: { source: "ai_content_factory", trackId: config.trackId },
    });
    const apResult = await runAutoPublishFlow(
      "study_guide",
      result.contentId,
      "study_guide",
      config.saveStatus ?? "draft",
      undefined
    );
    const summary = apResult.published
      ? `Section pack auto-published. 1 guide, ${draft.sections.length} sections.`
      : apResult.routedToReview
        ? `Section pack routed to editor review: ${apResult.reason ?? "Quality/source gates not met"}. 1 guide, ${draft.sections.length} sections.`
        : `Section pack saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 guide, ${draft.sections.length} sections.`;
    return {
      ...result,
      summary,
      autoPublished: apResult.published,
      routedToReviewReason: apResult.routedToReview ? apResult.reason : undefined,
    };
  }
  return {
    ...result,
    summary: `Section pack saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 guide, ${draft.sections.length} sections.`,
  };
}

/** Persist a flashcard deck (name + cards). */
export async function saveAIFlashcardDeck(
  config: GenerationConfig,
  draft: FlashcardDeckOutput,
  auditId?: string | null,
  options?: { batchPlanId?: string; campaignId?: string; shardId?: string }
): Promise<AIPersistResult> {
  const prep = prepareFlashcardDedupe(draft.name.trim());
  const scope = { examTrackId: config.trackId, systemId: config.systemId ?? null, topicId: config.topicId ?? null };
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "flashcard_deck",
    normalizedHash: prep.normalizedHash,
    scope,
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

  const result = await persistFullFlashcardDeck(config, draft, auditId);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      summary: `Failed to save flashcard deck: ${result.error}`,
    };
  }
  if (result.contentId) {
    await registerAfterSave({
      contentType: "flashcard_deck",
      normalizedHash: prep.normalizedHash,
      scope,
      sourceTable: "flashcard_decks",
      sourceId: result.contentId,
      sourceStatus: config.saveStatus ?? "draft",
      normalizedTextPreview: prep.normalizedTextPreview,
      createdByBatchPlanId: options?.batchPlanId ?? null,
    });
    const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id && isSupabaseServiceRoleConfigured()) {
      const supabase = (await import("@/lib/supabase/service")).createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: "flashcard_deck", entity_id: result.contentId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");
    await ensureContentEvidenceMetadata("flashcard_deck", result.contentId, config.trackSlug, {
      sourceFrameworkId: framework?.id ?? null,
    });
    const { computeFlashcardDeckQualityScore } = await import("@/lib/ai/content-quality-scoring");
    const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
    const quality = computeFlashcardDeckQualityScore(draft);
    await upsertContentQualityMetadata("flashcard_deck", result.contentId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: { source: "ai_content_factory", trackId: config.trackId },
    });
    const apResult = await runAutoPublishFlow(
      "flashcard_deck",
      result.contentId,
      "flashcard_deck",
      config.saveStatus ?? "draft",
      undefined
    );
    const summary = apResult.published
      ? `Flashcard deck auto-published. 1 deck, ${draft.cards.length} cards.`
      : apResult.routedToReview
        ? `Flashcard deck routed to editor review: ${apResult.reason ?? "Quality/source gates not met"}. 1 deck, ${draft.cards.length} cards.`
        : `Flashcard deck saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 deck, ${draft.cards.length} cards.`;
    return {
      ...result,
      summary,
      autoPublished: apResult.published,
      routedToReviewReason: apResult.routedToReview ? apResult.reason : undefined,
    };
  }
  return {
    ...result,
    summary: `Flashcard deck saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}. 1 deck, ${draft.cards.length} cards.`,
  };
}

/** Persist high-yield content (summary, confusion, trap, or compare/contrast). */
export async function saveAIHighYieldContent(
  config: GenerationConfig,
  draft: HighYieldDraft,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary",
  auditId?: string | null,
  options?: { batchPlanId?: string; campaignId?: string; shardId?: string }
): Promise<AIPersistResult> {
  const title = (draft as { title?: string }).title ?? "";
  const prep = prepareHighYieldDedupe(title.trim());
  const scope = { examTrackId: config.trackId, systemId: config.systemId ?? null, topicId: config.topicId ?? null };
  const dedupeCheck = await checkDedupeBeforeSave({
    contentType: "high_yield_content",
    normalizedHash: prep.normalizedHash,
    secondaryHash: prep.secondaryHash,
    scope,
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

  const result = await persistHighYieldContent(config, draft, contentType, auditId);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      summary: `Failed to save high-yield content: ${result.error}`,
    };
  }
  if (result.contentId) {
    await registerAfterSave({
      contentType: "high_yield_content",
      normalizedHash: prep.normalizedHash,
      secondaryHash: prep.secondaryHash,
      scope,
      sourceTable: "high_yield_content",
      sourceId: result.contentId,
      sourceStatus: config.saveStatus ?? "draft",
      normalizedTextPreview: prep.normalizedTextPreview,
      createdByBatchPlanId: options?.batchPlanId ?? null,
    });
    const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id && isSupabaseServiceRoleConfigured()) {
      const supabase = (await import("@/lib/supabase/service")).createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: "high_yield_content", entity_id: result.contentId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");
    const hyExt = draft as { primaryReference?: string; guidelineReference?: string; evidenceTier?: number };
    await ensureContentEvidenceMetadata("high_yield_content", result.contentId, config.trackSlug, {
      aiPrimarySlug: hyExt.primaryReference ?? null,
      aiGuidelineSlug: hyExt.guidelineReference ?? null,
      aiEvidenceTier: hyExt.evidenceTier ?? null,
      sourceFrameworkId: framework?.id ?? null,
    });
    const { computeHighYieldQualityScore } = await import("@/lib/ai/content-quality-scoring");
    const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
    const quality = computeHighYieldQualityScore(draft as unknown as Record<string, unknown>, contentType);
    await upsertContentQualityMetadata("high_yield_content", result.contentId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible: quality.autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata: { source: "ai_content_factory", trackId: config.trackId },
    });
    const apResult = await runAutoPublishFlow(
      "high_yield_content",
      result.contentId,
      "high_yield_content",
      config.saveStatus ?? "draft",
      undefined
    );
    const typeLabel = contentType.replace(/_/g, " ");
    const summary = apResult.published
      ? `${typeLabel} auto-published.`
      : apResult.routedToReview
        ? `${typeLabel} routed to editor review: ${apResult.reason ?? "Quality/source gates not met"}.`
        : `${typeLabel} saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}.`;
    return {
      ...result,
      summary,
      autoPublished: apResult.published,
      routedToReviewReason: apResult.routedToReview ? apResult.reason : undefined,
    };
  }
  const typeLabel = contentType.replace(/_/g, " ");
  return {
    ...result,
    summary: `${typeLabel} saved as ${config.saveStatus === "editor_review" ? "editor_review" : "draft"}.`,
  };
}

/** Bulk persist questions (chunked inserts, dedupe via content_dedupe_registry + near-dup, dead-letter on failure) */
export async function saveAIQuestionsBulk(
  items: Array<{
    config: GenerationConfig;
    draft: QuestionDraftOutput | ExtendedQuestionOutput;
    questionTypeId: string;
    auditId?: string | null;
    createdBy?: string | null;
  }>,
  batchJobIdOrOpts?: string | { batchJobId?: string; batchPlanId?: string; campaignId?: string }
): Promise<{
  success: boolean;
  insertedCount: number;
  duplicateCount: number;
  failedCount: number;
  deadLetterCount: number;
  contentIds: string[];
  error?: string;
}> {
  const { bulkPersistQuestions } = await import("@/lib/ai/factory/bulk-persistence");
  const opts =
    typeof batchJobIdOrOpts === "string"
      ? { batchJobId: batchJobIdOrOpts }
      : batchJobIdOrOpts ?? {};
  return bulkPersistQuestions(items, opts);
}

/** Re-export persistence helpers for direct use */
export {
  persistQuestion,
  persistStudySection,
  persistStudyGuide,
  persistFullStudyGuide,
  persistStudyGuideSectionPack,
  persistFlashcardDeck,
  persistFullFlashcardDeck,
  persistFlashcard,
  persistHighYieldContent,
} from "@/lib/ai/factory/persistence";
