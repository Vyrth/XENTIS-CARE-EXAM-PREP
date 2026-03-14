/**
 * Production Dedupe - Normalization and Hashing
 *
 * Content-specific normalization for stable hashing across AI-generated content.
 * Used before save to check content_dedupe_registry and prevent duplicates.
 */

/** Prefix length for secondary hash (first N chars normalized) */
const SECONDARY_PREFIX_LEN = 120;

/** Base normalize: lowercase, trim, collapse whitespace, remove punctuation */
function baseNormalize(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/** Simple hash for dedupe (non-crypto, fast) */
function hashString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return Math.abs(h).toString(36);
}

// -----------------------------------------------------------------------------
// Content-specific normalization
// -----------------------------------------------------------------------------

/** Normalize question stem for hash: strip lead-in/instructions artifacts, base normalize */
export function normalizeQuestionStemForHash(stem: string): string {
  const s = stem.trim();
  if (!s) return "";
  return baseNormalize(s);
}

/** Normalize study guide title for hash */
export function normalizeGuideTitleForHash(title: string): string {
  return baseNormalize(title);
}

/** Normalize flashcard front text for hash */
export function normalizeFlashcardFrontForHash(frontText: string): string {
  return baseNormalize(frontText);
}

/** Normalize high-yield title for hash */
export function normalizeHighYieldTitleForHash(title: string): string {
  return baseNormalize(title);
}

// -----------------------------------------------------------------------------
// Hashing helpers
// -----------------------------------------------------------------------------

/** Create normalized hash from pre-normalized text */
export function createNormalizedHash(normalizedText: string): string {
  return hashString(normalizedText || "");
}

/** Create secondary hash from first 100–150 chars normalized (for near-duplicate detection) */
export function createSecondaryHash(text: string, prefixLen = SECONDARY_PREFIX_LEN): string {
  const s = baseNormalize(text);
  const prefix = s.slice(0, prefixLen);
  return hashString(prefix);
}

/** Convenience: create hash from raw stem (questions) */
export function hashQuestionStem(stem: string): { normalized: string; hash: string; secondaryHash: string } {
  const normalized = normalizeQuestionStemForHash(stem);
  return {
    normalized,
    hash: createNormalizedHash(normalized),
    secondaryHash: createSecondaryHash(stem),
  };
}

/** Convenience: create hash from raw guide title */
export function hashGuideTitle(title: string): { normalized: string; hash: string } {
  const normalized = normalizeGuideTitleForHash(title);
  return { normalized, hash: createNormalizedHash(normalized) };
}

/** Convenience: create hash from raw flashcard front */
export function hashFlashcardFront(frontText: string): { normalized: string; hash: string } {
  const normalized = normalizeFlashcardFrontForHash(frontText);
  return { normalized, hash: createNormalizedHash(normalized) };
}

/** Convenience: create hash from raw high-yield title */
export function hashHighYieldTitle(title: string): { normalized: string; hash: string; secondaryHash: string } {
  const normalized = normalizeHighYieldTitleForHash(title);
  return {
    normalized,
    hash: createNormalizedHash(normalized),
    secondaryHash: createSecondaryHash(title),
  };
}

/** Normalize question payload for hash: stem + leadIn + options text + rationale */
function normalizeQuestionPayloadForHash(payload: {
  stem?: string;
  leadIn?: string;
  options?: { key?: string; text?: string }[];
  rationale?: string;
}): string {
  const parts: string[] = [];
  if (payload.stem?.trim()) parts.push(baseNormalize(payload.stem));
  if (payload.leadIn?.trim()) parts.push(baseNormalize(payload.leadIn));
  if (Array.isArray(payload.options)) {
    for (const o of payload.options) {
      if (o?.text?.trim()) parts.push(baseNormalize(o.text));
    }
  }
  if (payload.rationale?.trim()) parts.push(baseNormalize(payload.rationale));
  return parts.join(" ");
}

/** Create normalized content hash from full question payload (stem + options + rationale). */
export function hashQuestionPayload(payload: {
  stem?: string;
  leadIn?: string;
  options?: { key?: string; text?: string }[];
  rationale?: string;
}): { normalized: string; hash: string } {
  const normalized = normalizeQuestionPayloadForHash(payload);
  return {
    normalized,
    hash: createNormalizedHash(normalized),
  };
}
