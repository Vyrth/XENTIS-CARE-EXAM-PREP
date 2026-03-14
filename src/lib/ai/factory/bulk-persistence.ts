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
import { registerAfterSave, prepareQuestionDedupe } from "@/lib/ai/dedupe-check";
import { checkQuestionDuplicate } from "@/lib/ai/question-dedupe";
import { storeStemEmbedding, storeContentEmbedding } from "@/lib/ai/stem-embedding-dedupe";
import {
  extractArchetypeFromStem,
  buildScopeKey,
  appendToGenerationMemory,
  checkBatchVariety,
} from "@/lib/ai/scenario-diversification";
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
import { computeQuestionQualityScore } from "@/lib/ai/content-quality-scoring";
import { validateQuestionMedically } from "@/lib/ai/ai-medical-validator";
import { computeReviewFlags } from "@/lib/admin/review-flags";
import { upsertContentQualityMetadata, runAutoPublishFlow } from "@/lib/admin/auto-publish";
import { getSourceFrameworkForTrack } from "@/lib/admin/autonomous-operations";
import { ensureContentEvidenceMetadata, hasValidSourceMapping } from "@/lib/admin/source-governance";
import { ensureSourceEvidenceForAIGeneratedContent } from "@/lib/admin/source-evidence";
import { QUESTIONS_TRACK_COLUMN } from "@/config/content";

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

const PAYLOAD_TRUNCATE = 2000;

function truncatePayload(obj: unknown): unknown {
  if (obj == null) return obj;
  const s = JSON.stringify(obj);
  if (s.length <= PAYLOAD_TRUNCATE) return obj;
  return { _truncated: true, _length: s.length, _preview: s.slice(0, PAYLOAD_TRUNCATE) + "..." };
}

async function insertDeadLetter(
  contentType: string,
  payload: Record<string, unknown>,
  errorMessage: string,
  errorCode?: string,
  batchJobId?: string,
  extra?: { failingStage?: string; validationReason?: string; missingFields?: string[] }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    const enrichedPayload: Record<string, unknown> = {
      ...payload,
      _meta: {
        failing_stage: extra?.failingStage ?? "unknown",
        validation_reason: extra?.validationReason ?? errorMessage,
        missing_fields: extra?.missingFields ?? [],
        content_type: contentType,
      },
      _snapshot: truncatePayload(payload),
    };
    await supabase.from("ai_bulk_insert_dead_letter").insert({
      content_type: contentType,
      batch_job_id: batchJobId ?? null,
      payload: enrichedPayload,
      error_message: errorMessage,
      error_code: errorCode ?? null,
      retry_count: 0,
    });
  } catch {
    // best-effort
  }
}

function getQuestionDraftValidationErrors(draft: QuestionDraftOutput | ExtendedQuestionOutput): string[] {
  const d = draft as { stem?: string; options?: unknown[]; rationale?: string };
  const errs: string[] = [];
  if (!d.stem?.trim()) errs.push("missing stem");
  else if (d.stem.trim().length < 10) errs.push("stem too short");
  if (!Array.isArray(d.options) || d.options.length < 2) errs.push("invalid options");
  else {
    const hasCorrect = d.options.some((o) => o && typeof o === "object" && (o as { isCorrect?: boolean }).isCorrect === true);
    if (!hasCorrect) errs.push("missing correct option");
  }
  if (!d.rationale?.trim()) errs.push("missing rationale");
  else if (d.rationale.trim().length < 10) errs.push("rationale too short");
  return errs;
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
  const validationMode = "lenient";

  try {
    let evidenceMappingOk = false;
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
      const evidenceResult = await ensureContentEvidenceMetadata(entityType, entityId, config.trackSlug, {
        aiPrimarySlug: ext.primaryReference ?? null,
        aiGuidelineSlug: ext.guidelineReference ?? null,
        aiEvidenceTier: ext.evidenceTier ?? null,
        sourceFrameworkId: framework?.id ?? null,
      });
      evidenceMappingOk = evidenceResult.ok;
      await ensureSourceEvidenceForAIGeneratedContent(entityType, entityId);
      const sourceCheck = await hasValidSourceMapping(entityType, entityId, config.trackSlug);
      evidenceMappingOk = evidenceMappingOk && sourceCheck.valid;
    }

    if (process.env.NODE_ENV === "development" || process.env.DEBUG_AI_FACTORY === "1") {
      console.info("[bulk-persistence] applyQualityAndAutoPublish before", {
        entityType,
        entityId,
        validationMode,
        evidenceMappingOk,
      });
    }

    const quality = computeQuestionQualityScore(draft, { lenient: true });
    const medicalValidation = await validateQuestionMedically({
      stem: draft.stem ?? "",
      options: Array.isArray(draft.options)
        ? draft.options.map((o) => ({
            key: (o as { key?: string }).key ?? "A",
            text: (o as { text?: string }).text ?? "",
            isCorrect: (o as { isCorrect?: boolean }).isCorrect ?? false,
            distractorRationale: (o as { distractorRationale?: string }).distractorRationale,
          }))
        : [],
      rationale: (draft as { rationale?: string }).rationale ?? "",
      primaryReference: (draft as { primaryReference?: string }).primaryReference,
      guidelineReference: (draft as { guidelineReference?: string }).guidelineReference,
      system: (draft as { system?: string }).system,
      topic: (draft as { topic?: string }).topic,
    });
    const reviewFlags = computeReviewFlags({
      validationErrors: quality.validationErrors,
      validationStatus: quality.validationStatus,
      hasRationale: Boolean((draft as { rationale?: string }).rationale?.trim()),
      evidenceMappingOk,
      aiValidationPassed: medicalValidation.passed,
      aiValidationConfidence: medicalValidation.confidence,
      boardStyleMismatch: quality.validationErrors?.some((e) => /board|style|stem.*length/i.test(String(e))),
    });
    const noFlags = !reviewFlags.requires_editorial_review && !reviewFlags.requires_sme_review && !reviewFlags.requires_legal_review && !reviewFlags.requires_qa_review;
    const autoPublishEligible =
      noFlags && quality.autoPublishEligible && medicalValidation.passed && !medicalValidation.requiresHumanReview;
    const generationMetadata: Record<string, unknown> = {
      source: "ai_content_factory",
      ai_validation_passed: medicalValidation.passed,
      requires_human_review: medicalValidation.requiresHumanReview,
      ai_validation_confidence: medicalValidation.confidence,
      ai_validation_errors: medicalValidation.errors,
      ai_validation_warnings: medicalValidation.warnings,
      requires_editorial_review: reviewFlags.requires_editorial_review,
      requires_sme_review: reviewFlags.requires_sme_review,
      requires_legal_review: reviewFlags.requires_legal_review,
      requires_qa_review: reviewFlags.requires_qa_review,
    };

    if (process.env.NODE_ENV === "development" || process.env.DEBUG_AI_FACTORY === "1") {
      console.info("[bulk-persistence] applyQualityAndAutoPublish after", {
        qualityScore: quality.qualityScore,
        validationStatus: quality.validationStatus,
        autoPublishEligible,
        aiValidationPassed: medicalValidation.passed,
        hasReviewFlags: !noFlags,
      });
    }

    await upsertContentQualityMetadata(entityType, entityId, {
      qualityScore: quality.qualityScore,
      autoPublishEligible,
      validationStatus: quality.validationStatus,
      validationErrors: quality.validationErrors,
      generationMetadata,
    });
    await runAutoPublishFlow(entityType, entityId, "question", fromStatus, null, { reviewFlags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof Error && "code" in err ? String((err as { code?: string }).code) : "quality_flow_error";
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bulk-persistence] applyQualityAndAutoPublish failed:", msg);
    }
    if (isSupabaseServiceRoleConfigured()) {
      await upsertContentQualityMetadata(entityType, entityId, {
        qualityScore: 0,
        autoPublishEligible: false,
        validationStatus: "quality_flow_error",
        validationErrors: [{ message: msg, code }],
        generationMetadata: { source: "ai_content_factory", error: msg },
      });
    }
    // Fail gracefully: error stored above; do not re-throw to avoid batch disruption
  }
}

/** Auto-fill missing distractor rationale for wrong options (lenient bulk mode). */
function ensureDistractorRationales(
  payload: { options: { key?: string; text?: string; isCorrect?: boolean; distractorRationale?: string }[]; rationale?: string }
): void {
  const rationale = (payload.rationale ?? "").trim();
  const fallback = rationale.length >= 20 ? `Incorrect—see rationale.` : "Incorrect.";
  for (const o of payload.options ?? []) {
    if (o && !o.isCorrect && (!o.distractorRationale || !o.distractorRationale.trim())) {
      (o as { distractorRationale?: string }).distractorRationale = fallback;
    }
  }
}

/** Build question row + options, with stem_normalized_hash for dedupe */
function buildQuestionRows(
  item: BulkQuestionItem
): { questionRow: Record<string, unknown>; optionRows: Record<string, unknown>[]; stemHash: string } | null {
  const config = item.config;
  if (!config?.trackId?.trim()) return null;
  const draft = item.draft;
  const status = resolveStatus(config);
  let stem: string;
  let options: { option_key: string; option_text: string; is_correct: boolean; option_metadata: Record<string, unknown>; display_order: number }[];
  let stemMetadata: Record<string, unknown>;

  if (isExtendedQuestionOutput(draft)) {
    const payload = toQuestionPayload(draft);
    ensureDistractorRationales(payload);
    const validation = validateQuestionPayload(payload, { lenient: true });
    if (!validation.valid) return null;
    const normalized = normalizeQuestionPayload(payload, {
      exam_track_id: config.trackId,
      question_type_id: item.questionTypeId,
      domain_id: config.domainId,
      system_id: config.systemId,
      topic_id: config.topicId,
    });
    const archetype = extractArchetypeFromStem(normalized.question.stem, payload.rationale);
    stemMetadata = {
      ...normalized.question.stem_metadata,
      aiGenerated: true,
      source: "ai_content_factory",
      scenario_archetype: archetype,
    };
    stem = normalized.question.stem;
    options = normalized.options.map((o) => ({
      option_key: o.option_key,
      option_text: o.option_text ?? "",
      is_correct: o.is_correct,
      option_metadata: o.option_metadata,
      display_order: o.display_order,
    }));
  } else {
    const rationale = (draft as { rationale?: string }).rationale ?? "";
    const archetype = extractArchetypeFromStem(draft.stem, rationale);
    stemMetadata = {
      leadIn: draft.leadIn,
      instructions: draft.instructions,
      rationale: draft.rationale,
      aiGenerated: true,
      source: "ai_content_factory",
      scenario_archetype: archetype,
    };
    stem = draft.stem.trim();
    const drFallback = rationale.trim().length >= 20 ? "Incorrect—see rationale." : "Incorrect.";
    options = draft.options.map((opt, i) => {
      const optionMetadata: Record<string, unknown> = {};
      const dr = (opt as QuestionOptionOutput).distractorRationale?.trim();
      const useDr = dr || (!(opt as QuestionOptionOutput).isCorrect ? drFallback : undefined);
      if (useDr) optionMetadata.rationale = useDr;
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
    [QUESTIONS_TRACK_COLUMN]: config.trackId,
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

  const firstTrackId = items[0]?.config?.trackId;
  const missingTrackId = items.some((i) => !i.config?.trackId?.trim());
  if (missingTrackId) {
    const msg = "trackId required for AI content generation; every item must have config.trackId";
    if (process.env.NODE_ENV !== "production") {
      console.error("[bulk-persistence] validation failed:", msg, {
        itemCount: items.length,
        sampleConfig: items[0]?.config ? { trackId: items[0].config.trackId } : null,
      });
    }
    return { success: false, insertedCount: 0, duplicateCount: 0, failedCount: items.length, deadLetterCount: 0, contentIds: [], error: msg };
  }

  if (process.env.NODE_ENV === "development" || process.env.DEBUG_AI_FACTORY === "1") {
    console.info("[bulk-persistence] bulk_persist_start", {
      itemCount: items.length,
      trackId: firstTrackId,
      validationMode: "lenient",
      batchJobId: opts.batchJobId ?? null,
    });
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
      const item = items[i];
      const validationErrors = isExtendedQuestionOutput(item.draft)
        ? validateQuestionPayload(toQuestionPayload(item.draft), { lenient: true }).errors
        : getQuestionDraftValidationErrors(item.draft);
      const reason = validationErrors.length > 0 ? validationErrors.join("; ") : "Validation failed";
      await insertDeadLetter(
        "question",
        { config: item.config, draft: item.draft },
        reason,
        "invalid_output",
        batchJobId,
        { failingStage: "validation", validationReason: reason, missingFields: validationErrors }
      );
      deadLetterCount++;
    }
  }

  if (valid.length === 0) {
    return { success: true, insertedCount: 0, duplicateCount, failedCount, deadLetterCount, contentIds };
  }

  /** Group by scope so mixed topic/system-scoped batches dedupe correctly */
  function scopeKey(v: (typeof valid)[0]) {
    const c = v.item.config;
    return `${c.trackId}:${c.systemId ?? "null"}:${c.topicId ?? "null"}`;
  }
  type ValidItem = (typeof valid)[number];
  const groups = new Map<string, ValidItem[]>();
  for (const v of valid) {
    const k = scopeKey(v);
    const list = groups.get(k) ?? [];
    list.push(v);
    groups.set(k, list);
  }

  const allToInsert: ValidItem[] = [];
  for (const [, group] of groups) {
    const trackId = group[0].item.config.trackId;
    const topicId = group[0].item.config.topicId ?? null;
    const systemId = group[0].item.config.systemId ?? null;
    const scope = { examTrackId: trackId, systemId, topicId };

    const hashes = group.map((v) => v.built.stemHash);
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

    let toInsert = group.filter((v) => !registryDupSet.has(v.built.stemHash));

    const questionsDupSet = new Set<string>();
    let qDupQuery = supabase
      .from("questions")
      .select("stem_normalized_hash")
      .eq(QUESTIONS_TRACK_COLUMN, trackId)
      .in("stem_normalized_hash", toInsert.map((v) => v.built.stemHash));
    if (topicId) qDupQuery = qDupQuery.eq("topic_id", topicId);
    else {
      qDupQuery = qDupQuery.is("topic_id", null);
      if (systemId) qDupQuery = qDupQuery.eq("system_id", systemId);
    }
    const { data: existingHashes } = await qDupQuery;
    for (const r of existingHashes ?? []) {
      const h = (r as { stem_normalized_hash?: string }).stem_normalized_hash;
      if (h) questionsDupSet.add(h);
    }

    toInsert = toInsert.filter((v) => !questionsDupSet.has(v.built.stemHash));

    for (let i = toInsert.length - 1; i >= 0; i--) {
      const v = toInsert[i];
      const draft = v.item.draft;
      const dupResult = await checkQuestionDuplicate(
        {
          stem: (draft.stem ?? "").trim(),
          leadIn: (draft as { leadIn?: string }).leadIn,
          options: draft.options,
          rationale: (draft as { rationale?: string }).rationale,
        },
        { examTrackId: trackId, topicId, systemId }
      );
      if (dupResult.isDuplicate) {
        toInsert.splice(i, 1);
      }
    }
    allToInsert.push(...toInsert);
  }

  duplicateCount = valid.length - allToInsert.length;
  const toInsert = allToInsert;

  if (toInsert.length >= 3 && isSupabaseServiceRoleConfigured()) {
    const archetypes = toInsert
      .map((v) => (v.built.questionRow.stem_metadata as Record<string, unknown>)?.scenario_archetype)
      .filter((a): a is Record<string, unknown> => a != null && typeof a === "object");
    const varietyResult = checkBatchVariety(archetypes as import("@/lib/ai/scenario-diversification").ScenarioArchetype[]);
    if (!varietyResult.passed) {
      const supabase = createServiceClient();
      await supabase.from("ai_batch_job_logs").insert({
        batch_plan_id: batchPlanId ?? null,
        event_type: "variety_check_failed",
        message: `Batch has poor archetype variety: ${varietyResult.reasons.join("; ")}`,
        metadata: {
          score: varietyResult.score,
          reasons: varietyResult.reasons,
          archetypeCount: archetypes.length,
        },
        log_level: "warn",
      });
    }
  }

  const chunks = chunk(toInsert, CHUNK.questions);
  for (const ch of chunks) {
    const questionRows = ch.map((v) => ({
      ...v.built.questionRow,
      [QUESTIONS_TRACK_COLUMN]: v.item.config.trackId,
      stem_normalized_hash: v.built.stemHash,
    }));

    const { data: inserted, error: qErr } = await supabase.from("questions").insert(questionRows).select("id");

    if (qErr || !inserted?.length) {
      const msg = qErr?.message ?? "Insert failed";
      for (const v of ch) {
        await insertDeadLetter(
          "question",
          { questionRow: v.built.questionRow },
          msg,
          "db_failure",
          batchJobId,
          { failingStage: "questions_insert", validationReason: msg }
        );
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
          await insertDeadLetter(
            "question_option",
            row as unknown as Record<string, unknown>,
            optErr.message,
            "db_failure",
            batchJobId,
            { failingStage: "question_options_insert", validationReason: optErr.message }
          );
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
          scope: {
            examTrackId: v.item.config.trackId,
            systemId: v.item.config.systemId ?? null,
            topicId: v.item.config.topicId ?? null,
          },
          sourceTable: "questions",
          sourceId: qId,
          sourceStatus: status,
          normalizedTextPreview: prep.normalizedTextPreview,
          createdByBatchPlanId: batchPlanId ?? null,
        });
        const stem = (v.built.questionRow.stem as string) ?? "";
        storeStemEmbedding(qId, v.item.config.trackId, stem).catch(() => {});
        const draft = v.item.draft;
        storeContentEmbedding(qId, v.item.config.trackId, {
          stem,
          leadIn: (draft as { leadIn?: string }).leadIn,
          options: draft.options,
          rationale: (draft as { rationale?: string }).rationale,
        }).catch(() => {});
        const archetype = (v.built.questionRow.stem_metadata as Record<string, unknown>)?.scenario_archetype;
        if (archetype && typeof archetype === "object") {
          appendToGenerationMemory(
            buildScopeKey(v.item.config.trackId, v.item.config.systemId, v.item.config.topicId),
            archetype as Parameters<typeof appendToGenerationMemory>[1]
          ).catch(() => {});
        }
        applyQualityAndAutoPublish("question", qId, v.item.draft, status, v.item.config).catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[bulk-persistence] applyQualityAndAutoPublish failed:", err instanceof Error ? err.message : err);
          }
        });
      }
    } else if (insertedIds.length > 0) {
      await supabase.from("questions").delete().in("id", insertedIds);
    }
  }

  if (process.env.NODE_ENV === "development" || process.env.DEBUG_AI_FACTORY === "1") {
    console.info("[bulk-persistence] bulk_persist_done", {
      trackId: firstTrackId,
      insertedCount: contentIds.length,
      duplicateCount,
      failedCount,
      deadLetterCount,
      batchJobId: opts.batchJobId ?? null,
    });
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
        await insertDeadLetter(
          "flashcard",
          row as unknown as Record<string, unknown>,
          error.message,
          "db_failure",
          batchJobId,
          { failingStage: "flashcards_insert", validationReason: error.message }
        );
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
      await insertDeadLetter(
        "high_yield_content",
        { config: item.config, draft: item.draft },
        validation.errors.join("; "),
        "invalid_output",
        batchJobId,
        { failingStage: "validation", validationReason: validation.errors.join("; "), missingFields: validation.errors }
      );
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
        await insertDeadLetter(
          "high_yield_content",
          r.row,
          error?.message ?? "Insert failed",
          "db_failure",
          batchJobId,
          { failingStage: "high_yield_insert", validationReason: error?.message ?? "Insert failed" }
        );
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
