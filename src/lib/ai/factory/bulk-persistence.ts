/**
 * AI Bulk Persistence - High-Volume Insert Optimization
 *
 * Replaces row-by-row writes with chunked bulk inserts for 25k+ generation.
 * - Chunk sizes: questions 25, question_options 100, flashcards 100, high_yield 25
 * - Stable hashes for dedupe prior to insert
 * - Dead-letter handling for failed rows
 * - Post-insert reconciliation counts
 * - Transaction boundaries: each chunk is atomic
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { normalizeForHash, simpleHash } from "@/lib/ai/dedupe-utils";
import {
  checkDedupeBeforeSave,
  registerAfterSave,
  prepareQuestionDedupe,
} from "@/lib/ai/dedupe-check";
import { BULK_CHUNK_SIZES } from "./bulk-persistence-config";
import type { GenerationConfig } from "./types";
import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import type { FlashcardDeckOutput } from "@/lib/ai/content-factory/types";
import type { HighYieldDraft } from "./persistence";
import {
  validateQuestionPayload,
  normalizeQuestionPayload,
} from "@/lib/ai/question-factory";
import { validateFlashcardDeckPayload } from "@/lib/ai/flashcard-factory";
import { validateHighYieldPayload } from "@/lib/ai/high-yield-factory/validation";
import { toHighYieldRow } from "./persistence";
import { isExtendedQuestionOutput, toQuestionPayload } from "./persistence";
import { DECK_TYPE_MAP } from "@/lib/ai/flashcard-factory/types";
import type { QuestionOptionOutput } from "@/lib/ai/content-factory/types";

const CHUNK = BULK_CHUNK_SIZES;

export interface BulkQuestionItem {
  config: GenerationConfig;
  draft: QuestionDraftOutput | ExtendedQuestionOutput;
  questionTypeId: string;
  auditId?: string | null;
  createdBy?: string | null;
}

export interface BulkPersistQuestionsResult {
  success: boolean;
  insertedCount: number;
  duplicateCount: number;
  failedCount: number;
  deadLetterCount: number;
  contentIds: string[];
  error?: string;
}

export interface BulkPersistFlashcardsResult {
  success: boolean;
  deckId?: string;
  insertedCount: number;
  failedCount: number;
  deadLetterCount: number;
  error?: string;
}

export interface BulkPersistHighYieldResult {
  success: boolean;
  insertedCount: number;
  duplicateCount: number;
  failedCount: number;
  deadLetterCount: number;
  contentIds: string[];
  error?: string;
}

function resolveStatus(config: GenerationConfig): "draft" | "editor_review" {
  return config.saveStatus === "editor_review" ? "editor_review" : "draft";
}

async function insertDeadLetter(
  contentType: string,
  payload: Record<string, unknown>,
  errorMessage: string,
  errorCode?: string,
  batchJobId?: string
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    await supabase.from("ai_bulk_insert_dead_letter").insert({
      content_type: contentType,
      batch_job_id: batchJobId ?? null,
      payload,
      error_message: errorMessage,
      error_code: errorCode ?? null,
      retry_count: 0,
    });
  } catch {
    // best-effort
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function applyQualityAndAutoPublish(
  entityType: string,
  entityId: string,
  draft: BulkQuestionItem["draft"],
  fromStatus: string,
  config: BulkQuestionItem["config"]
): Promise<void> {
  const { computeQuestionQualityScore } = await import("@/lib/ai/content-quality-scoring");
  const { upsertContentQualityMetadata, runAutoPublishFlow } = await import("@/lib/admin/auto-publish");
  const { getSourceFrameworkForTrack } = await import("@/lib/admin/autonomous-operations");
  const { ensureContentEvidenceMetadata } = await import("@/lib/admin/source-governance");

  if (isSupabaseServiceRoleConfigured()) {
    const framework = await getSourceFrameworkForTrack(config.trackSlug);
    if (framework?.id) {
      const supabase = createServiceClient();
      await supabase.from("content_source_framework").upsert(
        { entity_type: entityType, entity_id: entityId, source_framework_id: framework.id },
        { onConflict: "entity_type,entity_id" }
      );
    }
    const ext = draft as { primaryReference?: string; guidelineReference?: string; evidenceTier?: 1 | 2 | 3 };
    await ensureContentEvidenceMetadata(entityType, entityId, config.trackSlug, {
      aiPrimarySlug: ext.primaryReference ?? null,
      aiGuidelineSlug: ext.guidelineReference ?? null,
      aiEvidenceTier: ext.evidenceTier ?? null,
      sourceFrameworkId: framework?.id ?? null,
    });
  }

  const quality = computeQuestionQualityScore(draft);
  await upsertContentQualityMetadata(entityType, entityId, {
    qualityScore: quality.qualityScore,
    autoPublishEligible: quality.autoPublishEligible,
    validationStatus: quality.validationStatus,
    validationErrors: quality.validationErrors,
    generationMetadata: { source: "ai_content_factory" },
  });
  await runAutoPublishFlow(entityType, entityId, "question", fromStatus, null);
}

/** Build question row + options, with stem_normalized_hash for dedupe */
function buildQuestionRows(
  item: BulkQuestionItem
): { questionRow: Record<string, unknown>; optionRows: Record<string, unknown>[]; stemHash: string } | null {
  const config = item.config;
  const draft = item.draft;
  const status = resolveStatus(config);
  let stem: string;
  let options: { option_key: string; option_text: string; is_correct: boolean; option_metadata: Record<string, unknown>; display_order: number }[];
  let stemMetadata: Record<string, unknown>;

  if (isExtendedQuestionOutput(draft)) {
    const payload = toQuestionPayload(draft);
    const validation = validateQuestionPayload(payload);
    if (!validation.valid) return null;
    const normalized = normalizeQuestionPayload(payload, {
      exam_track_id: config.trackId,
      question_type_id: item.questionTypeId,
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
        option_key: (opt as QuestionOptionOutput).key?.trim().slice(0, 1) || "A",
        option_text: (opt as QuestionOptionOutput).text?.trim() ?? "",
        is_correct: (opt as QuestionOptionOutput).isCorrect ?? false,
        option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
        display_order: i,
      };
    });
  }

  const stemHash = simpleHash(normalizeForHash(stem));
  const questionRow = {
    exam_track_id: config.trackId,
    question_type_id: item.questionTypeId,
    system_id: config.systemId || null,
    domain_id: config.domainId || null,
    topic_id: config.topicId || null,
    stem,
    stem_metadata: stemMetadata,
    stem_normalized_hash: stemHash,
    status,
  };

    const optionRows = options.map((o) => ({
      option_key: String(o.option_key ?? "A"),
      option_text: String(o.option_text ?? ""),
      is_correct: Boolean(o.is_correct),
      option_metadata: (o.option_metadata ?? {}) as Record<string, unknown>,
      display_order: Number(o.display_order ?? 0),
    }));

  return { questionRow, optionRows, stemHash };
}

export interface BulkPersistOptions {
  batchJobId?: string;
  batchPlanId?: string;
  campaignId?: string;
}

/**
 * Bulk persist questions with chunked inserts.
 * Dedupes via content_dedupe_registry + questions.stem_normalized_hash + near-duplicate rules.
 */
export async function bulkPersistQuestions(
  items: BulkQuestionItem[],
  batchJobIdOrOpts?: string | BulkPersistOptions
): Promise<BulkPersistQuestionsResult> {
  const opts: BulkPersistOptions =
    typeof batchJobIdOrOpts === "string" ? { batchJobId: batchJobIdOrOpts } : batchJobIdOrOpts ?? {};
  const batchJobId = opts.batchJobId;
  const batchPlanId = opts.batchPlanId;

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, insertedCount: 0, duplicateCount: 0, failedCount: 0, deadLetterCount: 0, contentIds: [], error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const contentIds: string[] = [];
  let duplicateCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;

  const built = items.map((item) => buildQuestionRows(item));
  type BuiltRow = NonNullable<ReturnType<typeof buildQuestionRows>>;
  const valid: { item: BulkQuestionItem; built: BuiltRow }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (built[i]) valid.push({ item: items[i], built: built[i]! });
    else {
      failedCount++;
      await insertDeadLetter("question", { config: items[i].config, draft: items[i].draft }, "Validation failed", "invalid_output", batchJobId);
      deadLetterCount++;
    }
  }

  if (valid.length === 0) {
    return { success: true, insertedCount: 0, duplicateCount, failedCount, deadLetterCount, contentIds };
  }

  const trackId = valid[0].item.config.trackId;
  const topicId = valid[0].item.config.topicId ?? null;
  const scope = { examTrackId: trackId, systemId: valid[0].item.config.systemId ?? null, topicId };

  const hashes = valid.map((v) => v.built.stemHash);
  const registryDupSet = new Set<string>();
  if (hashes.length > 0) {
    const { data: regRows } = await supabase
      .from("content_dedupe_registry")
      .select("normalized_hash")
      .eq("content_type", "question")
      .in("normalized_hash", hashes);
    for (const r of regRows ?? []) {
      const h = (r as { normalized_hash?: string }).normalized_hash;
      if (h) registryDupSet.add(h);
    }
  }

  let toInsert = valid.filter((v) => !registryDupSet.has(v.built.stemHash));
  duplicateCount += valid.length - toInsert.length;

  const questionsDupSet = new Set<string>();
  let qDupQuery = supabase.from("questions").select("stem_normalized_hash").eq("exam_track_id", trackId).in("stem_normalized_hash", toInsert.map((v) => v.built.stemHash));
  if (topicId) qDupQuery = qDupQuery.eq("topic_id", topicId);
  else qDupQuery = qDupQuery.is("topic_id", null);
  const { data: existingHashes } = await qDupQuery;
  for (const r of existingHashes ?? []) {
    const h = (r as { stem_normalized_hash?: string }).stem_normalized_hash;
    if (h) questionsDupSet.add(h);
  }

  toInsert = toInsert.filter((v) => !questionsDupSet.has(v.built.stemHash));
  duplicateCount = valid.length - toInsert.length;

  for (let i = toInsert.length - 1; i >= 0; i--) {
    const v = toInsert[i];
    const stem = (v.built.questionRow.stem as string) ?? "";
    const prep = prepareQuestionDedupe(stem);
    const nearDup = await checkDedupeBeforeSave({
      contentType: "question",
      normalizedHash: prep.normalizedHash,
      secondaryHash: prep.secondaryHash,
      scope,
      rawStem: stem,
    });
    if (nearDup.isDuplicate) {
      toInsert.splice(i, 1);
      duplicateCount++;
    }
  }

  const chunks = chunk(toInsert, CHUNK.questions);
  for (const ch of chunks) {
    const questionRows = ch.map((v) => ({
      ...v.built.questionRow,
      stem_normalized_hash: v.built.stemHash,
    }));

    const { data: inserted, error: qErr } = await supabase.from("questions").insert(questionRows).select("id");

    if (qErr || !inserted?.length) {
      for (const v of ch) {
        await insertDeadLetter("question", { questionRow: v.built.questionRow }, qErr?.message ?? "Insert failed", "db_failure", batchJobId);
        deadLetterCount++;
      }
      failedCount += ch.length;
      continue;
    }

    const allOptionRows: Array<{
      question_id: string;
      option_key: string;
      option_text: string;
      is_correct: boolean;
      option_metadata: Record<string, unknown>;
      display_order: number;
    }> = [];
    const insertedIds: string[] = [];
    for (let i = 0; i < ch.length; i++) {
      const qId = inserted[i]?.id;
      if (!qId) continue;
      insertedIds.push(qId);
      for (const o of ch[i].built.optionRows) {
        allOptionRows.push({
          question_id: qId,
          option_key: String(o.option_key ?? "A"),
          option_text: String(o.option_text ?? ""),
          is_correct: Boolean(o.is_correct),
          option_metadata: (o.option_metadata ?? {}) as Record<string, unknown>,
          display_order: Number(o.display_order ?? 0),
        });
      }
    }

    const optChunks = chunk(allOptionRows, CHUNK.question_options);
    let optionsOk = true;
    for (const optCh of optChunks) {
      const { error: optErr } = await supabase.from("question_options").insert(optCh);
      if (optErr) {
        optionsOk = false;
        for (const row of optCh) {
          await insertDeadLetter("question_option", row, optErr.message, "db_failure", batchJobId);
          deadLetterCount++;
        }
        failedCount += ch.length;
      }
    }
    if (optionsOk) {
      contentIds.push(...insertedIds);
      const status = resolveStatus(ch[0].item.config);
      for (let i = 0; i < ch.length; i++) {
        const qId = insertedIds[i];
        if (!qId) continue;
        const v = ch[i];
        const prep = prepareQuestionDedupe((v.built.questionRow.stem as string) ?? "");
        await registerAfterSave({
          contentType: "question",
          normalizedHash: prep.normalizedHash,
          secondaryHash: prep.secondaryHash,
          scope: { examTrackId: trackId, systemId: v.item.config.systemId ?? null, topicId },
          sourceTable: "questions",
          sourceId: qId,
          sourceStatus: status,
          normalizedTextPreview: prep.normalizedTextPreview,
          createdByBatchPlanId: batchPlanId ?? null,
        });
        applyQualityAndAutoPublish("question", qId, v.item.draft, status, v.item.config).catch(() => {});
      }
    } else if (insertedIds.length > 0) {
      await supabase.from("questions").delete().in("id", insertedIds);
    }
  }

  return {
    success: failedCount === 0 && deadLetterCount === 0,
    insertedCount: contentIds.length,
    duplicateCount,
    failedCount,
    deadLetterCount,
    contentIds,
  };
}

/**
 * Bulk persist flashcards (cards within a deck).
 * Creates deck first, then chunked card inserts.
 */
export async function bulkPersistFlashcards(
  config: GenerationConfig,
  draft: FlashcardDeckOutput,
  batchJobId?: string
): Promise<BulkPersistFlashcardsResult> {
  const validation = validateFlashcardDeckPayload(draft);
  if (!validation.valid) {
    return { success: false, insertedCount: 0, failedCount: 0, deadLetterCount: 0, error: validation.errors.join("; ") };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, insertedCount: 0, failedCount: 0, deadLetterCount: 0, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const status = resolveStatus(config);
  const deckType = draft.deckType ? DECK_TYPE_MAP[draft.deckType as keyof typeof DECK_TYPE_MAP] ?? draft.deckType : "rapid_recall";
  const difficulty = draft.difficulty === "easy" || draft.difficulty === "medium" || draft.difficulty === "hard" ? draft.difficulty : "medium";

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
    return { success: false, insertedCount: 0, failedCount: draft.cards.length, deadLetterCount: 0, error: deckErr?.message ?? "Failed to create deck" };
  }

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

  const chunks = chunk(cardRows, CHUNK.flashcards);
  let insertedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;

  for (const ch of chunks) {
    const { error } = await supabase.from("flashcards").insert(ch);
    if (error) {
      for (const row of ch) {
        await insertDeadLetter("flashcard", row, error.message, "db_failure", batchJobId);
        deadLetterCount++;
      }
      failedCount += ch.length;
    } else {
      insertedCount += ch.length;
    }
  }

  return {
    success: failedCount === 0,
    deckId: deck.id,
    insertedCount,
    failedCount,
    deadLetterCount,
  };
}

/**
 * Bulk persist high-yield content.
 */
export async function bulkPersistHighYield(
  items: { config: GenerationConfig; draft: HighYieldDraft; contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary"; auditId?: string | null }[],
  batchJobId?: string
): Promise<BulkPersistHighYieldResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, insertedCount: 0, duplicateCount: 0, failedCount: 0, deadLetterCount: 0, contentIds: [], error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const contentIds: string[] = [];
  let duplicateCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;

  const rows: { row: Record<string, unknown>; item: (typeof items)[0] }[] = [];
  for (const item of items) {
    const validation = validateHighYieldPayload(item.draft, item.contentType);
    if (!validation.valid) {
      failedCount++;
      await insertDeadLetter("high_yield_content", { config: item.config, draft: item.draft }, validation.errors.join("; "), "invalid_output", batchJobId);
      deadLetterCount++;
      continue;
    }
    const titleTrimmed = (item.draft.title as string)?.trim() ?? "";
    if (titleTrimmed) {
      let dupQ = supabase.from("high_yield_content").select("id").eq("exam_track_id", item.config.trackId).ilike("title", titleTrimmed);
      if (item.config.topicId) dupQ = dupQ.eq("topic_id", item.config.topicId);
      if (item.config.systemId) dupQ = dupQ.eq("system_id", item.config.systemId);
      const { data: existing } = await dupQ.limit(1).maybeSingle();
      if (existing) {
        duplicateCount++;
        continue;
      }
    }
    const row = toHighYieldRow(item.config, item.draft, item.contentType);
    rows.push({ row, item });
  }

  const chunks = chunk(rows, CHUNK.high_yield_content);
  for (const ch of chunks) {
    const rowData = ch.map((r) => r.row);
    const { data: inserted, error } = await supabase.from("high_yield_content").insert(rowData).select("id");

    if (error || !inserted?.length) {
      for (const r of ch) {
        await insertDeadLetter("high_yield_content", r.row, error?.message ?? "Insert failed", "db_failure", batchJobId);
        deadLetterCount++;
      }
      failedCount += ch.length;
    } else {
      for (const id of inserted) {
        if (id?.id) contentIds.push(id.id);
      }
    }
  }

  return {
    success: failedCount === 0 && deadLetterCount === 0,
    insertedCount: contentIds.length,
    duplicateCount,
    failedCount,
    deadLetterCount,
    contentIds,
  };
}
