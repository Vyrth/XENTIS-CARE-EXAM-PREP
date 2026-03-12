/**
 * AI Content Factory - Batch Plan Content-Type Processors
 *
 * Each processor:
 * - Resolves track/system/topic scope
 * - Builds generation prompts via toContentFactoryRequest
 * - Calls Jade Tutor generation
 * - Validates output, dedupes, saves draft/editor_review only
 * - Logs to ai_batch_job_logs
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { generateContent } from "@/lib/ai/content-factory";
import { toContentFactoryRequest } from "@/lib/ai/content-factory/adapter";
import {
  saveAIQuestionsBulk,
  saveAIStudyGuideSectionPack,
  saveAIFlashcardDeck,
  saveAIHighYieldContent,
} from "@/lib/admin/ai-factory-persistence";
import { recordGenerationAudit } from "@/lib/ai/audit-logging";
import { validateGenerationConfig } from "@/lib/ai/factory/validation";
import { loadAllTopicsForAdmin, loadSystemsForTrackAdmin } from "@/lib/admin/question-studio-loaders";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { StudyGuideSectionPackOutput } from "@/lib/ai/content-factory/types";
import type { HighYieldDraft } from "@/lib/ai/factory/persistence";
import type { BatchPlanRow } from "./batch-plan-worker";
import { BULK_CHUNK_SIZES } from "./factory/bulk-persistence-config";

/** Chunk sizes per content type */
const CHUNK_SIZES = {
  question: { min: 5, max: 20, default: 10 },
  study_guide: 1,
  flashcard_deck: 1,
  flashcard_batch: 1,
  high_yield_summary: 1,
  high_yield_batch: { min: 1, max: 3, default: 2 },
} as const;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickDifficulty(): 1 | 2 | 3 | 4 | 5 {
  const r = Math.random();
  if (r < 0.2) return 1;
  if (r < 0.5) return 2;
  if (r < 0.8) return 3;
  if (r < 0.95) return 4;
  return 5;
}

export interface BatchPlanProcessorContext {
  batchPlan: BatchPlanRow;
  rateLimitMs: number;
  questionTypeId: string;
  onLog: (eventType: string, message?: string, metadata?: Record<string, unknown>) => void;
  updateProgress: (updates: {
    generated_count?: number;
    saved_count?: number;
    failed_count?: number;
    duplicate_count?: number;
    retry_count?: number;
  }) => Promise<void>;
  runWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface ProcessorResult {
  saved: number;
  failed: number;
  duplicate: number;
  generated: number;
}

/** Resolve topics for batch plan scope */
async function resolveTopicsForBatchPlan(batchPlan: BatchPlanRow): Promise<
  { id: string; name: string; systemId?: string; systemName?: string }[]
> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const allTopics = await loadAllTopicsForAdmin();
  const systems = await loadSystemsForTrackAdmin(batchPlan.exam_track_id);
  const trackSystemIds = new Set(systems.map((s) => s.id));
  const systemMap = new Map(systems.map((s) => [s.id, s.name]));

  let filtered = allTopics.filter((t) =>
    (t.systemIds ?? []).some((sid) => trackSystemIds.has(sid))
  );

  if (batchPlan.topic_id) {
    filtered = filtered.filter((t) => t.id === batchPlan.topic_id);
  }
  if (batchPlan.system_id) {
    filtered = filtered.filter((t) =>
      (t.systemIds ?? []).includes(batchPlan.system_id!)
    );
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

/** Load track slug */
async function loadTrackSlug(trackId: string): Promise<string> {
  if (!isSupabaseServiceRoleConfigured()) return "rn";
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("slug")
    .eq("id", trackId)
    .single();
  return (data?.slug ?? "rn").toLowerCase();
}

/** Build base GenerationConfig from batch plan */
async function buildBaseConfig(batchPlan: BatchPlanRow): Promise<GenerationConfig> {
  const trackSlug = await loadTrackSlug(batchPlan.exam_track_id);
  let systemName: string | undefined;
  let topicName: string | undefined;

  if (batchPlan.system_id || batchPlan.topic_id) {
    const supabase = createServiceClient();
    if (batchPlan.system_id) {
      const { data: s } = await supabase
        .from("systems")
        .select("name")
        .eq("id", batchPlan.system_id)
        .single();
      systemName = s?.name;
    }
    if (batchPlan.topic_id) {
      const { data: t } = await supabase
        .from("topics")
        .select("name")
        .eq("id", batchPlan.topic_id)
        .single();
      topicName = t?.name;
    }
  }

  return {
    trackId: batchPlan.exam_track_id,
    trackSlug: trackSlug as "lvn" | "rn" | "fnp" | "pmhnp",
    saveStatus: "draft",
    systemId: batchPlan.system_id ?? undefined,
    systemName,
    topicId: batchPlan.topic_id ?? undefined,
    topicName,
    itemTypeSlug: "single_best_answer",
    studyGuideMode: "section_pack",
    sectionCount: 4,
    flashcardDeckMode: "rapid_recall",
    flashcardStyle: "rapid_recall",
    cardCount: 15,
    highYieldType: "high_yield_summary",
  };
}

/** Process question batch plan - 5-20 per chunk */
export async function processQuestionBatchPlan(
  ctx: BatchPlanProcessorContext
): Promise<ProcessorResult> {
  const { batchPlan, rateLimitMs, questionTypeId, onLog, updateProgress, runWithRetry } = ctx;
  const topics = await resolveTopicsForBatchPlan(batchPlan);
  if (topics.length === 0) {
    onLog("validation_failed", "No topics found for track scope");
    return { saved: 0, failed: 0, duplicate: 0, generated: 0 };
  }

  const baseConfig = await buildBaseConfig(batchPlan);
  const targetCount = batchPlan.target_count;
  const remaining = targetCount - batchPlan.saved_count - batchPlan.failed_count - batchPlan.duplicate_count;
  const chunkSize = Math.min(
    Math.max(CHUNK_SIZES.question.min, Math.min(remaining, CHUNK_SIZES.question.max)),
    remaining
  );
  if (chunkSize <= 0) return { saved: 0, failed: 0, duplicate: 0, generated: 0 };

  onLog("chunk_started", `Generating ${chunkSize} questions`, { chunkSize });

  const questionBuffer: Array<{
    config: GenerationConfig;
    draft: import("@/lib/ai/admin-drafts/types").QuestionDraftOutput | import("@/lib/ai/content-factory/parsers").ExtendedQuestionOutput;
    questionTypeId: string;
    auditId?: string | null;
    createdBy?: string | null;
  }> = [];

  let saved = 0;
  let failed = 0;
  let duplicate = 0;
  let generated = 0;

  const perTopic = Math.max(1, Math.ceil(chunkSize / topics.length));
  for (const topic of topics) {
    if (saved + failed + duplicate >= chunkSize) break;
    const need = Math.min(perTopic, chunkSize - saved - failed - duplicate);
    for (let i = 0; i < need; i++) {
      const config: GenerationConfig = {
        ...baseConfig,
        topicId: topic.id,
        topicName: topic.name,
        systemId: topic.systemId,
        systemName: topic.systemName,
        targetDifficulty: pickDifficulty(),
      };
      const validation = validateGenerationConfig(config, "question");
      if (!validation.success) {
        failed++;
        onLog("validation_failed", validation.errors.join("; "));
        continue;
      }
      await delay(rateLimitMs);
      try {
        const req = toContentFactoryRequest(config, "question");
        const result = await runWithRetry(() => generateContent(req));
        if (!result.success || result.output?.mode !== "question") {
          failed++;
          onLog("generation_failed", result.error);
          continue;
        }
        generated++;
        const auditId = await recordGenerationAudit({
          contentType: "question",
          config,
          createdBy: null,
          generationCount: 1,
        });
        questionBuffer.push({
          config,
          draft: result.output!.data,
          questionTypeId,
          auditId,
          createdBy: null,
        });
        if (questionBuffer.length >= BULK_CHUNK_SIZES.questions) {
          const bulk = await saveAIQuestionsBulk(
            questionBuffer.map((b) => ({
              config: b.config,
              draft: b.draft,
              questionTypeId: b.questionTypeId,
              auditId: b.auditId,
              createdBy: b.createdBy,
            })),
            { batchPlanId: batchPlan.id }
          );
          saved += bulk.insertedCount;
          duplicate += bulk.duplicateCount;
          failed += bulk.failedCount;
          if (bulk.duplicateCount > 0) {
            onLog("duplicate_skipped", `${bulk.duplicateCount} duplicates skipped`);
          }
          questionBuffer.length = 0;
        }
      } catch (e) {
        failed++;
        onLog("generation_failed", String(e));
      }
      await updateProgress({
        generated_count: batchPlan.generated_count + generated,
        saved_count: batchPlan.saved_count + saved,
        failed_count: batchPlan.failed_count + failed,
        duplicate_count: batchPlan.duplicate_count + duplicate,
      });
    }
  }

  if (questionBuffer.length > 0) {
    const bulk = await saveAIQuestionsBulk(
      questionBuffer.map((b) => ({
        config: b.config,
        draft: b.draft,
        questionTypeId: b.questionTypeId,
        auditId: b.auditId,
        createdBy: b.createdBy,
      })),
      { batchPlanId: batchPlan.id }
    );
    saved += bulk.insertedCount;
    duplicate += bulk.duplicateCount;
    failed += bulk.failedCount;
  }

  onLog("chunk_completed", `Saved: ${saved}, Failed: ${failed}, Duplicate: ${duplicate}`, {
    saved,
    failed,
    duplicate,
    generated,
  });

  return { saved, failed, duplicate, generated };
}

/** Process study guide batch plan - 1 per chunk */
export async function processStudyGuideBatchPlan(
  ctx: BatchPlanProcessorContext
): Promise<ProcessorResult> {
  const { batchPlan, rateLimitMs, onLog, updateProgress, runWithRetry } = ctx;
  const topics = await resolveTopicsForBatchPlan(batchPlan);
  if (topics.length === 0) {
    onLog("validation_failed", "No topics found");
    return { saved: 0, failed: 0, duplicate: 0, generated: 0 };
  }

  const baseConfig = await buildBaseConfig(batchPlan);
  const remaining = batchPlan.target_count - batchPlan.saved_count - batchPlan.failed_count - batchPlan.duplicate_count;
  const count = Math.min(CHUNK_SIZES.study_guide, remaining);
  if (count <= 0) return { saved: 0, failed: 0, duplicate: 0, generated: 0 };

  onLog("chunk_started", `Generating ${count} study guide(s)`, { count });

  let saved = 0;
  let failed = 0;
  let duplicate = 0;
  let generated = 0;

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const config: GenerationConfig = {
      ...baseConfig,
      topicId: topic.id,
      topicName: topic.name,
      systemId: topic.systemId,
      systemName: topic.systemName,
    };
    await delay(rateLimitMs);
    try {
      const req = toContentFactoryRequest(config, "study_guide_section_pack", {
        sectionCount: baseConfig.sectionCount ?? 4,
      });
      const result = await runWithRetry(() => generateContent(req));
      if (!result.success || !result.output) {
        failed++;
        onLog("generation_failed", result.error);
        continue;
      }
      generated++;
      const output = result.output;
      const auditId = await recordGenerationAudit({
        contentType: "study_guide_section_pack",
        config,
        createdBy: null,
        generationCount: (output.data as { sections?: unknown[] }).sections?.length ?? 1,
      });
      const pack = output.data as StudyGuideSectionPackOutput;
      const guideTitle = `Study Guide - ${topic.name}`;
      const persist = await saveAIStudyGuideSectionPack(config, pack, guideTitle, auditId, {
        batchPlanId: batchPlan.id,
        campaignId: batchPlan.campaign_id ?? undefined,
        shardId: batchPlan.shard_id ?? undefined,
      });
      if (persist.success) saved++;
      else if (persist.duplicate) {
        duplicate++;
        onLog("duplicate_skipped", "Study guide duplicate skipped");
      } else {
        failed++;
        onLog("save_error", persist.error);
      }
    } catch (e) {
      failed++;
      onLog("generation_failed", String(e));
    }
    await updateProgress({
      generated_count: batchPlan.generated_count + generated,
      saved_count: batchPlan.saved_count + saved,
      failed_count: batchPlan.failed_count + failed,
      duplicate_count: batchPlan.duplicate_count + duplicate,
    });
  }

  onLog("chunk_completed", `Saved: ${saved}, Failed: ${failed}, Duplicate: ${duplicate}`, { saved, failed, duplicate, generated });
  return { saved, failed, duplicate, generated };
}

/** Process flashcard batch plan - 1 deck per chunk */
export async function processFlashcardBatchPlan(
  ctx: BatchPlanProcessorContext
): Promise<ProcessorResult> {
  const { batchPlan, rateLimitMs, onLog, updateProgress, runWithRetry } = ctx;
  const topics = await resolveTopicsForBatchPlan(batchPlan);
  if (topics.length === 0) {
    onLog("validation_failed", "No topics found");
    return { saved: 0, failed: 0, duplicate: 0, generated: 0 };
  }

  const baseConfig = await buildBaseConfig(batchPlan);
  const isBatch = batchPlan.content_type === "flashcard_batch";
  const targetCount = isBatch ? batchPlan.target_count : 1;
  const remaining = targetCount - batchPlan.saved_count - batchPlan.failed_count - batchPlan.duplicate_count;
  const count = Math.min(CHUNK_SIZES.flashcard_batch, remaining);
  if (count <= 0) return { saved: 0, failed: 0, duplicate: 0, generated: 0 };

  onLog("chunk_started", `Generating ${count} flashcard deck(s)`, { count });

  let saved = 0;
  let failed = 0;
  let duplicate = 0;
  let generated = 0;

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const config: GenerationConfig = {
      ...baseConfig,
      topicId: topic.id,
      topicName: topic.name,
      systemId: topic.systemId,
      systemName: topic.systemName,
      cardCount: isBatch ? 20 : 15,
    };
    await delay(rateLimitMs);
    try {
      const req = toContentFactoryRequest(config, "flashcard_deck", {
        quantity: config.cardCount ?? 15,
      });
      const result = await runWithRetry(() => generateContent(req));
      if (!result.success || result.output?.mode !== "flashcard_deck") {
        failed += isBatch ? (config.cardCount ?? 15) : 1;
        onLog("generation_failed", result.error);
        continue;
      }
      const deck = result.output!.data;
      const cardCount = deck.cards?.length ?? 0;
      generated += cardCount;
      const auditId = await recordGenerationAudit({
        contentType: "flashcard_deck",
        config,
        createdBy: null,
        generationCount: cardCount,
      });
      const persist = await saveAIFlashcardDeck(config, deck, auditId, {
        batchPlanId: batchPlan.id,
        campaignId: batchPlan.campaign_id ?? undefined,
        shardId: batchPlan.shard_id ?? undefined,
      });
      if (persist.success) saved += isBatch ? cardCount : 1;
      else if (persist.duplicate) {
        duplicate += 1;
        onLog("duplicate_skipped", "Flashcard deck duplicate skipped");
      } else {
        failed += isBatch ? cardCount : 1;
        onLog("save_error", persist.error);
      }
    } catch (e) {
      failed += isBatch ? (baseConfig.cardCount ?? 15) : 1;
      onLog("generation_failed", String(e));
    }
    await updateProgress({
      generated_count: batchPlan.generated_count + generated,
      saved_count: batchPlan.saved_count + saved,
      failed_count: batchPlan.failed_count + failed,
      duplicate_count: batchPlan.duplicate_count + duplicate,
    });
  }

  onLog("chunk_completed", `Saved: ${saved}, Failed: ${failed}, Duplicate: ${duplicate}`, { saved, failed, duplicate, generated });
  return { saved, failed, duplicate, generated };
}

/** Process high-yield batch plan - 1-3 per chunk */
export async function processHighYieldBatchPlan(
  ctx: BatchPlanProcessorContext
): Promise<ProcessorResult> {
  const { batchPlan, rateLimitMs, onLog, updateProgress, runWithRetry } = ctx;
  const topics = await resolveTopicsForBatchPlan(batchPlan);
  if (topics.length === 0) {
    onLog("validation_failed", "No topics found");
    return { saved: 0, failed: 0, duplicate: 0, generated: 0 };
  }

  const baseConfig = await buildBaseConfig(batchPlan);
  const chunkCfg = CHUNK_SIZES.high_yield_batch;
  const remaining = batchPlan.target_count - batchPlan.saved_count - batchPlan.failed_count - batchPlan.duplicate_count;
  const count = Math.min(
    typeof chunkCfg === "number" ? chunkCfg : chunkCfg.default,
    remaining
  );
  if (count <= 0) return { saved: 0, failed: 0, duplicate: 0, generated: 0 };

  onLog("chunk_started", `Generating ${count} high-yield item(s)`, { count });

  let duplicate = 0;
  const hyTypes = [
    "high_yield_summary",
    "common_confusion",
    "board_trap",
    "compare_contrast_summary",
  ] as const;

  let saved = 0;
  let failed = 0;
  let generated = 0;

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const hyType = hyTypes[i % hyTypes.length];
    const config: GenerationConfig = {
      ...baseConfig,
      topicId: topic.id,
      topicName: topic.name,
      systemId: topic.systemId,
      systemName: topic.systemName,
      highYieldType: hyType,
    };
    await delay(rateLimitMs);
    try {
      const contentMode =
        hyType === "compare_contrast_summary" ? "compare_contrast" : hyType;
      const req = toContentFactoryRequest(
        config,
        contentMode as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast"
      );
      const result = await runWithRetry(() => generateContent(req));
      if (!result.success || !result.output) {
        failed++;
        onLog("generation_failed", result.error);
        continue;
      }
      const mode = result.output.mode;
      const validModes = ["high_yield_summary", "common_confusion", "board_trap", "compare_contrast"];
      if (!validModes.includes(mode)) {
        failed++;
        onLog("validation_failed", "Invalid output mode");
        continue;
      }
      generated++;
      const dbType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary" =
        mode === "compare_contrast" ? "compare_contrast_summary" : (mode as "high_yield_summary" | "common_confusion" | "board_trap");
      const auditId = await recordGenerationAudit({
        contentType: dbType,
        config,
        createdBy: null,
        generationCount: 1,
      });
      const persist = await saveAIHighYieldContent(
        config,
        result.output.data as HighYieldDraft,
        dbType,
        auditId,
        { batchPlanId: batchPlan.id, campaignId: batchPlan.campaign_id ?? undefined, shardId: batchPlan.shard_id ?? undefined }
      );
      if (persist.success) saved++;
      else if (persist.duplicate) {
        duplicate++;
        onLog("duplicate_skipped", "High-yield duplicate skipped");
      } else {
        failed++;
        onLog("save_error", persist.error);
      }
    } catch (e) {
      failed++;
      onLog("generation_failed", String(e));
    }
    await updateProgress({
      generated_count: batchPlan.generated_count + generated,
      saved_count: batchPlan.saved_count + saved,
      failed_count: batchPlan.failed_count + failed,
      duplicate_count: batchPlan.duplicate_count + duplicate,
    });
  }

  onLog("chunk_completed", `Saved: ${saved}, Failed: ${failed}, Duplicate: ${duplicate}`, { saved, failed, duplicate, generated });
  return { saved, failed, duplicate, generated };
}
