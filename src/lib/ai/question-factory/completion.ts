/**
 * Question Factory - ensure AI-generated question package is schema-complete before persistence.
 * Fills missing distractor rationales and pads to 4 options for SBA so manual entry is not required.
 */

const SBA_OPTION_KEYS = ["A", "B", "C", "D"] as const;
const DISTRACTOR_PLACEHOLDER_SHORT = "Incorrect.";
const DISTRACTOR_PLACEHOLDER_FROM_RATIONALE = "Incorrect—see rationale.";

export type CompletionPayload = {
  itemType?: string;
  options: { key?: string; text?: string; isCorrect?: boolean; distractorRationale?: string }[];
  rationale?: string;
};

/**
 * Fill missing distractor rationale for each wrong option with a minimal acceptable placeholder.
 * Uses main rationale when available for a slightly more informative fallback.
 */
export function ensureDistractorRationales(payload: CompletionPayload): void {
  const rationale = (payload.rationale ?? "").trim();
  const fallback =
    rationale.length >= 20 ? DISTRACTOR_PLACEHOLDER_FROM_RATIONALE : DISTRACTOR_PLACEHOLDER_SHORT;
  for (const o of payload.options ?? []) {
    if (o && !o.isCorrect && (!o.distractorRationale || !o.distractorRationale.trim())) {
      (o as { distractorRationale?: string }).distractorRationale = fallback;
    }
  }
}

/**
 * For single_best_answer, ensure exactly 4 options (pad with placeholders if needed).
 * Does not change correct count; only appends options up to 4.
 */
export function ensureFourOptionsForSBA(payload: CompletionPayload): void {
  const itemType = (payload.itemType ?? "single_best_answer").toLowerCase();
  if (itemType !== "single_best_answer") return;

  const options = payload.options ?? [];
  if (options.length >= 4) return;

  const usedKeys = new Set(options.map((o) => (o.key ?? "").trim().toUpperCase()).filter(Boolean));
  const rationale = (payload.rationale ?? "").trim();
  const distractorFallback =
    rationale.length >= 20 ? DISTRACTOR_PLACEHOLDER_FROM_RATIONALE : DISTRACTOR_PLACEHOLDER_SHORT;

  for (const key of SBA_OPTION_KEYS) {
    if (usedKeys.has(key)) continue;
    options.push({
      key,
      text: "See rationale.",
      isCorrect: false,
      distractorRationale: distractorFallback,
    });
    usedKeys.add(key);
    if (options.length >= 4) break;
  }
}

/**
 * Make payload schema-complete: 4 options for SBA and distractor rationale for every wrong option.
 * Mutates payload in place. Run before validation so persistence never requires manual completion.
 */
export function ensureQuestionPackageComplete(payload: CompletionPayload): void {
  ensureFourOptionsForSBA(payload);
  ensureDistractorRationales(payload);
}
