"use server";

import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import { generateContent } from "@/lib/ai/content-factory";
import { toContentFactoryRequest } from "@/lib/ai/content-factory/adapter";
import { loadExamTracks } from "@/lib/admin/loaders";
import { resolveConfigTrack } from "@/lib/ai/factory/resolve-track";
import {
  saveAIQuestion,
  saveAIStudyGuide,
  saveAIStudyGuideSectionPack,
  saveAIFlashcardDeck,
  saveAIHighYieldContent,
} from "@/lib/admin/ai-factory-persistence";
import type { HighYieldDraft } from "@/lib/ai/factory/persistence";
import {
  persistStudySection,
  persistStudyGuide,
  persistFlashcardDeck,
  persistFlashcard,
  persistFullFlashcardDeck,
  persistQuestion,
  persistHighYieldContent,
} from "@/lib/ai/factory/persistence";
import {
  validateGenerationConfig,
  validateQuestionDraft,
  validateStudySectionDraft,
  validateFlashcardDraft,
  validateHighYieldDraft,
} from "@/lib/ai/factory/validation";
import { resolveQuestionTypeId } from "@/lib/ai/factory/question-type-resolver";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import { GENERATION_PRESETS, type GenerationPreset } from "@/lib/ai/factory/presets";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { recordGenerationAudit, recordGenerationDiscarded } from "@/lib/ai/audit-logging";
import { logBatchEvent } from "@/app/(app)/actions/ai-factory-campaign";

/** Resolve config server-side (track by id/slug) so validation and persistence use canonical UUIDs */
async function resolveConfigServer(
  config: GenerationConfig
): Promise<{ resolved: GenerationConfig; trackOptions: { id: string; slug: string; name: string }[] } | null> {
  const tracks = await loadExamTracks();
  const trackOptions = tracks.map((t) => ({ id: t.id, slug: t.slug ?? "rn", name: t.name }));
  const resolved = resolveConfigTrack(config, trackOptions);
  if (!resolved) return null;
  return { resolved, trackOptions };
}

/** Record AI generation audit entry (at save time - legacy/direct flow) */
async function recordAudit(
  contentType: string,
  config: GenerationConfig,
  createdBy: string | null
): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_generation_audit")
      .insert({
        content_type: contentType,
        content_id: null,
        generation_params: {
          aiGenerated: true,
          source: "ai_content_factory",
          track: config.trackSlug,
          trackId: config.trackId,
          systemId: config.systemId,
          systemName: config.systemName,
          topicId: config.topicId,
          topicName: config.topicName,
          objective: config.objective,
          targetDifficulty: config.targetDifficulty,
          itemType: config.itemTypeSlug,
        },
        model_used: "gpt-4o-mini",
        created_by: createdBy,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export interface GenerateAndSaveResult {
  success: boolean;
  contentId?: string;
  auditId?: string;
  error?: string;
  /** Human-readable summary for admin UI */
  summary?: string;
}

/** Generate question draft for preview (no save). Resolves question_type_id from config.itemTypeSlug server-side. */
export async function generateQuestionDraft(config: GenerationConfig): Promise<{
  success: boolean;
  draft?: {
    stem: string;
    leadIn?: string;
    instructions?: string;
    options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
    rationale?: string;
    itemType?: string;
    difficulty?: number;
  };
  auditId?: string;
  error?: string;
}> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "question", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const questionTypeId = await resolveQuestionTypeId(resolved.itemTypeSlug);
  if (!questionTypeId) {
    const slug = resolved.itemTypeSlug ?? "single_best_answer";
    return {
      success: false,
      error: `Question type "${slug}" not found. Ensure question_types migration has been applied.`,
    };
  }

  const req = toContentFactoryRequest(resolved, "question");
  await logBatchEvent({
    eventType: "generation_requested",
    message: "Single question generation requested",
    metadata: {
      contentType: "question",
      trackId: resolved.trackId,
      trackSlug: resolved.trackSlug,
      systemId: resolved.systemId,
      topicId: resolved.topicId,
    },
  });

  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "question") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const auditId = await recordGenerationAudit({
    contentType: "question",
    config: resolved,
    createdBy: guard.userId,
    generationCount: 1,
  });

  const data = result.output.data;
  return {
    success: true,
    draft: {
      stem: data.stem,
      leadIn: data.leadIn,
      instructions: data.instructions,
      options: data.options.map((o) => ({
        key: o.key,
        text: o.text,
        isCorrect: o.isCorrect,
        distractorRationale: o.distractorRationale,
      })),
      rationale: data.rationale,
      itemType: resolved.itemTypeSlug ?? "single_best_answer",
      difficulty: config.targetDifficulty ?? 3,
    },
    auditId: auditId ?? undefined,
  };
}

/** Save a previewed question draft. Resolves question_type_id from config.itemTypeSlug server-side. */
export async function saveQuestionDraft(
  config: GenerationConfig,
  draft: {
    stem: string;
    leadIn?: string;
    instructions?: string;
    options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
    rationale?: string;
    itemType?: string;
    difficulty?: number;
  },
  auditIdFromPreview?: string
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "question", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const questionTypeId = await resolveQuestionTypeId(resolved.itemTypeSlug);
  if (!questionTypeId) {
    const slug = resolved.itemTypeSlug ?? "single_best_answer";
    return {
      success: false,
      error: `Question type "${slug}" not found. Ensure question_types migration has been applied.`,
    };
  }

  const auditId = auditIdFromPreview ?? (await recordAudit("question", resolved, guard.userId));
  const persist = await saveAIQuestion(
    resolved,
    {
      ...draft,
      itemType: draft.itemType ?? config.itemTypeSlug ?? "single_best_answer",
    } as Parameters<typeof saveAIQuestion>[1],
    questionTypeId,
    auditId,
    guard.userId
  );
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate question and save as draft. Resolves question_type_id from config.itemTypeSlug server-side. */
export async function generateAndSaveQuestion(config: GenerationConfig): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "question", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const questionTypeId = await resolveQuestionTypeId(resolved.itemTypeSlug);
  if (!questionTypeId) {
    const slug = resolved.itemTypeSlug ?? "single_best_answer";
    return {
      success: false,
      error: `Question type "${slug}" not found. Ensure question_types migration has been applied.`,
    };
  }

  const req = toContentFactoryRequest(resolved, "question");
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "question") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const auditId = await recordAudit("question", resolved, guard.userId);
  const persist = await persistQuestion(
    resolved,
    result.output.data,
    questionTypeId,
    auditId,
    guard.userId
  );
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
  };
}

/** Save a previewed study guide draft */
export async function saveStudyGuideDraft(
  config: GenerationConfig,
  draft: { title: string; slugSuggestion?: string; description: string; boardFocus?: string; sections: unknown[] },
  auditIdFromPreview?: string
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "study_guide", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const sections = draft.sections as Array<{
    title: string;
    slug?: string;
    contentMarkdown: string;
    plainExplanation?: string;
    keyTakeaways?: string[];
    commonTraps?: string[];
    quickReviewBullets?: string[];
    mnemonics?: string[];
    highYield?: boolean;
  }>;

  const studyGuideOutput = {
    title: draft.title,
    slugSuggestion: draft.slugSuggestion,
    description: draft.description,
    boardFocus: draft.boardFocus,
    sections,
  };

  const auditId = auditIdFromPreview ?? (await recordAudit("study_guide", resolved, guard.userId));
  const persist = await saveAIStudyGuide(resolved, studyGuideOutput, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate study guide draft for preview (no save) */
export async function generateStudyGuideDraft(
  config: GenerationConfig,
  mode: "full" | "section_pack"
): Promise<{
  success: boolean;
  draft?: { title: string; slugSuggestion?: string; description: string; boardFocus?: string; sections: unknown[] };
  auditId?: string;
  error?: string;
}> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "study_guide", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const contentMode = mode === "full" ? "study_guide" : "study_guide_section_pack";
  const req = toContentFactoryRequest(resolved, contentMode, {
    sectionCount: resolved.sectionCount ?? (mode === "section_pack" ? 4 : undefined),
  });
  const result = await generateContent(req);

  if (!result.success) {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const sectionCount =
    result.output?.mode === "study_guide"
      ? (result.output.data as { sections?: unknown[] }).sections?.length ?? 0
      : result.output?.mode === "study_guide_section_pack"
        ? (result.output.data as { sections?: unknown[] }).sections?.length ?? 0
        : 0;

  const auditId = await recordGenerationAudit({
    contentType: mode === "full" ? "study_guide" : "study_guide_section_pack",
    config: resolved,
    createdBy: guard.userId,
    generationCount: sectionCount,
  });

  if (result.output?.mode === "study_guide") {
    return { success: true, draft: result.output.data, auditId: auditId ?? undefined };
  }
  if (result.output?.mode === "study_guide_section_pack") {
    const pack = result.output.data;
    const guideTitle =
      resolved.topicName || resolved.systemName
        ? `Study Guide - ${[resolved.systemName, resolved.topicName].filter(Boolean).join(": ")}`
        : "Study Guide - Section Pack";
    return {
      success: true,
      draft: {
        title: guideTitle,
        description: `Section pack with ${pack.sections.length} sections`,
        sections: pack.sections,
      },
      auditId: auditId ?? undefined,
    };
  }

  return { success: false, error: "Unexpected output mode" };
}

/** Generate full study guide and save */
export async function generateAndSaveFullStudyGuide(config: GenerationConfig): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "study_guide", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "study_guide");
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "study_guide") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const auditId = await recordAudit("study_guide", resolved, guard.userId);
  const persist = await saveAIStudyGuide(resolved, result.output.data, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate study guide section pack and save */
export async function generateAndSaveStudyGuideSectionPack(config: GenerationConfig): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "study_guide", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "study_guide_section_pack", {
    sectionCount: resolved.sectionCount ?? 4,
  });
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "study_guide_section_pack") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const guideTitle =
    resolved.topicName || resolved.systemName
      ? `${resolved.systemName || ""} ${resolved.topicName || ""}`.trim() || "Section Pack"
      : "Study Guide - Section Pack";

  const auditId = await recordAudit("study_guide_section_pack", resolved, guard.userId);
  const persist = await saveAIStudyGuideSectionPack(resolved, result.output.data, guideTitle, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate study guide (legacy: title + 1 section) and save */
export async function generateAndSaveStudyGuide(config: GenerationConfig): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "study_guide", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "study_guide_section");
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "study_guide_section") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const draft = result.output.data;
  const auditId = await recordAudit("study_section", resolved, guard.userId);
  const persistGuide = await persistStudyGuide(resolved, draft.title, draft.contentMarkdown?.slice(0, 200), auditId);
  if (!persistGuide.success || !persistGuide.contentId) {
    return { success: false, error: persistGuide.error };
  }

  const persistSection = await persistStudySection(resolved, draft, persistGuide.contentId, null);
  return {
    success: persistSection.success,
    contentId: persistGuide.contentId,
    auditId: persistGuide.auditId ?? auditId ?? undefined,
    error: persistSection.error,
  };
}

/** Generate flashcard deck draft for preview (no save) */
export async function generateFlashcardDeckDraft(config: GenerationConfig): Promise<{
  success: boolean;
  draft?: { name: string; description?: string; deckType?: string; difficulty?: string; cards: unknown[] };
  auditId?: string;
  error?: string;
}> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "flashcard_deck", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "flashcard_deck", {
    quantity: resolved.cardCount ?? 8,
  });
  const result = await generateContent(req);

  if (!result.success) {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  if (result.output?.mode === "flashcard_deck") {
    const deck = result.output.data;
    const auditId = await recordGenerationAudit({
      contentType: "flashcard_deck",
      config: resolved,
      createdBy: guard.userId,
      generationCount: deck.cards?.length ?? 0,
    });
    return { success: true, draft: deck, auditId: auditId ?? undefined };
  }

  return { success: false, error: "Unexpected output mode" };
}

/** Save a previewed flashcard deck draft */
export async function saveFlashcardDeckDraft(
  config: GenerationConfig,
  draft: { name: string; description?: string; deckType?: string; difficulty?: string; cards: unknown[] },
  auditIdFromPreview?: string
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "flashcard_deck", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const cards = draft.cards as Array<{ frontText: string; backText: string; hint?: string; memoryTrick?: string }>;
  const deckOutput = {
    name: draft.name,
    description: draft.description,
    deckType: draft.deckType,
    difficulty: draft.difficulty,
    cards,
  };

  const auditId = auditIdFromPreview ?? (await recordAudit("flashcard_deck", resolved, guard.userId));
  const persist = await saveAIFlashcardDeck(resolved, deckOutput, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate flashcard deck (name + cards) and save */
export async function generateAndSaveFlashcardDeck(config: GenerationConfig): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "flashcard_deck", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "flashcard_deck", {
    quantity: resolved.cardCount ?? 8,
  });
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "flashcard_deck") {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const deck = result.output.data;
  const auditId = await recordAudit("flashcard_deck", resolved, guard.userId);

  if (deck.deckType && deck.cards.length >= 3) {
    const persist = await saveAIFlashcardDeck(resolved, deck, auditId);
    return {
      success: persist.success,
      contentId: persist.contentId,
      auditId: persist.auditId ?? auditId ?? undefined,
      error: persist.error,
      summary: persist.summary,
    };
  }

  const persistDeck = await persistFlashcardDeck(resolved, deck.name, deck.description ?? "", auditId);
  if (!persistDeck.success || !persistDeck.contentId) {
    return { success: false, error: persistDeck.error };
  }

  for (let i = 0; i < deck.cards.length; i++) {
    await persistFlashcard(persistDeck.contentId, deck.cards[i], i, null);
  }
  return {
    success: true,
    contentId: persistDeck.contentId,
    auditId: persistDeck.auditId ?? auditId ?? undefined,
  };
}

/** Generate single flashcard and add to existing deck */
export async function generateAndSaveFlashcard(
  config: GenerationConfig,
  deckId: string,
  displayOrder: number
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "flashcard", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const req = toContentFactoryRequest(resolved, "flashcard_cards", { quantity: 1 });
  const result = await generateContent(req);
  if (!result.success || result.output?.mode !== "flashcard_cards" || result.output.data.length === 0) {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const auditId = await recordAudit("flashcard", resolved, guard.userId);
  const persist = await persistFlashcard(deckId, result.output.data[0], displayOrder, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
  };
}

const HIGH_YIELD_MODE_MAP = {
  high_yield_summary: "high_yield_summary" as const,
  common_confusion: "common_confusion" as const,
  board_trap: "board_trap" as const,
  compare_contrast_summary: "compare_contrast" as const,
};

type HighYieldContentType = "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";

/** Generate high-yield draft for preview (no save) */
export async function generateHighYieldDraft(
  config: GenerationConfig,
  contentType: HighYieldContentType
): Promise<{
  success: boolean;
  draft?: unknown;
  auditId?: string;
  error?: string;
}> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "high_yield_summary", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const contentMode = HIGH_YIELD_MODE_MAP[contentType];
  const req = toContentFactoryRequest(resolved, contentMode);
  const result = await generateContent(req);

  if (!result.success) {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  if (result.output && ["high_yield_summary", "common_confusion", "board_trap", "compare_contrast"].includes(result.output.mode)) {
    const auditId = await recordGenerationAudit({
      contentType,
      config: resolved,
      createdBy: guard.userId,
      generationCount: 1,
    });
    return { success: true, draft: result.output.data, auditId: auditId ?? undefined };
  }

  return { success: false, error: "Unexpected output mode" };
}

/** Save a previewed high-yield draft */
export async function saveHighYieldDraft(
  config: GenerationConfig,
  draft: unknown,
  contentType: HighYieldContentType,
  auditIdFromPreview?: string
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "high_yield_summary", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const auditId = auditIdFromPreview ?? (await recordAudit(contentType, resolved, guard.userId));
  const persist = await saveAIHighYieldContent(resolved, draft as HighYieldDraft, contentType, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Generate high-yield content and save */
export async function generateAndSaveHighYield(
  config: GenerationConfig,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary"
): Promise<GenerateAndSaveResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const resolveResult = await resolveConfigServer(config);
  if (!resolveResult) {
    return { success: false, error: config.trackId?.trim() ? "Selected track could not be resolved" : "Select a track" };
  }
  const { resolved, trackOptions } = resolveResult;
  const validation = validateGenerationConfig(resolved, "high_yield_summary", trackOptions);
  if (!validation.success) {
    return { success: false, error: validation.errors.join("; ") };
  }

  const contentMode = HIGH_YIELD_MODE_MAP[contentType];
  const req = toContentFactoryRequest(resolved, contentMode);
  const result = await generateContent(req);
  if (!result.success || !result.output) {
    return { success: false, error: result.error ?? "Generation failed" };
  }

  const mode = result.output.mode;
  const expectedModes = ["high_yield_summary", "common_confusion", "board_trap", "compare_contrast"];
  if (!expectedModes.includes(mode)) {
    return { success: false, error: "Unexpected output mode" };
  }

  const auditId = await recordAudit(contentType, resolved, guard.userId);
  const persist = await saveAIHighYieldContent(resolved, result.output.data as HighYieldDraft, contentType, auditId);
  return {
    success: persist.success,
    contentId: persist.contentId,
    auditId: persist.auditId ?? auditId ?? undefined,
    error: persist.error,
    summary: persist.summary,
  };
}

/** Record that user discarded generated content */
export async function recordGenerationDiscardedAction(auditId: string): Promise<boolean> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return false;
  return recordGenerationDiscarded(auditId);
}

/** Fetch generation presets for AI Content Factory (admin-only) */
export async function fetchPresetsAction(): Promise<{
  success: boolean;
  presets?: GenerationPreset[];
  error?: string;
}> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return { success: true, presets: GENERATION_PRESETS };
}

export type ValidateContentType =
  | "question"
  | "study_section"
  | "flashcard"
  | "high_yield"
  | "generation_config";

/** Validate generated content or generation config before save (admin-only) */
export async function validateGeneratedContentAction(
  contentType: ValidateContentType,
  data: unknown,
  configContentType?: "question" | "study_guide" | "flashcard_deck" | "high_yield_summary"
): Promise<{ success: boolean; valid?: boolean; errors?: string[]; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  if (contentType === "generation_config") {
    const validation = validateGenerationConfig(
      data as GenerationConfig,
      configContentType ?? "question"
    );
    return {
      success: true,
      valid: validation.success,
      errors: validation.errors,
    };
  }

  if (contentType === "question") {
    const d = data as { stem: string; options: { key: string; text: string; isCorrect: boolean }[] };
    const validation = validateQuestionDraft(d);
    return { success: true, valid: validation.success, errors: validation.errors };
  }
  if (contentType === "study_section") {
    const d = data as { title: string; contentMarkdown: string };
    const validation = validateStudySectionDraft(d);
    return { success: true, valid: validation.success, errors: validation.errors };
  }
  if (contentType === "flashcard") {
    const d = data as { frontText: string; backText: string };
    const validation = validateFlashcardDraft(d);
    return { success: true, valid: validation.success, errors: validation.errors };
  }
  if (contentType === "high_yield") {
    const d = data as { title: string; explanation: string };
    const validation = validateHighYieldDraft(d);
    return { success: true, valid: validation.success, errors: validation.errors };
  }

  return { success: false, error: "Unknown content type" };
}

export interface AIGenerationHistoryFilters {
  trackSlug?: string;
  contentType?: string;
  createdBy?: string;
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
}

export interface AIGenerationHistoryCounts {
  total: number;
  saved: number;
  discarded: number;
  pending: number;
}

export interface AIGenerationHistoryResult {
  entries: Awaited<ReturnType<typeof loadAIGenerationHistory>>;
  counts: AIGenerationHistoryCounts;
}

/** Load AI generation audit history with optional filters and counts */
export async function loadAIGenerationHistory(
  limit = 50,
  filters?: AIGenerationHistoryFilters
): Promise<{
  id: string;
  contentType: string;
  contentId: string | null;
  generationParams: Record<string, unknown>;
  modelUsed: string;
  generatedAt: string;
  createdBy: string | null;
  outcome: string | null;
}[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("ai_generation_audit")
      .select("id, content_type, content_id, generation_params, model_used, generated_at, created_by, outcome");

    if (filters?.trackSlug) {
      query = query.filter("generation_params->>track", "eq", filters.trackSlug);
    }
    if (filters?.contentType) {
      query = query.eq("content_type", filters.contentType);
    }
    if (filters?.createdBy) {
      query = query.eq("created_by", filters.createdBy);
    }
    if (filters?.dateFrom) {
      query = query.gte("generated_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("generated_at", `${filters.dateTo}T23:59:59.999Z`);
    }

    const { data } = await query.order("generated_at", { ascending: false }).limit(limit);

    return (data ?? []).map((r) => ({
      id: r.id,
      contentType: r.content_type,
      contentId: r.content_id,
      generationParams: (r.generation_params ?? {}) as Record<string, unknown>,
      modelUsed: r.model_used,
      generatedAt: r.generated_at,
      createdBy: r.created_by,
      outcome: r.outcome ?? null,
    }));
  } catch {
    return [];
  }
}

/** Load AI generation counts (generated/saved/discarded) with optional filters */
export async function loadAIGenerationCounts(
  filters?: AIGenerationHistoryFilters
): Promise<AIGenerationHistoryCounts> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { total: 0, saved: 0, discarded: 0, pending: 0 };
  if (!isSupabaseServiceRoleConfigured()) {
    return { total: 0, saved: 0, discarded: 0, pending: 0 };
  }
  try {
    const supabase = createServiceClient();
    let query = supabase.from("ai_generation_audit").select("outcome");

    if (filters?.trackSlug) {
      query = query.filter("generation_params->>track", "eq", filters.trackSlug);
    }
    if (filters?.contentType) {
      query = query.eq("content_type", filters.contentType);
    }
    if (filters?.createdBy) {
      query = query.eq("created_by", filters.createdBy);
    }
    if (filters?.dateFrom) {
      query = query.gte("generated_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("generated_at", `${filters.dateTo}T23:59:59.999Z`);
    }

    const { data: rows } = await query.limit(10000);
    const list = rows ?? [];
    return {
      total: list.length,
      saved: list.filter((r) => r.outcome === "saved").length,
      discarded: list.filter((r) => r.outcome === "discarded").length,
      pending: list.filter((r) => r.outcome === "pending" || r.outcome == null).length,
    };
  } catch {
    return { total: 0, saved: 0, discarded: 0, pending: 0 };
  }
}

/** Load distinct admin users who have created AI generations (for filter dropdown) */
export async function loadAIGenerationHistoryUsers(): Promise<
  { id: string; email: string | null; fullName: string | null }[]
> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];
  try {
    const supabase = createServiceClient();
    const { data: auditRows } = await supabase
      .from("ai_generation_audit")
      .select("created_by")
      .not("created_by", "is", null);
    const userIds = [...new Set((auditRows ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
    if (userIds.length === 0) return [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? null,
      fullName: p.full_name ?? null,
    }));
  } catch {
    return [];
  }
}
