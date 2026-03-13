/**
 * AI Content Factory - shared persistence layer.
 * Saves AI-generated content to Supabase as draft initially.
 * Auto-publish runs in ai-factory-persistence after quality checks.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { GenerationConfig, PersistResult } from "./types";
import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { StudySectionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { FlashcardDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { HighYieldSummaryDraftOutput } from "@/lib/ai/admin-drafts/types";
import type {
  CommonConfusionOutput,
  BoardTrapOutput,
  CompareContrastOutput,
  QuestionOptionOutput,
  StudyGuideOutput,
  StudyGuideSectionPackOutput,
  FlashcardDeckOutput,
} from "@/lib/ai/content-factory/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import {
  validateQuestionPayload,
  normalizeQuestionPayload,
} from "@/lib/ai/question-factory";
import {
  validateStudyGuidePayload,
  validateStudyGuideSectionPackPayload,
} from "@/lib/ai/study-guide-factory";
import { validateFlashcardDeckPayload } from "@/lib/ai/flashcard-factory";
import {
  validateHighYieldPayload,
  normalizeConfusionFrequency,
  normalizeHighYieldScore,
  normalizeTrapSeverity,
  normalizeSuggestedLink,
} from "@/lib/ai/high-yield-factory";
import { DECK_TYPE_MAP } from "@/lib/ai/flashcard-factory/types";
import type { QuestionPayload } from "@/lib/ai/question-factory/types";
import { isLikelyDuplicate } from "@/lib/ai/similarity";
import { normalizeForHash, simpleHash } from "@/lib/ai/dedupe-utils";

const AI_STATUS = "draft" as const; // Always draft; editor_review can be set later

/** Resolve initial save status; auto-publish may run after in ai-factory-persistence */
function resolveAIStatus(config: GenerationConfig): "draft" | "editor_review" {
  return config.saveStatus === "editor_review" ? "editor_review" : AI_STATUS;
}

/** Reject config with missing or invalid trackId before any DB write */
function requireValidTrackId(config: GenerationConfig): string | null {
  const id = config.trackId?.trim();
  if (!id) return "Track is required";
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidLike.test(id)) return "Invalid track ID";
  return null;
}

export function isExtendedQuestionOutput(
  draft: QuestionDraftOutput | ExtendedQuestionOutput
): draft is ExtendedQuestionOutput {
  return "itemType" in draft && typeof (draft as ExtendedQuestionOutput).itemType === "string";
}

export function toQuestionPayload(draft: ExtendedQuestionOutput): QuestionPayload {
  const opts = draft.options as (QuestionOptionOutput & { correctOrder?: number; coords?: { x: number; y: number; radius?: number } })[];
  return {
    stem: draft.stem,
    leadIn: draft.leadIn,
    instructions: draft.instructions,
    itemType: (draft.itemType ?? "single_best_answer") as QuestionPayload["itemType"],
    options: opts.map((o) => ({
      key: o.key,
      text: o.text,
      isCorrect: o.isCorrect,
      distractorRationale: o.distractorRationale,
      correctOrder: o.correctOrder,
      coords: o.coords,
    })),
    rationale: draft.rationale ?? "",
    teachingPoint: draft.teachingPoint,
    boardRelevance: draft.boardRelevance,
    mnemonic: draft.mnemonic,
    difficulty: (draft.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
    domain: draft.domain,
    system: draft.system,
    topic: draft.topic,
    learningObjective: draft.learningObjective,
    tags: draft.tags,
    selectN: draft.selectN,
    exhibitPlaceholder: draft.exhibitPlaceholder,
    dosageContext: draft.dosageContext,
  };
}

export async function persistQuestion(
  config: GenerationConfig,
  draft: QuestionDraftOutput | ExtendedQuestionOutput,
  questionTypeId: string,
  auditId?: string | null,
  createdBy?: string | null
): Promise<PersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  const status = resolveAIStatus(config);

  try {
    const supabase = createServiceClient();

    let stemMetadata: Record<string, unknown>;
    let stem: string;
    let options: { option_key: string; option_text: string; is_correct: boolean; option_metadata: Record<string, unknown>; display_order: number }[];

    if (isExtendedQuestionOutput(draft)) {
      const payload = toQuestionPayload(draft);
      const validation = validateQuestionPayload(payload);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join("; ") };
      }
      const normalized = normalizeQuestionPayload(payload, {
        exam_track_id: config.trackId,
        question_type_id: questionTypeId,
        domain_id: config.domainId,
        system_id: config.systemId,
        topic_id: config.topicId,
      });
      stemMetadata = { ...normalized.question.stem_metadata, aiGenerated: true, source: "ai_content_factory" };
      stem = normalized.question.stem;
      options = normalized.options.map((o) => ({
        option_key: o.option_key,
        option_text: o.option_text ?? "",
        is_correct: o.is_correct,
        option_metadata: o.option_metadata,
        display_order: o.display_order,
      }));
    } else {
      stemMetadata = {
        leadIn: draft.leadIn,
        instructions: draft.instructions,
        rationale: draft.rationale,
        aiGenerated: true,
        source: "ai_content_factory",
      };
      stem = draft.stem.trim();
      options = draft.options.map((opt, i) => {
        const optionMetadata: Record<string, unknown> = {};
        if (opt.distractorRationale?.trim()) optionMetadata.rationale = opt.distractorRationale;
        return {
          option_key: opt.key.trim().slice(0, 1) || "A",
          option_text: opt.text.trim(),
          is_correct: opt.isCorrect ?? false,
          option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
          display_order: i,
        };
      });
    }

    // Duplicate stem guard: exact match (ilike) + fuzzy similarity for near-duplicates
    const stemTrimmed = stem.trim();
    if (stemTrimmed.length > 0) {
      let dupQuery = supabase
        .from("questions")
        .select("id")
        .eq("exam_track_id", config.trackId)
        .ilike("stem", stemTrimmed);
      if (config.topicId) dupQuery = dupQuery.eq("topic_id", config.topicId);
      else dupQuery = dupQuery.is("topic_id", null);
      const { data: existing } = await dupQuery.limit(1).maybeSingle();
      if (existing) {
        return { success: false, error: "Duplicate stem in this track/topic scope", duplicate: true };
      }

      // Fuzzy duplicate check: fetch recent stems in same scope, skip if similar
      let fuzzyQuery = supabase
        .from("questions")
        .select("stem")
        .eq("exam_track_id", config.trackId)
        .not("stem", "is", null)
        .limit(80);
      if (config.topicId) fuzzyQuery = fuzzyQuery.eq("topic_id", config.topicId);
      else if (config.systemId) fuzzyQuery = fuzzyQuery.eq("system_id", config.systemId);
      const { data: recentStems } = await fuzzyQuery;
      if (recentStems?.length) {
        for (const row of recentStems) {
          const s = (row as { stem?: string }).stem;
          if (s && isLikelyDuplicate(stemTrimmed, s, 0.88)) {
            return { success: false, error: "Similar stem already exists (fuzzy match)", duplicate: true };
          }
        }
      }
    }

    const stemHash = simpleHash(normalizeForHash(stem));
    const { data: q, error: qErr } = await supabase
      .from("questions")
      .insert({
        exam_track_id: config.trackId,
        question_type_id: questionTypeId,
        system_id: config.systemId || null,
        domain_id: config.domainId || null,
        topic_id: config.topicId || null,
        stem,
        stem_metadata: stemMetadata,
        stem_normalized_hash: stemHash,
        status,
      })
      .select("id")
      .single();

    if (qErr || !q) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[ai-factory] question insert failed", { trackId: config.trackId, error: qErr?.message });
      }
      return { success: false, error: qErr?.message ?? "Failed to create question" };
    }

    for (const opt of options) {
      const { error: optErr } = await supabase.from("question_options").insert({
        question_id: q.id,
        option_key: opt.option_key,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        option_metadata: opt.option_metadata,
        display_order: opt.display_order,
      });
      if (optErr) {
        await supabase.from("questions").delete().eq("id", q.id);
        return { success: false, error: `Failed to create option: ${optErr.message}` };
      }
    }

    if (isExtendedQuestionOutput(draft) && draft.difficulty != null && draft.difficulty >= 1 && draft.difficulty <= 5) {
      await supabase.from("question_adaptive_profiles").upsert(
        { question_id: q.id, difficulty_tier: draft.difficulty },
        { onConflict: "question_id" }
      );
    }

    if (isExtendedQuestionOutput(draft) && Array.isArray(draft.tags) && draft.tags.length > 0) {
      const seen = new Set<string>();
      const tagRows = draft.tags
        .map((tag) => {
          const slug = String(tag).trim().toLowerCase().replace(/\s+/g, "_").slice(0, 64) || "tag";
          if (seen.has(slug)) return null;
          seen.add(slug);
          return { question_id: q.id, skill_slug: slug, skill_name: String(tag).trim().slice(0, 128) || slug };
        })
        .filter((r): r is NonNullable<typeof r> => r != null);
      if (tagRows.length > 0) {
        await supabase.from("question_skill_tags").upsert(tagRows, {
          onConflict: "question_id,skill_slug",
        });
      }
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: q.id, outcome: "saved" }).eq("id", auditId);
    }

    if (process.env.NODE_ENV !== "test") {
      console.log("[ai-factory] question persisted", { contentId: q.id, trackId: config.trackId });
    }
    return { success: true, contentId: q.id, auditId: auditId ?? undefined };
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ai-factory] question persist failed", { trackId: config.trackId, error: String(e) });
    }
    return { success: false, error: String(e) };
  }
}

export async function persistStudySection(
  config: GenerationConfig,
  draft: StudySectionDraftOutput,
  studyGuideId: string,
  auditId?: string | null
): Promise<PersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    const slug = draft.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data: section, error } = await supabase
      .from("study_material_sections")
      .insert({
        study_guide_id: studyGuideId,
        slug: slug || "section",
        title: draft.title.trim(),
        content_markdown: draft.contentMarkdown.trim(),
        section_metadata: {
          aiGenerated: true,
          source: "ai_content_factory",
          keyTakeaways: draft.keyTakeaways ?? [],
          mnemonics: draft.mnemonics ?? [],
        },
        display_order: 0,
      })
      .select("id")
      .single();

    if (error || !section) {
      return { success: false, error: error?.message ?? "Failed to create section" };
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: section.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: section.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function persistStudyGuide(
  config: GenerationConfig,
  title: string,
  description: string,
  auditId?: string | null
): Promise<PersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const status = resolveAIStatus(config);

  try {
    const supabase = createServiceClient();

    const baseSlug = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const slug = `${baseSlug || "guide"}-${Date.now().toString(36)}`;

    const { data: sg, error } = await supabase
      .from("study_guides")
      .insert({
        exam_track_id: config.trackId,
        system_id: config.systemId || null,
        topic_id: config.topicId || null,
        slug: slug || "guide",
        title: title.trim(),
        description: description?.trim() || null,
        display_order: 0,
        status,
      })
      .select("id")
      .single();

    if (error || !sg) {
      return { success: false, error: error?.message ?? "Failed to create study guide" };
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: sg.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: sg.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function toSectionMetadata(section: {
  plainExplanation?: string;
  keyTakeaways?: string[];
  commonTraps?: string[];
  commonConfusions?: string[];
  clinicalPearls?: string[];
  quickReviewBullets?: string[];
  mnemonics?: string[];
  highYield?: boolean;
}): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    aiGenerated: true,
    source: "ai_content_factory",
  };
  if (section.plainExplanation) meta.plainExplanation = section.plainExplanation;
  if (section.keyTakeaways?.length) meta.keyTakeaways = section.keyTakeaways;
  const confusions = section.commonConfusions ?? section.commonTraps;
  if (confusions?.length) meta.commonConfusions = confusions;
  if (section.commonTraps?.length && !meta.commonConfusions) meta.commonTraps = section.commonTraps;
  if (section.clinicalPearls?.length) meta.clinicalPearls = section.clinicalPearls;
  if (section.quickReviewBullets?.length) meta.quickReviewBullets = section.quickReviewBullets;
  if (section.mnemonics?.length) meta.mnemonics = section.mnemonics;
  if (section.highYield === true) meta.highYield = true;
  return meta;
}

export async function persistFullStudyGuide(
  config: GenerationConfig,
  draft: StudyGuideOutput,
  auditId?: string | null
): Promise<PersistResult> {
  const validation = validateStudyGuidePayload(draft);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  const status = resolveAIStatus(config);

  try {
    const supabase = createServiceClient();

    // Duplicate protection: block identical title in same track/topic/system
    const titleTrimmed = draft.title.trim();
    if (titleTrimmed) {
      let dupQ = supabase.from("study_guides").select("id").eq("exam_track_id", config.trackId).ilike("title", titleTrimmed);
      if (config.topicId) dupQ = dupQ.eq("topic_id", config.topicId);
      if (config.systemId) dupQ = dupQ.eq("system_id", config.systemId);
      const { data: existing } = await dupQ.limit(1).maybeSingle();
      if (existing) {
        return { success: false, error: "Identical study guide title already exists in this topic", duplicate: true };
      }
    }

    const baseSlug =
      draft.slugSuggestion?.trim() ||
      draft.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    const slug = `${baseSlug || "guide"}-${Date.now().toString(36)}`;

    const { data: sg, error: sgErr } = await supabase
      .from("study_guides")
      .insert({
        exam_track_id: config.trackId,
        system_id: config.systemId || null,
        topic_id: config.topicId || null,
        slug: slug || "guide",
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        display_order: 0,
        status,
      })
      .select("id")
      .single();

    if (sgErr || !sg) {
      return { success: false, error: sgErr?.message ?? "Failed to create study guide" };
    }

    for (let i = 0; i < draft.sections.length; i++) {
      const sec = draft.sections[i];
      const sectionSlug =
        sec.slug?.trim() ||
        sec.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") ||
        `section-${i + 1}`;

      const { error: secErr } = await supabase.from("study_material_sections").insert({
        study_guide_id: sg.id,
        slug: sectionSlug,
        title: sec.title.trim(),
        content_markdown: sec.contentMarkdown.trim(),
        section_metadata: toSectionMetadata(sec),
        display_order: i,
      });

      if (secErr) {
        await supabase.from("study_guides").delete().eq("id", sg.id);
        return { success: false, error: `Section ${i + 1}: ${secErr.message ?? "Failed to create section"}` };
      }
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: sg.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: sg.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function persistStudyGuideSectionPack(
  config: GenerationConfig,
  draft: StudyGuideSectionPackOutput,
  guideTitle: string,
  auditId?: string | null
): Promise<PersistResult> {
  const validation = validateStudyGuideSectionPackPayload(draft);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  const status = resolveAIStatus(config);

  try {
    const supabase = createServiceClient();

    // Duplicate protection: block identical title
    const titleTrimmed = guideTitle.trim();
    if (titleTrimmed) {
      let dupQ = supabase.from("study_guides").select("id").eq("exam_track_id", config.trackId).ilike("title", titleTrimmed);
      if (config.topicId) dupQ = dupQ.eq("topic_id", config.topicId);
      if (config.systemId) dupQ = dupQ.eq("system_id", config.systemId);
      const { data: existing } = await dupQ.limit(1).maybeSingle();
      if (existing) {
        return { success: false, error: "Identical study guide title already exists in this topic", duplicate: true };
      }
    }

    const baseSlug = guideTitle
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const slug = `${baseSlug || "guide"}-${Date.now().toString(36)}`;

    const { data: sg, error: sgErr } = await supabase
      .from("study_guides")
      .insert({
        exam_track_id: config.trackId,
        system_id: config.systemId || null,
        topic_id: config.topicId || null,
        slug: slug || "guide",
        title: guideTitle.trim(),
        description: `Section pack: ${draft.sections.length} sections`,
        display_order: 0,
        status,
      })
      .select("id")
      .single();

    if (sgErr || !sg) {
      return { success: false, error: sgErr?.message ?? "Failed to create study guide" };
    }

    for (let i = 0; i < draft.sections.length; i++) {
      const sec = draft.sections[i];
      const sectionSlug =
        sec.slug?.trim() ||
        sec.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") ||
        `section-${i + 1}`;

      const { error: secErr } = await supabase.from("study_material_sections").insert({
        study_guide_id: sg.id,
        slug: sectionSlug,
        title: sec.title.trim(),
        content_markdown: sec.contentMarkdown.trim(),
        section_metadata: toSectionMetadata(sec),
        display_order: i,
      });

      if (secErr) {
        await supabase.from("study_guides").delete().eq("id", sg.id);
        return { success: false, error: `Section ${i + 1}: ${secErr.message ?? "Failed to create section"}` };
      }
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: sg.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: sg.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function persistFlashcardDeck(
  config: GenerationConfig,
  name: string,
  description: string,
  auditId?: string | null
): Promise<PersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  const status = resolveAIStatus(config);

  try {
    const supabase = createServiceClient();

    const { data: deck, error } = await supabase
      .from("flashcard_decks")
      .insert({
        exam_track_id: config.trackId,
        system_id: config.systemId || null,
        topic_id: config.topicId || null,
        name: name.trim(),
        description: description?.trim() || null,
        source: "ai",
        is_public: false,
        status,
      })
      .select("id")
      .single();

    if (error || !deck) {
      return { success: false, error: error?.message ?? "Failed to create deck" };
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: deck.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: deck.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function persistFullFlashcardDeck(
  config: GenerationConfig,
  draft: FlashcardDeckOutput,
  auditId?: string | null
): Promise<PersistResult> {
  const validation = validateFlashcardDeckPayload(draft);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  const status = resolveAIStatus(config);
  const deckType = draft.deckType ? DECK_TYPE_MAP[draft.deckType as keyof typeof DECK_TYPE_MAP] ?? draft.deckType : "rapid_recall";
  const difficulty = (draft.difficulty === "easy" || draft.difficulty === "medium" || draft.difficulty === "hard")
    ? draft.difficulty
    : "medium";

  try {
    const supabase = createServiceClient();

    // Duplicate protection: block identical card fronts in same track/topic
    let deckQuery = supabase.from("flashcard_decks").select("id").eq("exam_track_id", config.trackId);
    if (config.topicId) deckQuery = deckQuery.eq("topic_id", config.topicId);
    if (config.systemId) deckQuery = deckQuery.eq("system_id", config.systemId);
    const { data: existingDecks } = await deckQuery.limit(50);
    const deckIds = (existingDecks ?? []).map((d) => d.id);
    if (deckIds.length > 0) {
      const { data: existingCards } = await supabase
        .from("flashcards")
        .select("front_text")
        .in("flashcard_deck_id", deckIds)
        .limit(500);
      const existingFronts = new Set((existingCards ?? []).map((c) => (c.front_text as string)?.trim().toLowerCase()).filter(Boolean));
      for (let i = 0; i < draft.cards.length; i++) {
        const front = draft.cards[i].frontText?.trim();
        if (front && existingFronts.has(front.toLowerCase())) {
          return { success: false, error: `Card ${i + 1}: Identical front already exists in this topic`, duplicate: true };
        }
      }
    }

    const { data: deck, error: deckErr } = await supabase
      .from("flashcard_decks")
      .insert({
        exam_track_id: config.trackId,
        system_id: config.systemId || null,
        topic_id: config.topicId || null,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        source: "ai",
        is_public: false,
        deck_type: deckType,
        difficulty,
        status,
      })
      .select("id")
      .single();

    if (deckErr || !deck) {
      return { success: false, error: deckErr?.message ?? "Failed to create deck" };
    }

    const FLASHCARD_CHUNK = 100;
    const cardRows = draft.cards.map((card, i) => {
      const metadata: Record<string, unknown> = { aiGenerated: true, source: "ai_content_factory" };
      if (card.hint) metadata.hint = card.hint;
      if (card.memoryTrick) metadata.memoryTrick = card.memoryTrick;
      return {
        flashcard_deck_id: deck.id,
        front_text: card.frontText.trim(),
        back_text: card.backText.trim(),
        metadata,
        display_order: i,
      };
    });
    for (let i = 0; i < cardRows.length; i += FLASHCARD_CHUNK) {
      const chunk = cardRows.slice(i, i + FLASHCARD_CHUNK);
      const { error: cardErr } = await supabase.from("flashcards").insert(chunk);
      if (cardErr) {
        await supabase.from("flashcard_decks").delete().eq("id", deck.id);
        return { success: false, error: `Cards ${i + 1}-${i + chunk.length}: ${cardErr.message ?? "Failed to create cards"}` };
      }
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: deck.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: deck.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function persistFlashcard(
  deckId: string,
  draft: FlashcardDraftOutput,
  displayOrder: number,
  auditId?: string | null
): Promise<PersistResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    const metadata: Record<string, unknown> = { aiGenerated: true, source: "ai_content_factory" };
    if (draft.hint) metadata.hint = draft.hint;
    if (draft.memoryTrick) metadata.memoryTrick = draft.memoryTrick;

    const { data: card, error } = await supabase
      .from("flashcards")
      .insert({
        flashcard_deck_id: deckId,
        front_text: draft.frontText.trim(),
        back_text: draft.backText.trim(),
        metadata,
        display_order: displayOrder,
      })
      .select("id")
      .single();

    if (error || !card) {
      return { success: false, error: error?.message ?? "Failed to create flashcard" };
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: card.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: card.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export type HighYieldDraft =
  | HighYieldSummaryDraftOutput
  | CommonConfusionOutput
  | BoardTrapOutput
  | CompareContrastOutput;

export function toHighYieldRow(
  config: GenerationConfig,
  draft: HighYieldDraft,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary"
): Record<string, unknown> {
  const status = resolveAIStatus(config);
  const base: Record<string, unknown> = {
    content_type: contentType,
    exam_track_id: config.trackId,
    system_id: config.systemId || null,
    topic_id: config.topicId || null,
    title: draft.title.trim(),
    status,
    display_order: 0,
    suggested_practice_link: null,
    suggested_guide_link: null,
  };

  if (contentType === "common_confusion" && "commonConfusion" in draft) {
    const d = draft as CommonConfusionOutput;
    const freq = d.confusionFrequency ? normalizeConfusionFrequency(d.confusionFrequency) : null;
    const score = normalizeHighYieldScore(d.highYieldScore);
    return {
      ...base,
      explanation: d.explanation?.trim() || null,
      why_high_yield: d.whyHighYield?.trim() || null,
      common_confusion: d.commonConfusion?.trim() || null,
      high_yield_score: score,
      concept_a: d.conceptA?.trim() || null,
      concept_b: d.conceptB?.trim() || null,
      key_difference: d.keyDifference?.trim() || null,
      suggested_practice_link: normalizeSuggestedLink(d.suggestedPracticeLink) ?? null,
      suggested_guide_link: normalizeSuggestedLink(d.suggestedGuideLink) ?? null,
      confusion_frequency: freq,
    };
  }
  if (contentType === "board_trap" && "trapDescription" in draft) {
    const d = draft as BoardTrapOutput;
    const severity = normalizeTrapSeverity(d.severity ?? d.trapSeverity);
    const score = normalizeHighYieldScore(d.highYieldScore);
    return {
      ...base,
      explanation: d.explanation?.trim() || d.trapDescription?.trim() || null,
      trap_description: d.trapDescription?.trim() || null,
      correct_approach: d.correctApproach?.trim() || null,
      trap_severity: severity,
      why_high_yield: d.whyHighYield?.trim() || null,
      common_confusion: d.commonConfusion?.trim() || null,
      high_yield_score: score,
      suggested_practice_link: normalizeSuggestedLink(d.suggestedPracticeLink) ?? null,
      suggested_guide_link: normalizeSuggestedLink(d.suggestedGuideLink) ?? null,
    };
  }
  if (contentType === "compare_contrast_summary" && "keyDifference" in draft) {
    const d = draft as CompareContrastOutput;
    const score = normalizeHighYieldScore(d.highYieldScore);
    return {
      ...base,
      concept_a: d.conceptA?.trim() || null,
      concept_b: d.conceptB?.trim() || null,
      key_difference: d.keyDifference?.trim() || null,
      explanation: d.explanation?.trim() || null,
      why_high_yield: d.whyHighYield?.trim() || null,
      common_confusion: d.commonConfusion?.trim() || null,
      high_yield_score: score,
      suggested_practice_link: normalizeSuggestedLink(d.suggestedPracticeLink) ?? null,
      suggested_guide_link: normalizeSuggestedLink(d.suggestedGuideLink) ?? null,
    };
  }
  const d = draft as HighYieldSummaryDraftOutput;
  const score = normalizeHighYieldScore((d as HighYieldSummaryDraftOutput & { highYieldScore?: number }).highYieldScore);
  return {
    ...base,
    explanation: d.explanation?.trim() || null,
    why_high_yield: d.whyHighYield?.trim() || null,
    common_confusion: d.commonConfusion?.trim() || null,
    suggested_practice_link: normalizeSuggestedLink((d as HighYieldSummaryDraftOutput & { suggestedPracticeLink?: string }).suggestedPracticeLink) ?? null,
    suggested_guide_link: normalizeSuggestedLink((d as HighYieldSummaryDraftOutput & { suggestedGuideLink?: string }).suggestedGuideLink) ?? null,
    high_yield_score: score,
  };
}

export async function persistHighYieldContent(
  config: GenerationConfig,
  draft: HighYieldDraft,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary",
  auditId?: string | null
): Promise<PersistResult> {
  const validation = validateHighYieldPayload(draft, contentType);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }
  const trackErr = requireValidTrackId(config);
  if (trackErr) return { success: false, error: trackErr };

  try {
    const supabase = createServiceClient();

    // Duplicate protection: block identical title in same track/topic/system
    const titleTrimmed = (draft.title as string)?.trim() ?? "";
    if (titleTrimmed) {
      let dupQ = supabase.from("high_yield_content").select("id").eq("exam_track_id", config.trackId).ilike("title", titleTrimmed);
      if (config.topicId) dupQ = dupQ.eq("topic_id", config.topicId);
      if (config.systemId) dupQ = dupQ.eq("system_id", config.systemId);
      const { data: existing } = await dupQ.limit(1).maybeSingle();
      if (existing) {
        return { success: false, error: "Identical high-yield title already exists in this topic", duplicate: true };
      }
    }

    const row = toHighYieldRow(config, draft, contentType);

    const { data: hy, error } = await supabase
      .from("high_yield_content")
      .insert(row)
      .select("id")
      .single();

    if (error || !hy) {
      return { success: false, error: error?.message ?? "Failed to create high-yield content" };
    }

    if (auditId) {
      await supabase.from("ai_generation_audit").update({ content_id: hy.id, outcome: "saved" }).eq("id", auditId);
    }

    return { success: true, contentId: hy.id, auditId: auditId ?? undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
