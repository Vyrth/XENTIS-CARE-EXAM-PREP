/**
 * Text similarity utilities for duplicate detection.
 * Uses word-overlap heuristics (no external embeddings).
 */

/** Normalize text for comparison: lowercase, trim, collapse whitespace, remove punctuation */
export function normalizeForComparison(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/** Tokenize into words (split on whitespace, filter empty) */
export function tokenize(text: string): string[] {
  const normalized = normalizeForComparison(text);
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0–1. */
export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Overlap coefficient: |A ∩ B| / min(|A|, |B|). Good for short texts. */
export function overlapCoefficient(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const minSize = Math.min(setA.size, setB.size);
  return minSize > 0 ? intersection / minSize : 0;
}

/** Check if two texts are likely duplicates (identical or slightly reworded). */
export function isLikelyDuplicate(a: string, b: string, threshold = 0.85): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (normA === normB) return true;
  return jaccardSimilarity(a, b) >= threshold || overlapCoefficient(a, b) >= threshold;
}
