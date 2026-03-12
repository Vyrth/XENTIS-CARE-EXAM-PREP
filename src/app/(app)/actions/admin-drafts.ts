"use server";

import {
  generateQuestionDraft,
  generateDistractorRationaleDraft,
  generateStudySectionDraft,
  generateFlashcardDraft,
  generateMnemonicDraft,
  generateHighYieldSummaryDraft,
} from "@/lib/ai/admin-drafts";
import type { AdminDraftParams } from "@/lib/ai/admin-drafts";
import { getSessionUser } from "@/lib/auth/session";

export type AdminDraftType =
  | "question"
  | "distractor_rationale"
  | "study_section"
  | "flashcard"
  | "mnemonic"
  | "high_yield_summary";

export interface GenerateDraftInput {
  type: AdminDraftType;
  params: AdminDraftParams;
  /** For distractor_rationale and mnemonic */
  optionText?: string;
  correctOptionText?: string;
  stem?: string;
  conceptOrText?: string;
}

export interface GenerateDraftResult {
  success: boolean;
  output?: unknown;
  error?: string;
  auditId?: string;
}

/** Generate AI draft - admin only. All output is draft, never auto-published. */
export async function generateAdminDraft(
  input: GenerateDraftInput
): Promise<GenerateDraftResult> {
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  const params = input.params;
  if (!params.track || !params.trackId) {
    return { success: false, error: "Track is required" };
  }

  switch (input.type) {
    case "question": {
      const r = await generateQuestionDraft(params, userId);
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    case "distractor_rationale": {
      if (!input.optionText || !input.correctOptionText || !input.stem) {
        return { success: false, error: "optionText, correctOptionText, and stem required" };
      }
      const r = await generateDistractorRationaleDraft(
        params,
        input.optionText,
        input.correctOptionText,
        input.stem,
        userId
      );
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    case "study_section": {
      const r = await generateStudySectionDraft(params, userId);
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    case "flashcard": {
      const r = await generateFlashcardDraft(params, userId);
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    case "mnemonic": {
      if (!input.conceptOrText?.trim()) {
        return { success: false, error: "conceptOrText is required" };
      }
      const r = await generateMnemonicDraft(params, input.conceptOrText, userId);
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    case "high_yield_summary": {
      const r = await generateHighYieldSummaryDraft(params, userId);
      return {
        success: r.success,
        output: r.output,
        error: r.error,
        auditId: r.auditId,
      };
    }
    default:
      return { success: false, error: "Unknown draft type" };
  }
}
