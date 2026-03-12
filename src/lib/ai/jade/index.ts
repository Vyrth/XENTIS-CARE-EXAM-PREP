/**
 * Jade Tutor - Centralized AI Generation Services
 *
 * Usage:
 *   import {
 *     generateBoardStyleQuestionDraft,
 *     generateStudyGuideDraft,
 *     generateFlashcardDeckDraft,
 *     generateHighYieldDraft,
 *     generateTutorExplanation,
 *   } from "@/lib/ai/jade";
 */

export {
  generateBoardStyleQuestionDraft,
  generateStudyGuideDraft,
  generateFlashcardDeckDraft,
  generateHighYieldDraft,
  generateTutorExplanation,
} from "../jade-generation";
export type { JadeGenerationScope, JadeGenerationResult, ExamTrack } from "../jade-generation";

export { callJade, isJadeConfigured } from "../jade-client";
export type { JadeCompletionRequest, JadeCompletionResult } from "../jade-client";

export {
  getPromptForContentMode,
  buildTutorExplanationPrompt,
  TRACK_BEHAVIOR,
} from "../jade-prompts";

export {
  validateQuestionOutput,
  validateStudyGuideOutput,
  validateStudyGuideSectionPackOutput,
  validateFlashcardDeckOutput,
  validateHighYieldOutput,
  safeParseByMode,
} from "../jade-validation";
export type { ValidationResult, ValidationSuccess, ValidationFailure } from "../jade-validation";
