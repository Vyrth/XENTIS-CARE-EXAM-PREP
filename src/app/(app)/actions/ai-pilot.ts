"use server";

import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import {
  generateQuestionDraft,
  generateStudyGuideDraft,
  generateFlashcardDeckDraft,
  generateHighYieldDraft,
  saveQuestionDraft,
  saveStudyGuideDraft,
  saveFlashcardDeckDraft,
  saveHighYieldDraft,
} from "./ai-factory";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";

export type PilotContentType = "question" | "study_guide" | "flashcard_deck" | "high_yield";

export interface PilotGenerationSpec {
  trackId: string;
  trackSlug: string;
  trackName: string;
  systemId: string;
  systemName: string;
  topicId: string;
  topicName: string;
  contentType: PilotContentType;
  /** For high-yield: which subtype */
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
}

export interface PilotPreviewItem {
  spec: PilotGenerationSpec;
  contentType: PilotContentType;
  draft: unknown;
  auditId: string | null;
  error?: string;
}

export interface PilotGenerationResult {
  success: boolean;
  item?: PilotPreviewItem;
  error?: string;
}

/** Generate a single pilot item (preview only). */
export async function generatePilotItemAction(
  spec: PilotGenerationSpec,
  data: AIFactoryPageData
): Promise<PilotGenerationResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const config: GenerationConfig = {
    trackId: spec.trackId,
    trackSlug: spec.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp",
    systemId: spec.systemId,
    systemName: spec.systemName,
    topicId: spec.topicId,
    topicName: spec.topicName,
    saveStatus: "draft",
    objective: getTrackObjective(spec.trackSlug),
    itemTypeSlug: "single_best_answer",
    studyGuideMode: "section_pack",
    sectionCount: 4,
    flashcardDeckMode: "rapid_recall",
    cardCount: 8,
  };

  try {
    if (spec.contentType === "question") {
      const questionTypeId =
        data.questionTypes.find((qt) => qt.slug === "single_best_answer")?.id ?? data.questionTypes[0]?.id;
      if (!questionTypeId) return { success: false, error: "No question type found" };
      const result = await generateQuestionDraft(config, questionTypeId);
      if (!result.success || !result.draft)
        return { success: false, error: result.error ?? "Generation failed" };
      return {
        success: true,
        item: { spec, contentType: "question", draft: result.draft, auditId: result.auditId ?? null },
      };
    }

    if (spec.contentType === "study_guide") {
      const result = await generateStudyGuideDraft(config, "section_pack");
      if (!result.success || !result.draft)
        return { success: false, error: result.error ?? "Generation failed" };
      return {
        success: true,
        item: { spec, contentType: "study_guide", draft: result.draft, auditId: result.auditId ?? null },
      };
    }

    if (spec.contentType === "flashcard_deck") {
      const result = await generateFlashcardDeckDraft(config);
      if (!result.success || !result.draft)
        return { success: false, error: result.error ?? "Generation failed" };
      return {
        success: true,
        item: { spec, contentType: "flashcard_deck", draft: result.draft, auditId: result.auditId ?? null },
      };
    }

    if (spec.contentType === "high_yield") {
      const hyType = spec.highYieldType ?? "high_yield_summary";
      const result = await generateHighYieldDraft(config, hyType);
      if (!result.success || !result.draft)
        return { success: false, error: result.error ?? "Generation failed" };
      return {
        success: true,
        item: { spec, contentType: "high_yield", draft: result.draft, auditId: result.auditId ?? null },
      };
    }

    return { success: false, error: "Unknown content type" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function getTrackObjective(trackSlug: string): string {
  const obj: Record<string, string> = {
    rn: "NCLEX prioritization, safety, delegation",
    fnp: "Primary care diagnosis, management, first-line treatments",
    pmhnp: "DSM criteria, psychopharmacology, therapeutic communication",
    lvn: "LVN/LPN scope: fundamentals, safe direct care, when to report",
  };
  return obj[trackSlug] ?? "Board-focused content";
}

export interface SavePilotItemInput {
  contentType: PilotContentType;
  spec: PilotGenerationSpec;
  draft: unknown;
  auditId: string | null;
  questionTypeId?: string;
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
}

export interface SavePilotItemResult {
  success: boolean;
  contentId?: string;
  error?: string;
}

/** Save a single pilot item from preview. */
export async function savePilotItemAction(
  input: SavePilotItemInput,
  data: AIFactoryPageData
): Promise<SavePilotItemResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const config: GenerationConfig = {
    trackId: input.spec.trackId,
    trackSlug: input.spec.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp",
    systemId: input.spec.systemId,
    systemName: input.spec.systemName,
    topicId: input.spec.topicId,
    topicName: input.spec.topicName,
    saveStatus: "draft",
    objective: getTrackObjective(input.spec.trackSlug),
    itemTypeSlug: "single_best_answer",
    studyGuideMode: "section_pack",
    sectionCount: 4,
    flashcardDeckMode: "rapid_recall",
    cardCount: 8,
  };

  try {
    if (input.contentType === "question") {
      const questionTypeId =
        input.questionTypeId ??
        data.questionTypes.find((qt) => qt.slug === "single_best_answer")?.id ??
        data.questionTypes[0]?.id;
      if (!questionTypeId) return { success: false, error: "No question type found" };
      const draft = input.draft as Parameters<typeof saveQuestionDraft>[1];
      const result = await saveQuestionDraft(config, draft, questionTypeId, input.auditId ?? undefined);
      return { success: result.success, contentId: result.contentId, error: result.error };
    }

    if (input.contentType === "study_guide") {
      const draft = input.draft as Parameters<typeof saveStudyGuideDraft>[1];
      const result = await saveStudyGuideDraft(config, draft, input.auditId ?? undefined);
      return { success: result.success, contentId: result.contentId, error: result.error };
    }

    if (input.contentType === "flashcard_deck") {
      const draft = input.draft as Parameters<typeof saveFlashcardDeckDraft>[1];
      const result = await saveFlashcardDeckDraft(config, draft, input.auditId ?? undefined);
      return { success: result.success, contentId: result.contentId, error: result.error };
    }

    if (input.contentType === "high_yield") {
      const hyType = input.highYieldType ?? input.spec.highYieldType ?? "high_yield_summary";
      const result = await saveHighYieldDraft(config, input.draft, hyType, input.auditId ?? undefined);
      return { success: result.success, contentId: result.contentId, error: result.error };
    }

    return { success: false, error: "Unknown content type" };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
