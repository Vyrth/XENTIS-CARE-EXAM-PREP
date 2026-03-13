/**
 * AI Content Factory - shared validation layer.
 * Ensures required fields before generation and persistence.
 * Canonical: only trackId (exam_tracks.id UUID) is required; slug is derived.
 */

import type { GenerationConfig, ContentType } from "./types";
import { resolveConfigTrack } from "./resolve-track";
import type { TrackOption } from "./resolve-track";
import { CANONICAL_QUESTION_TYPES } from "./question-type-resolver";

export function validateGenerationConfig(
  config: GenerationConfig,
  contentType: ContentType,
  tracks?: TrackOption[]
): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Canonical check: only selectedTrackId (exam_tracks.id UUID) matters. Resolve via tracks if provided.
  if (tracks?.length) {
    const resolved = resolveConfigTrack(config, tracks);
    if (!resolved) {
      errors.push(
        config.trackId?.trim()
          ? "Selected track could not be resolved"
          : "Select a track"
      );
      return { success: false, errors };
    }
  } else {
    if (!config.trackId?.trim()) {
      errors.push("Select a track");
      return { success: false, errors };
    }
  }

  if (config.targetDifficulty != null) {
    if (config.targetDifficulty < 1 || config.targetDifficulty > 5) {
      errors.push("Difficulty must be 1–5");
    }
  }

  if (config.batchCount != null && config.batchCount > 0) {
    if (config.batchCount < 1) {
      errors.push("Batch count must be at least 1");
    }
  }

  if (config.saveStatus && !["draft", "editor_review"].includes(config.saveStatus)) {
    errors.push("Save status must be draft or editor_review");
  }

  if (contentType === "question") {
    const slug = (config.itemTypeSlug ?? "single_best_answer").trim().toLowerCase();
    if (!CANONICAL_QUESTION_TYPES.some((t) => t.slug === slug)) {
      errors.push(`Question type "${config.itemTypeSlug}" is not supported`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export function validateQuestionDraft(data: {
  stem: string;
  options: { key: string; text: string; isCorrect: boolean }[];
}): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.stem?.trim()) errors.push("Stem is required");
  if (!data.options?.length || data.options.length < 2) errors.push("At least 2 options required");
  const hasCorrect = data.options?.some((o) => o.isCorrect);
  if (!hasCorrect) errors.push("At least one option must be correct");
  return { success: errors.length === 0, errors };
}

export function validateStudySectionDraft(data: {
  title: string;
  contentMarkdown: string;
}): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.contentMarkdown?.trim()) errors.push("Content is required");
  return { success: errors.length === 0, errors };
}

export function validateFlashcardDraft(data: {
  frontText: string;
  backText: string;
}): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.frontText?.trim()) errors.push("Front text is required");
  if (!data.backText?.trim()) errors.push("Back text is required");
  return { success: errors.length === 0, errors };
}

export function validateHighYieldDraft(data: {
  title: string;
  explanation: string;
}): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.explanation?.trim()) errors.push("Explanation is required");
  return { success: errors.length === 0, errors };
}
