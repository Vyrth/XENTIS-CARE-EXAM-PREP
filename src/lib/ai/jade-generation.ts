/**
 * Jade Tutor - Centralized Generation Services
 *
 * All generators require:
 * - examTrackId (UUID)
 * - examTrackSlug (lvn|rn|fnp|pmhnp)
 * - content scope (topic/system where relevant)
 * - objective / focus prompt
 * - difficulty when relevant
 *
 * Track isolation enforced: RN ≠ FNP ≠ PMHNP ≠ LVN.
 */

import { generateContent } from "./content-factory/orchestrator";
import { toContentFactoryRequest } from "./content-factory/adapter";
import {
  validateQuestionOutput,
  validateStudyGuideOutput,
  validateStudyGuideSectionPackOutput,
  validateFlashcardDeckOutput,
  validateHighYieldOutput,
} from "./jade-validation";
import { callJade } from "./jade-client";
import { buildTutorExplanationPrompt } from "./jade-prompts";
import type { GenerationConfig } from "./factory/types";
import type {
  ContentMode,
  QuestionOutput,
  StudyGuideOutput,
  StudyGuideSectionPackOutput,
  FlashcardDeckOutput,
  HighYieldSummaryOutput,
  CommonConfusionOutput,
  BoardTrapOutput,
  CompareContrastOutput,
} from "./content-factory/types";
import type { ExamTrack } from "./jade-client";

export type { ExamTrack };

/** Required scope for all generators */
export interface JadeGenerationScope {
  examTrackId: string;
  examTrackSlug: ExamTrack;
  /** System name (e.g., Cardiovascular) */
  systemName?: string;
  /** Topic name (e.g., Heart Failure) */
  topicName?: string;
  /** Domain name when relevant */
  domainName?: string;
  /** Learning objective or focus area */
  objective: string;
  /** 1-5 difficulty when relevant */
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface JadeGenerationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: string[];
}

/** Build GenerationConfig from scope */
function scopeToConfig(scope: JadeGenerationScope): GenerationConfig {
  return {
    trackId: scope.examTrackId,
    trackSlug: scope.examTrackSlug,
    systemName: scope.systemName,
    topicName: scope.topicName,
    domainName: scope.domainName,
    objective: scope.objective,
    targetDifficulty: scope.difficulty,
    saveStatus: "draft",
  };
}

/** Generate board-style question draft */
export async function generateBoardStyleQuestionDraft(
  scope: JadeGenerationScope,
  options?: {
    itemTypeSlug?: string;
    boardFocus?: string;
  }
): Promise<JadeGenerationResult<QuestionOutput>> {
  const config = scopeToConfig(scope);
  config.itemTypeSlug = options?.itemTypeSlug ?? "single_best_answer";
  config.boardFocus = options?.boardFocus ?? scope.objective;

  const req = toContentFactoryRequest(config, "question");
  const result = await generateContent(req);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const raw = result.rawContent ?? "";
  const validation = validateQuestionOutput(raw);
  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: validation.errors,
    };
  }

  const data = result.output?.mode === "question" ? result.output.data : validation.data;
  return { success: true, data: data as QuestionOutput };
}

/** Generate study guide draft (full or section pack) */
export async function generateStudyGuideDraft(
  scope: JadeGenerationScope,
  options?: {
    mode?: "full" | "section_pack";
    sectionCount?: number;
    boardFocus?: string;
  }
): Promise<JadeGenerationResult<StudyGuideOutput | StudyGuideSectionPackOutput>> {
  const config = scopeToConfig(scope);
  config.studyGuideMode = options?.mode ?? "section_pack";
  config.sectionCount = options?.sectionCount ?? 4;
  config.boardFocus = options?.boardFocus ?? scope.objective;

  const contentMode: ContentMode =
    options?.mode === "full" ? "study_guide" : "study_guide_section_pack";
  const req = toContentFactoryRequest(config, contentMode, {
    sectionCount: config.sectionCount,
  });

  const result = await generateContent(req);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const raw = result.rawContent ?? "";
  const validation =
    contentMode === "study_guide"
      ? validateStudyGuideOutput(raw)
      : validateStudyGuideSectionPackOutput(raw);

  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: validation.errors,
    };
  }

  const data = result.output?.data ?? validation.data;
  return { success: true, data: data as StudyGuideOutput | StudyGuideSectionPackOutput };
}

/** Generate flashcard deck draft */
export async function generateFlashcardDeckDraft(
  scope: JadeGenerationScope,
  options?: {
    cardCount?: number;
    deckMode?: "rapid_recall" | "high_yield_clinical";
    sourceText?: string;
  }
): Promise<JadeGenerationResult<FlashcardDeckOutput>> {
  const config = scopeToConfig(scope);
  config.cardCount = options?.cardCount ?? 15;
  config.flashcardDeckMode = options?.deckMode ?? "rapid_recall";
  config.sourceText = options?.sourceText;

  const req = toContentFactoryRequest(config, "flashcard_deck", {
    quantity: config.cardCount,
  });

  const result = await generateContent(req);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const raw = result.rawContent ?? "";
  const validation = validateFlashcardDeckOutput(raw);

  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: validation.errors,
    };
  }

  const data = result.output?.mode === "flashcard_deck" ? result.output.data : validation.data;
  return { success: true, data: data as FlashcardDeckOutput };
}

/** Generate high-yield draft */
export async function generateHighYieldDraft(
  scope: JadeGenerationScope,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary"
): Promise<
  JadeGenerationResult<
    HighYieldSummaryOutput | CommonConfusionOutput | BoardTrapOutput | CompareContrastOutput
  >
> {
  const config = scopeToConfig(scope);
  config.highYieldType = contentType;

  const contentMode: ContentMode =
    contentType === "compare_contrast_summary"
      ? "compare_contrast"
      : (contentType as "high_yield_summary" | "common_confusion" | "board_trap");

  const req = toContentFactoryRequest(config, contentMode, {});

  const result = await generateContent(req);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const raw = result.rawContent ?? "";
  const validation = validateHighYieldOutput(raw, contentType);

  if (!validation.valid) {
    return {
      success: false,
      error: "Validation failed",
      validationErrors: validation.errors,
    };
  }

  const data = result.output?.data ?? validation.data;
  return { success: true, data: data as HighYieldSummaryOutput };
}

/** Generate tutor explanation */
export async function generateTutorExplanation(
  scope: { examTrackSlug: ExamTrack },
  options: {
    selectedText: string;
    topicName?: string;
    systemName?: string;
    mode?: "explain_simple" | "board_focus" | "deep_dive" | "mnemonic";
  }
): Promise<
  JadeGenerationResult<{
    simpleExplanation: string;
    boardTip: string;
    memoryTrick: string;
    suggestedNextStep: string;
  }>
> {
  const { system, user } = buildTutorExplanationPrompt(scope.examTrackSlug, {
    selectedText: options.selectedText,
    topicName: options.topicName,
    systemName: options.systemName,
    mode: options.mode,
  });

  const result = await callJade({
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 1024,
    temperature: 0.5,
  });

  if (!result.success || !result.content) {
    return { success: false, error: result.error ?? "Empty response" };
  }

  try {
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    const errors: string[] = [];
    if (!String(parsed.simpleExplanation ?? "").trim()) errors.push("simpleExplanation is required");
    if (!String(parsed.boardTip ?? "").trim()) errors.push("boardTip is required");
    if (!String(parsed.memoryTrick ?? "").trim()) errors.push("memoryTrick is required");
    if (!String(parsed.suggestedNextStep ?? "").trim()) errors.push("suggestedNextStep is required");

    if (errors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        validationErrors: errors,
      };
    }

    return {
      success: true,
      data: {
        simpleExplanation: String(parsed.simpleExplanation).trim(),
        boardTip: String(parsed.boardTip).trim(),
        memoryTrick: String(parsed.memoryTrick).trim(),
        suggestedNextStep: String(parsed.suggestedNextStep).trim(),
      },
    };
  } catch (e) {
    return {
      success: false,
      error: `Parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
