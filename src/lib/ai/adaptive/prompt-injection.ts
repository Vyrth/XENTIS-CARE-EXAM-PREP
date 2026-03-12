/**
 * Prompt injection layer for adaptive AI behavior.
 * Injects learner-specific instructions into system and user prompts.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";

/** Inject adaptive instructions into system prompt */
export function injectAdaptiveSystemPrompt(
  baseSystemPrompt: string,
  adaptive: AdaptiveContextOutput | null
): string {
  if (!adaptive?.promptInstructions?.trim()) return baseSystemPrompt;
  return `${baseSystemPrompt}

Adaptive guidance for this learner:
${adaptive.promptInstructions}`;
}

/** Inject adaptive context into user prompt (before or after main content) */
export function injectAdaptiveUserContext(
  baseUserPrompt: string,
  adaptive: AdaptiveContextOutput | null,
  options?: { position?: "before" | "after" }
): string {
  if (!adaptive?.contextString?.trim()) return baseUserPrompt;
  const block = `
Learner context (use to personalize your response):
---
${adaptive.contextString}
---`;
  const position = options?.position ?? "before";
  if (position === "before") {
    return block + "\n\n" + baseUserPrompt;
  }
  return baseUserPrompt + "\n\n" + block;
}

/** Append readiness-aware next-step instruction to user prompt */
export function appendAdaptiveNextStepInstruction(
  basePrompt: string,
  adaptive: AdaptiveContextOutput | null
): string {
  if (!adaptive?.remediationSuggestions?.length) return basePrompt;

  const suggestions = adaptive.remediationSuggestions.slice(0, 3).join("; ");
  return `${basePrompt}

When suggesting next steps, consider these remediation priorities: ${suggestions}. Tailor your suggestedNextStep to the learner's weak areas when relevant.`;
}
