/**
 * Study Guide Factory - JSON parsing for AI-generated study guide output.
 */

import type { StudyGuidePayload, StudyGuideSectionPayload, StudyGuideSectionPackPayload } from "./types";

function extractJson<T = unknown>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

function normalizeSection(s: unknown): StudyGuideSectionPayload | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  const title = obj.title ? String(obj.title).trim() : "";
  const contentMarkdown = obj.contentMarkdown ? String(obj.contentMarkdown).trim() : "";
  if (!title || !contentMarkdown) return null;

  const slug = obj.slug ? String(obj.slug).trim() : undefined;
  const plainExplanation = obj.plainExplanation ? String(obj.plainExplanation).trim() : undefined;
  const keyTakeaways = Array.isArray(obj.keyTakeaways)
    ? obj.keyTakeaways.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const commonTraps = Array.isArray(obj.commonTraps)
    ? obj.commonTraps.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const quickReviewBullets = Array.isArray(obj.quickReviewBullets)
    ? obj.quickReviewBullets.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const mnemonics = Array.isArray(obj.mnemonics)
    ? obj.mnemonics.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const highYield = obj.highYield === true;

  const result: StudyGuideSectionPayload = {
    title,
    contentMarkdown,
    highYield: highYield || undefined,
  };
  if (slug) result.slug = slug;
  if (plainExplanation) result.plainExplanation = plainExplanation;
  if (keyTakeaways?.length) result.keyTakeaways = keyTakeaways;
  if (commonTraps?.length) result.commonTraps = commonTraps;
  if (quickReviewBullets?.length) result.quickReviewBullets = quickReviewBullets;
  if (mnemonics?.length) result.mnemonics = mnemonics;

  return result;
}

export function parseStudyGuideOutput(raw: string): StudyGuidePayload | null {
  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed?.title || !parsed?.description || !Array.isArray(parsed.sections)) return null;

  const sections = parsed.sections
    .map(normalizeSection)
    .filter((s): s is StudyGuideSectionPayload => s != null);
  if (sections.length < 1) return null;

  return {
    title: String(parsed.title).trim(),
    slugSuggestion: parsed.slugSuggestion ? String(parsed.slugSuggestion).trim() : undefined,
    description: String(parsed.description).trim(),
    boardFocus: parsed.boardFocus ? String(parsed.boardFocus).trim() : undefined,
    sections,
  };
}

export function parseStudyGuideSectionPackOutput(raw: string): StudyGuideSectionPackPayload | null {
  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!Array.isArray(parsed?.sections)) return null;

  const sections = parsed.sections
    .map(normalizeSection)
    .filter((s): s is StudyGuideSectionPayload => s != null);
  if (sections.length < 1) return null;

  return { sections };
}
