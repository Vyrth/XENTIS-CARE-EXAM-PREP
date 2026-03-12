/**
 * AI Content Factory - Batch Generation Engine
 *
 * Runs controlled batch generation for track-scoped content.
 * - Single track per job (no mixed-track contamination)
 * - Progress tracking via ai_batch_jobs
 * - Duplicate stem reduction for questions
 * - All output saved as draft
 */

import { createServiceClient } from "@/lib/supabase/service";
import { BULK_CHUNK_SIZES as BULK_CHUNK } from "@/lib/ai/factory/bulk-persistence-config";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { generateContent } from "@/lib/ai/content-factory";
import { toContentFactoryRequest } from "@/lib/ai/content-factory/adapter";
import {
  saveAIQuestion,
  saveAIQuestionsBulk,
  saveAIStudyGuide,
  saveAIStudyGuideSectionPack,
  saveAIFlashcardDeck,
  saveAIHighYieldContent,
} from "@/lib/admin/ai-factory-persistence";
import { recordGenerationAudit } from "@/lib/ai/audit-logging";
import { getBackoffMs } from "@/lib/ai/production-pipeline-config";
import type { HighYieldDraft } from "@/lib/ai/factory/persistence";
import { validateGenerationConfig } from "@/lib/ai/factory/validation";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { StudyGuideSectionPackOutput } from "@/lib/ai/content-factory/types";
import { loadAllTopicsForAdmin, loadSystemsForTrackAdmin } from "@/lib/admin/question-studio-loaders";

export type BatchContentType = "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch";
export type BatchJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface BatchJobSpec {
  trackId: string;
  trackSlug: string;
  contentType: BatchContentType;
  topicIds?: string[];
  systemIds?: string[];
  targetCount: number;
  quantityPerTopic?: number;
  difficultyDistribution?: Record<number, number>;
  boardFocus?: string;
  itemTypeSlug?: string;
  studyGuideMode?: "full" | "section_pack";
  sectionCount?: number;
  flashcardDeckMode?: "rapid_recall" | "high_yield_clinical";
  flashcardStyle?: string;
  cardCount?: number;
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
}

export interface BatchJobProgress {
  jobId: string;
  status: BatchJobStatus;
  completedCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  generatedCount?: number;
  retryCount?: number;
  targetCount: number;
  currentTopic?: string;
  errorMessage?: string;
}

export interface BatchJobSchedulerOptions {
  /** Delay between API calls (ms) to prevent overload */
  rateLimitMs?: number;
  /** Max retries per failed generation */
  maxRetries?: number;
  /** Log callback for audit */
  onLog?: (jobId: string, eventType: string, message?: string, metadata?: Record<string, unknown>) => void | Promise<void>;
}

export interface BatchJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  progress?: BatchJobProgress;
}

/** Pick difficulty from distribution (1-5) */
function pickDifficulty(dist: Record<number, number> | undefined): 1 | 2 | 3 | 4 | 5 {
  if (!dist || Object.keys(dist).length === 0) return 3;
  const r = Math.random();
  let acc = 0;
  for (let d = 1; d <= 5; d++) {
    acc += dist[d] ?? 0;
    if (r < acc) return d as 1 | 2 | 3 | 4 | 5;
  }
  return 3;
}

/** Resolve topic IDs for batch: from spec or all topics for track's systems */
async function resolveTopicIds(
  trackId: string,
  topicIds?: string[],
  systemIds?: string[]
): Promise<{ id: string; name: string; systemId?: string; systemName?: string }[]> {
  const allTopics = await loadAllTopicsForAdmin();
  const systems = systemIds?.length
    ? (await loadSystemsForTrackAdmin(trackId)).filter((s) => systemIds.includes(s.id))
    : await loadSystemsForTrackAdmin(trackId);
  const trackSystemIds = new Set(systems.map((s) => s.id));
  const systemMap = new Map(systems.map((s) => [s.id, s.name]));
  let filtered = allTopics.filter((t) => t.systemIds?.some((sid) => trackSystemIds.has(sid)));
  if (topicIds?.length) {
    filtered = filtered.filter((t) => topicIds.includes(t.id));
  }
  return filtered.map((t) => {
    const sid = t.systemIds?.[0];
    return {
      id: t.id,
      name: t.name,
      systemId: sid,
      systemName: sid ? systemMap.get(sid) : undefined,
    };
  });
}

/** Create batch job record */
export async function createBatchJob(spec: BatchJobSpec, createdBy: string | null): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_batch_jobs")
      .insert({
        exam_track_id: spec.trackId,
        content_type: spec.contentType,
        topic_ids: spec.topicIds ?? [],
        system_ids: spec.systemIds ?? [],
        target_count: spec.targetCount,
        quantity_per_topic: spec.quantityPerTopic ?? null,
        difficulty_distribution: spec.difficultyDistribution ?? {},
        board_focus: spec.boardFocus ?? null,
        item_type_slug: spec.itemTypeSlug ?? "single_best_answer",
        study_guide_mode: spec.studyGuideMode ?? "section_pack",
        section_count: spec.sectionCount ?? 4,
        flashcard_deck_mode: spec.flashcardDeckMode ?? "rapid_recall",
        flashcard_style: spec.flashcardStyle ?? "rapid_recall",
        card_count: spec.cardCount ?? 8,
        high_yield_type: spec.highYieldType ?? "high_yield_summary",
        status: "pending",
        created_by: createdBy,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Update batch job progress */
async function updateBatchProgress(
  jobId: string,
  updates: {
    completedCount?: number;
    failedCount?: number;
    skippedDuplicateCount?: number;
    generatedCount?: number;
    retryCount?: number;
    status?: BatchJobStatus;
    errorMessage?: string;
    completedAt?: string;
  }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.completedCount != null) payload.completed_count = updates.completedCount;
    if (updates.failedCount != null) payload.failed_count = updates.failedCount;
    if (updates.skippedDuplicateCount != null) payload.skipped_duplicate_count = updates.skippedDuplicateCount;
    if (updates.generatedCount != null) payload.generated_count = updates.generatedCount;
    if (updates.retryCount != null) payload.retry_count = updates.retryCount;
    if (updates.status) payload.status = updates.status;
    if (updates.errorMessage != null) payload.error_message = updates.errorMessage;
    if (updates.completedAt) payload.completed_at = updates.completedAt;
    await supabase.from("ai_batch_jobs").update(payload).eq("id", jobId);
  } catch {
    // ignore
  }
}

/** Get batch job progress */
export async function getBatchJobProgress(jobId: string): Promise<BatchJobProgress | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_batch_jobs")
      .select("id, status, completed_count, failed_count, skipped_duplicate_count, generated_count, retry_count, target_count, error_message")
      .eq("id", jobId)
      .single();
    if (!data) return null;
    return {
      jobId: data.id,
      status: data.status as BatchJobStatus,
      completedCount: data.completed_count ?? 0,
      failedCount: data.failed_count ?? 0,
      skippedDuplicateCount: data.skipped_duplicate_count ?? 0,
      generatedCount: data.generated_count ?? 0,
      retryCount: data.retry_count ?? 0,
      targetCount: data.target_count ?? 0,
      errorMessage: data.error_message ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Run batch generation (blocking - call from server action) */
export async function runBatchJob(
  jobId: string,
  questionTypeId: string,
  onProgress?: (p: BatchJobProgress) => void,
  schedulerOptions?: BatchJobSchedulerOptions
): Promise<BatchJobResult> {
  const rateLimitMs = schedulerOptions?.rateLimitMs ?? 0;
  const maxRetries = schedulerOptions?.maxRetries ?? 0;
  const onLog = schedulerOptions?.onLog;
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const { data: job } = await supabase.from("ai_batch_jobs").select("*").eq("id", jobId).single();
  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "pending" && job.status !== "running") {
    return { success: false, error: `Job not runnable (status: ${job.status})` };
  }

  // If pending (e.g. "Run now" from UI), transition to running. If already running (claimed by scheduler), no-op.
  if (job.status === "pending") {
    await supabase
      .from("ai_batch_jobs")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  const trackId = job.exam_track_id;
  const createdBy = (job.created_by as string) ?? null;
  const campaignId = (job.campaign_id as string) ?? undefined;
  const trackSlug = (await supabase.from("exam_tracks").select("slug").eq("id", trackId).single()).data?.slug ?? "rn";
  const contentType = job.content_type as BatchContentType;
  const targetCount = job.target_count;
  const topicIds = (job.topic_ids as string[]) ?? [];
  const systemIds = (job.system_ids as string[]) ?? [];
  const quantityPerTopic = job.quantity_per_topic as number | null;
  const difficultyDist = (job.difficulty_distribution as Record<number, number>) ?? {};
  const boardFocus = job.board_focus as string | null;
  const itemTypeSlug = (job.item_type_slug as string) ?? "single_best_answer";
  const studyGuideMode = (job.study_guide_mode as "full" | "section_pack") ?? "section_pack";
  const sectionCount = (job.section_count as number) ?? 4;
  const flashcardDeckMode = (job.flashcard_deck_mode as "rapid_recall" | "high_yield_clinical") ?? "rapid_recall";
  const flashcardStyle = (job.flashcard_style as string) ?? "rapid_recall";
  const cardCount = (job.card_count as number) ?? 20;
  const highYieldType = (job.high_yield_type as string) ?? "high_yield_summary";

  let completed = 0;
  let failed = 0;
  let skippedDup = 0;
  let generatedCount = 0;
  let retryCount = 0;

  const emitProgress = () => {
    maybeLogProgress();
    const p: BatchJobProgress = {
      jobId,
      status: "running",
      completedCount: completed,
      failedCount: failed,
      skippedDuplicateCount: skippedDup,
      generatedCount,
      targetCount,
    };
    onProgress?.(p);
  };

  const maybeLogProgress = () => {
    const total = completed + failed + skippedDup;
    if (total > 0 && total % 5 === 0) {
      onLog?.(jobId, "progress", `Generated: ${generatedCount}, Saved: ${completed}, Failed: ${failed}`, {
        generatedCount,
        completedCount: completed,
        failedCount: failed,
        skippedDuplicateCount: skippedDup,
      });
    }
  };

  const maybeRateLimit = () => (rateLimitMs > 0 ? delay(rateLimitMs) : Promise.resolve());
  const runWithRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          retryCount++;
          await updateBatchProgress(jobId, { retryCount });
          await onLog?.(jobId, "retry", `Succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries) {
          retryCount++;
          await updateBatchProgress(jobId, { retryCount });
          const backoffMs = getBackoffMs(attempt);
          await onLog?.(jobId, "retry", `Attempt ${attempt + 1} failed, retrying in ${backoffMs}ms...`, { error: String(e) });
          await delay(backoffMs);
        }
      }
    }
    throw lastErr;
  };

  try {
    const topics = await resolveTopicIds(trackId, topicIds.length ? topicIds : undefined, systemIds.length ? systemIds : undefined);
    if (topics.length === 0) {
      await updateBatchProgress(jobId, { status: "failed", errorMessage: "No topics found for track" });
      return { success: false, error: "No topics found for track", jobId };
    }

    const baseConfig: GenerationConfig = {
      trackId,
      trackSlug: trackSlug as "lvn" | "rn" | "fnp" | "pmhnp",
      saveStatus: "draft",
      itemTypeSlug: itemTypeSlug,
      boardFocus: boardFocus ?? undefined,
      studyGuideMode,
      sectionCount,
      flashcardDeckMode,
      flashcardStyle,
      cardCount,
      highYieldType: highYieldType as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary",
    };

    if (contentType === "question") {
      type QuestionDraft = import("@/lib/ai/admin-drafts/types").QuestionDraftOutput | import("@/lib/ai/content-factory/parsers").ExtendedQuestionOutput;
      const questionBuffer: Array<{
        config: GenerationConfig;
        draft: QuestionDraft;
        questionTypeId: string;
        auditId?: string | null;
        createdBy?: string | null;
      }> = [];
      const flushQuestionBuffer = async () => {
        if (questionBuffer.length === 0) return;
        const bulkResult = await saveAIQuestionsBulk(
          questionBuffer.map((b) => ({
            config: b.config,
            draft: b.draft,
            questionTypeId: b.questionTypeId,
            auditId: b.auditId,
            createdBy: b.createdBy,
          })),
          { batchJobId: jobId, campaignId }
        );
        completed += bulkResult.insertedCount;
        skippedDup += bulkResult.duplicateCount;
        failed += bulkResult.failedCount;
        if (bulkResult.deadLetterCount > 0) {
          onLog?.(jobId, "dead_letter", `${bulkResult.deadLetterCount} rows in dead letter`, { deadLetterCount: bulkResult.deadLetterCount });
        }
        questionBuffer.length = 0;
      };

      const perTopic = quantityPerTopic ?? Math.max(1, Math.ceil(targetCount / topics.length));
      let qGenerated = 0;
      for (const topic of topics) {
        if (qGenerated >= targetCount) break;
        const need = Math.min(perTopic, targetCount - qGenerated);
        for (let i = 0; i < need; i++) {
          const config: GenerationConfig = {
            ...baseConfig,
            topicId: topic.id,
            topicName: topic.name,
            systemId: topic.systemId,
            systemName: topic.systemName,
            targetDifficulty: pickDifficulty(difficultyDist),
          };
          const validation = validateGenerationConfig(config, "question");
          if (!validation.success) {
            failed++;
            emitProgress();
            continue;
          }
          await maybeRateLimit();
          const doGen = async () => {
            const req = toContentFactoryRequest(config, "question");
            return generateContent(req);
          };
          const maxDuplicateRetries = 2;
          let attempts = 0;
          let result: Awaited<ReturnType<typeof generateContent>>;
          while (attempts <= maxDuplicateRetries) {
            attempts++;
            result = maxRetries > 0 ? await runWithRetry(doGen) : await doGen();
            if (!result.success || result.output?.mode !== "question") {
              failed++;
              onLog?.(jobId, "generation_failed", result.error, {
                errorCode: result.errorCode ?? "unknown",
                error: result.error,
              });
              break;
            }
            generatedCount++;
            const auditId = await recordGenerationAudit({
              contentType: "question",
              config,
              createdBy,
              generationCount: 1,
              batchJobId: jobId,
            });
            questionBuffer.push({
              config,
              draft: result.output!.data,
              questionTypeId,
              auditId,
              createdBy,
            });
            if (questionBuffer.length >= BULK_CHUNK.questions) {
              await flushQuestionBuffer();
            }
            break;
          }
          await updateBatchProgress(jobId, {
            completedCount: completed,
            failedCount: failed,
            skippedDuplicateCount: skippedDup,
            generatedCount,
          });
          emitProgress();
        }
        qGenerated += need;
      }
      await flushQuestionBuffer();
    } else if (contentType === "study_guide") {
      const count = Math.min(targetCount, topics.length);
      for (let i = 0; i < count; i++) {
        await maybeRateLimit();
        const topic = topics[i % topics.length];
        const config: GenerationConfig = {
          ...baseConfig,
          topicId: topic.id,
          topicName: topic.name,
          systemId: topic.systemId,
        };
        const mode = studyGuideMode === "full" ? "study_guide" : "study_guide_section_pack";
        const req = toContentFactoryRequest(config, mode, { sectionCount });
        const result = await generateContent(req);
        if (!result.success) {
          failed++;
          onLog?.(jobId, "generation_failed", result.error, {
            errorCode: result.errorCode ?? "unknown",
            error: result.error,
          });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        generatedCount++;
        const output = result.output!;
        const auditContentType = output.mode === "study_guide" ? "study_guide" : "study_guide_section_pack";
        const auditId = await recordGenerationAudit({
          contentType: auditContentType,
          config,
          createdBy,
          generationCount: (output.data as { sections?: unknown[] }).sections?.length ?? 1,
          batchJobId: jobId,
        });
        if (output.mode === "study_guide") {
          const persist = await saveAIStudyGuide(config, output.data, auditId);
          if (persist.success) completed++;
          else {
            failed++;
            onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
          }
        } else {
          const pack = output.data as StudyGuideSectionPackOutput;
          const guideTitle = `Study Guide - ${topic.name}`;
          const persist = await saveAIStudyGuideSectionPack(config, pack, guideTitle, auditId, { campaignId });
          if (persist.success) completed++;
          else {
            failed++;
            onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
          }
        }
        await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
        emitProgress();
      }
    } else if (contentType === "flashcard_deck") {
      const count = Math.min(targetCount, topics.length);
      for (let i = 0; i < count; i++) {
        await maybeRateLimit();
        const topic = topics[i % topics.length];
        const config: GenerationConfig = {
          ...baseConfig,
          topicId: topic.id,
          topicName: topic.name,
          systemId: topic.systemId,
        };
        const req = toContentFactoryRequest(config, "flashcard_deck");
        const result = await generateContent(req);
        if (!result.success || result.output?.mode !== "flashcard_deck") {
          failed++;
          onLog?.(jobId, "generation_failed", result.error, {
            errorCode: result.errorCode ?? "unknown",
            error: result.error,
          });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        generatedCount++;
        const deck = result.output.data;
        const auditId = await recordGenerationAudit({
          contentType: "flashcard_deck",
          config,
          createdBy,
          generationCount: deck.cards?.length ?? 0,
          batchJobId: jobId,
        });
        const persist = await saveAIFlashcardDeck(config, deck, auditId, { campaignId });
        if (persist.success) completed++;
        else {
          failed++;
          onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
        }
        await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
        emitProgress();
      }
    } else if (contentType === "flashcard_batch") {
      const cardsPerDeck = Math.min(Math.max(cardCount, 15), 25);
      let cardsCompleted = 0;
      const cardTarget = targetCount;
      let topicIndex = 0;
      while (cardsCompleted < cardTarget) {
        await maybeRateLimit();
        const topic = topics[topicIndex % topics.length];
        topicIndex++;
        const config: GenerationConfig = {
          ...baseConfig,
          topicId: topic.id,
          topicName: topic.name,
          systemId: topic.systemId,
        };
        const req = toContentFactoryRequest(config, "flashcard_deck", { quantity: cardsPerDeck });
        const result = await generateContent(req);
        if (!result.success || result.output?.mode !== "flashcard_deck") {
          failed += cardsPerDeck;
          onLog?.(jobId, "generation_failed", result.error, {
            errorCode: result.errorCode ?? "unknown",
            error: result.error,
          });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        const deck = result.output.data;
        const cardCountThisDeck = deck.cards?.length ?? 0;
        generatedCount += cardCountThisDeck;
        const auditId = await recordGenerationAudit({
          contentType: "flashcard_deck",
          config,
          createdBy,
          generationCount: cardCountThisDeck,
          batchJobId: jobId,
        });
        const persist = await saveAIFlashcardDeck(config, deck, auditId, { campaignId });
        if (persist.success) {
          cardsCompleted += cardCountThisDeck;
          completed += cardCountThisDeck;
        } else {
          failed += cardCountThisDeck;
          onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
        }
        await updateBatchProgress(jobId, {
          completedCount: completed,
          failedCount: failed,
          generatedCount,
        });
        emitProgress();
        if (cardsCompleted >= cardTarget) break;
      }
    } else if (contentType === "high_yield_summary") {
      const count = Math.min(targetCount, topics.length);
      for (let i = 0; i < count; i++) {
        await maybeRateLimit();
        const topic = topics[i % topics.length];
        const config: GenerationConfig = {
          ...baseConfig,
          topicId: topic.id,
          topicName: topic.name,
          systemId: topic.systemId,
        };
        const contentMode = highYieldType === "compare_contrast_summary" ? "compare_contrast" : highYieldType;
        const req = toContentFactoryRequest(config, contentMode as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast");
        const result = await generateContent(req);
        if (!result.success || !result.output) {
          failed++;
          onLog?.(jobId, "generation_failed", result.error, {
            errorCode: result.errorCode ?? "unknown",
            error: result.error,
          });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        const mode = result.output.mode;
        const validModes = ["high_yield_summary", "common_confusion", "board_trap", "compare_contrast"];
        if (!validModes.includes(mode)) {
          failed++;
          onLog?.(jobId, "generation_failed", "Invalid output mode", { errorCode: "invalid_output" });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        generatedCount++;
        const auditId = await recordGenerationAudit({
          contentType: mode,
          config,
          createdBy,
          generationCount: 1,
          batchJobId: jobId,
        });
        const persist = await saveAIHighYieldContent(
          config,
          result.output.data as HighYieldDraft,
          mode as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary",
          auditId,
          { campaignId }
        );
        if (persist.success) completed++;
        else {
          failed++;
          onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
        }
        await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
        emitProgress();
      }
    } else if (contentType === "high_yield_batch") {
      const HY_TYPES: ("high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary")[] = [
        "high_yield_summary",
        "common_confusion",
        "board_trap",
        "compare_contrast_summary",
      ];
      let topicIndex = 0;
      let typeIndex = 0;
      while (completed < targetCount) {
        await maybeRateLimit();
        const topic = topics[topicIndex % topics.length];
        const hyType = HY_TYPES[typeIndex % HY_TYPES.length];
        topicIndex++;
        typeIndex++;
        const config: GenerationConfig = {
          ...baseConfig,
          topicId: topic.id,
          topicName: topic.name,
          systemId: topic.systemId,
        };
        const contentMode = hyType === "compare_contrast_summary" ? "compare_contrast" : hyType;
        const req = toContentFactoryRequest(config, contentMode as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast");
        const result = await generateContent(req);
        if (!result.success || !result.output) {
          failed++;
          onLog?.(jobId, "generation_failed", result.error, {
            errorCode: result.errorCode ?? "unknown",
            error: result.error,
          });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        const mode = result.output.mode;
        const validModes = ["high_yield_summary", "common_confusion", "board_trap", "compare_contrast"];
        if (!validModes.includes(mode)) {
          failed++;
          onLog?.(jobId, "generation_failed", "Invalid output mode", { errorCode: "invalid_output" });
          await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
          emitProgress();
          continue;
        }
        generatedCount++;
        const dbType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary" =
          mode === "compare_contrast" ? "compare_contrast_summary" : (mode as "high_yield_summary" | "common_confusion" | "board_trap");
        const auditId = await recordGenerationAudit({
          contentType: dbType,
          config,
          createdBy,
          generationCount: 1,
          batchJobId: jobId,
        });
        const persist = await saveAIHighYieldContent(
          config,
          result.output.data as HighYieldDraft,
          dbType,
          auditId,
          { campaignId }
        );
        if (persist.success) completed++;
        else {
          failed++;
          onLog?.(jobId, "save_error", persist.error ?? "Save failed", { errorCode: "db_failure" });
        }
        await updateBatchProgress(jobId, { completedCount: completed, failedCount: failed, generatedCount });
        emitProgress();
      }
    }

    const status: BatchJobStatus = failed > 0 && completed === 0 ? "failed" : "completed";
    await updateBatchProgress(jobId, {
      status,
      completedAt: new Date().toISOString(),
    });

    const progress = await getBatchJobProgress(jobId);
    return { success: true, jobId, progress: progress ?? undefined };
  } catch (e) {
    const errMsg = String(e);
    const lower = errMsg.toLowerCase();
    const errorCode =
      lower.includes("rate limit") || lower.includes("429")
        ? "provider_rate_limit"
        : lower.includes("timeout") || lower.includes("etimedout")
          ? "provider_timeout"
          : lower.includes("circuit") || lower.includes("paused")
            ? "provider_rate_limit"
            : "unknown";
    onLog?.(jobId, "failed", errMsg, { error: errMsg, errorCode });
    await updateBatchProgress(jobId, {
      status: "failed",
      errorMessage: errMsg,
      completedAt: new Date().toISOString(),
    });
    return { success: false, error: errMsg, jobId };
  }
}
