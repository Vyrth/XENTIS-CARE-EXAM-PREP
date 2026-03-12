/**
 * Flashcard Factory - payload validation before save.
 */

import type { FlashcardDeckPayload, FlashcardPayload } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFlashcardDeckPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = payload as Record<string, unknown>;

  if (!p.name || typeof p.name !== "string") {
    errors.push("name is required");
  } else if (p.name.trim().length < 2) {
    errors.push("name must be at least 2 characters");
  }

  if (!Array.isArray(p.cards)) {
    errors.push("cards must be an array");
  } else {
    if (p.cards.length < 3) errors.push("At least 3 cards required");
    for (let i = 0; i < p.cards.length; i++) {
      const c = p.cards[i];
      if (!c || typeof c !== "object") {
        errors.push(`Card ${i + 1}: must be an object`);
      } else {
        const card = c as FlashcardPayload;
        if (!card.frontText?.trim()) errors.push(`Card ${i + 1}: frontText required`);
        if (!card.backText?.trim()) errors.push(`Card ${i + 1}: backText required`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
