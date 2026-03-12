/**
 * AI Content Factory - track-specific generation presets.
 * Fast workflows optimized for each board track.
 */

import type { ExamTrackSlug, GenerationConfig } from "./types";

export type PresetContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "high_yield_summary"
  | "common_confusion"
  | "board_trap"
  | "compare_contrast_summary";

/** Tab key for routing when preset is applied */
export type PresetTab = "questions" | "study-guides" | "flashcards" | "high-yield";

/** Difficulty mix: map difficulty level (1-5) to relative weight for batch generation */
export type DifficultyMix = Partial<Record<1 | 2 | 3 | 4 | 5, number>>;

export interface GenerationPreset {
  id: string;
  name: string;
  description: string;
  trackSlug: ExamTrackSlug;
  contentType: PresetContentType;
  tab: PresetTab;
  /** Suggested system slugs (resolved to IDs at runtime) */
  systemSlugs: string[];
  /** Optional topic slugs for narrower focus */
  topicSlugs?: string[];
  /** Difficulty mix for questions (e.g. { 2: 2, 3: 5, 4: 3 } = mostly 3, some 2 and 4) */
  difficultyMix?: DifficultyMix;
  /** Default count: questions per batch, cards per deck, high-yield items */
  defaultCount: number;
  /** Prompt style emphasis passed to AI (e.g. "NCLEX prioritization, safety") */
  promptStyleEmphasis: string;
  /** For study guides: full or section_pack */
  studyGuideMode?: "full" | "section_pack";
  /** For flashcards: rapid_recall or high_yield_clinical */
  flashcardDeckMode?: "rapid_recall" | "high_yield_clinical";
  /** For high-yield: which subtype when contentType is high_yield_summary */
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
  /** Board focus for study guides */
  boardFocus?: string;
  /** Section count for study guide section pack (2-8) */
  sectionCount?: number;
  /** Item type for questions */
  itemTypeSlug?: string;
}

export const GENERATION_PRESETS: GenerationPreset[] = [
  {
    id: "rn-question-pack",
    name: "RN Question Pack",
    description: "NCLEX-style questions across core systems",
    trackSlug: "rn",
    contentType: "question",
    tab: "questions",
    systemSlugs: ["cardiovascular", "respiratory", "renal", "psychiatric"],
    difficultyMix: { 2: 2, 3: 5, 4: 3 },
    defaultCount: 10,
    promptStyleEmphasis: "NCLEX prioritization, safety, delegation",
    itemTypeSlug: "single_best_answer",
  },
  {
    id: "fnp-primary-care-pack",
    name: "FNP Primary Care Pack",
    description: "Primary care management and differential diagnosis",
    trackSlug: "fnp",
    contentType: "question",
    tab: "questions",
    systemSlugs: ["cardiovascular", "respiratory", "psychiatric"],
    difficultyMix: { 2: 2, 3: 4, 4: 4 },
    defaultCount: 10,
    promptStyleEmphasis: "Primary care management, differential diagnosis, evidence-based guidelines",
    itemTypeSlug: "single_best_answer",
  },
  {
    id: "pmhnp-psychopharm-pack",
    name: "PMHNP Psychopharm Pack",
    description: "Psychopharmacology, dosing, contraindications",
    trackSlug: "pmhnp",
    contentType: "question",
    tab: "questions",
    systemSlugs: ["psychiatric", "neurological"],
    difficultyMix: { 2: 1, 3: 4, 4: 4, 5: 1 },
    defaultCount: 10,
    promptStyleEmphasis: "Psychopharmacology, dosing, contraindications, drug interactions",
    itemTypeSlug: "single_best_answer",
  },
  {
    id: "lvn-fundamentals-pack",
    name: "LVN Fundamentals Pack",
    description: "Basic nursing care, ADLs, safety",
    trackSlug: "lvn",
    contentType: "question",
    tab: "questions",
    systemSlugs: ["cardiovascular", "respiratory", "renal"],
    difficultyMix: { 1: 2, 2: 4, 3: 4 },
    defaultCount: 10,
    promptStyleEmphasis: "Basic nursing care, ADLs, safety, fundamentals",
    itemTypeSlug: "single_best_answer",
  },
  {
    id: "rn-high-yield-pack",
    name: "RN High-Yield Pack",
    description: "High-yield summaries across core systems",
    trackSlug: "rn",
    contentType: "high_yield_summary",
    tab: "high-yield",
    systemSlugs: ["cardiovascular", "respiratory", "renal", "psychiatric"],
    defaultCount: 5,
    promptStyleEmphasis: "High-yield NCLEX topics, testable concepts",
    highYieldType: "high_yield_summary",
  },
  {
    id: "fnp-rapid-review-pack",
    name: "FNP Rapid Review Pack",
    description: "Concise section pack for quick review",
    trackSlug: "fnp",
    contentType: "study_guide",
    tab: "study-guides",
    systemSlugs: ["cardiovascular", "respiratory", "psychiatric"],
    defaultCount: 4,
    promptStyleEmphasis: "Rapid review, concise, key points only",
    studyGuideMode: "section_pack",
    sectionCount: 4,
    boardFocus: "Primary care board prep",
  },
  {
    id: "pmhnp-therapy-diagnosis-pack",
    name: "PMHNP Therapy + Diagnosis Pack",
    description: "Psychotherapy modalities, DSM-5, compare/contrast",
    trackSlug: "pmhnp",
    contentType: "compare_contrast_summary",
    tab: "high-yield",
    systemSlugs: ["psychiatric", "neurological"],
    defaultCount: 5,
    promptStyleEmphasis: "Psychotherapy modalities, DSM-5 criteria, differential diagnosis",
    highYieldType: "compare_contrast_summary",
  },
  {
    id: "lvn-flashcard-pack",
    name: "LVN Flashcard Pack",
    description: "Rapid recall key terms for fundamentals",
    trackSlug: "lvn",
    contentType: "flashcard_deck",
    tab: "flashcards",
    systemSlugs: ["cardiovascular", "respiratory", "renal"],
    difficultyMix: { 1: 2, 2: 3, 3: 2 },
    defaultCount: 15,
    promptStyleEmphasis: "Rapid recall, key terms, fundamentals",
    flashcardDeckMode: "rapid_recall",
  },
];

/** Resolve preset to partial GenerationConfig using taxonomy data */
export function applyPresetToConfig(
  preset: GenerationPreset,
  data: {
    tracks: { id: string; slug: string; name: string }[];
    systems: { id: string; slug: string; name: string; examTrackId: string }[];
    topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  }
): Partial<GenerationConfig> {
  const track =
    data.tracks.find((t) => t.slug?.toLowerCase() === preset.trackSlug?.toLowerCase()) ??
    data.tracks.find((t) => t.id === preset.trackSlug);
  if (!track) throw new Error(`Track ${preset.trackSlug} not found`);

  const trackSystems = data.systems.filter((s) => s.examTrackId === track.id);
  const firstSystemSlug = preset.systemSlugs[0];
  const system = firstSystemSlug
    ? trackSystems.find((s) => s.slug === firstSystemSlug)
    : undefined;

  const trackSystemIds = new Set(trackSystems.map((s) => s.id));
  const topic = preset.topicSlugs?.[0]
    ? data.topics.find(
        (t) =>
          t.slug === preset.topicSlugs![0] &&
          (!t.systemIds?.length || t.systemIds.some((sid) => trackSystemIds.has(sid)))
      )
    : undefined;

  const config: Partial<GenerationConfig> = {
    trackId: track.id,
    trackSlug: preset.trackSlug,
    systemId: system?.id,
    systemName: system?.name,
    topicId: topic?.id,
    topicName: topic?.name,
    objective: preset.promptStyleEmphasis,
    batchCount: preset.contentType === "question" ? preset.defaultCount : undefined,
    cardCount: preset.contentType === "flashcard_deck" ? preset.defaultCount : undefined,
    sectionCount: preset.studyGuideMode === "section_pack" ? (preset.sectionCount ?? preset.defaultCount) : undefined,
    studyGuideMode: preset.studyGuideMode,
    flashcardDeckMode: preset.flashcardDeckMode,
    highYieldType:
      preset.highYieldType ??
      (preset.contentType === "high_yield_summary"
        ? "high_yield_summary"
        : preset.contentType === "common_confusion"
          ? "common_confusion"
          : preset.contentType === "board_trap"
            ? "board_trap"
            : preset.contentType === "compare_contrast_summary"
              ? "compare_contrast_summary"
              : undefined),
    boardFocus: preset.boardFocus,
    itemTypeSlug: preset.itemTypeSlug,
    saveStatus: "draft",
  };

  if (preset.difficultyMix) {
    const levels = Object.keys(preset.difficultyMix).map(Number) as (1 | 2 | 3 | 4 | 5)[];
    const maxWeight = Math.max(...levels.map((l) => preset.difficultyMix![l as 1 | 2 | 3 | 4 | 5] ?? 0));
    const midLevel = levels.find((l) => (preset.difficultyMix![l as 1 | 2 | 3 | 4 | 5] ?? 0) === maxWeight);
    config.targetDifficulty = midLevel ?? 3;
  }

  return config;
}
