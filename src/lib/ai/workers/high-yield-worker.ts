/**
 * Jade Tutor High-Yield Content Generation Worker
 *
 * Generates high-yield content using correct enum values only:
 * - high_yield_summary
 * - common_confusion
 * - board_trap
 * - compare_contrast_summary
 *
 * Tied to exam_track_id, system_id, topic_id.
 * Supports dedupe, retries, batch logs, bulk save, audit.
 */

import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai-client";
import { createServiceClient } from "@/lib/supabase/service";
import { buildHighYieldPrompt } from "@/lib/ai/prompts/high-yield-prompts";
import { validateHighYieldPayload } from "@/lib/ai/high-yield-factory";
import { checkHighYieldTitleDuplicate } from "@/lib/ai/dedupe-utils";
import { saveAIHighYieldContent } from "@/lib/admin/ai-factory-persistence";
import { recordGenerationAudit } from "@/lib/ai/audit-logging";
import { extractJson } from "@/lib/ai/content-factory/parsers";
import type { HighYieldContentType } from "@/lib/ai/high-yield-factory/types";
import type { ExamTrack } from "@/lib/ai/high-yield-factory/types";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { HighYieldDraft } from "@/lib/ai/factory/persistence";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.6;
const MAX_RETRIES = 2;

const VALID_CONTENT_TYPES: HighYieldContentType[] = [
  "high_yield_summary",
  "common_confusion",
  "board_trap",
  "compare_contrast_summary",
];

const VALID_CONFUSION_FREQUENCIES = ["common", "very_common", "extremely_common"] as const;

export interface HighYieldWorkerInput {
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  targetCount: number;
  typeMix?: Partial<Record<HighYieldContentType, number>>;
  saveStatus?: "draft" | "editor_review";
  batchJobId?: string | null;
  createdBy?: string | null;
}

export interface HighYieldWorkerResult {
  success: boolean;
  generated: number;
  saved: number;
  failed: number;
  duplicates: number;
  retries: number;
  contentIds: string[];
  errors: string[];
  validationRules: string[];
  saveFlow: string;
}

const VALIDATION_RULES = [
  "title required, min 2 chars",
  "high_yield_summary: explanation required",
  "common_confusion: explanation required",
  "board_trap: trapDescription, correctApproach required",
  "compare_contrast_summary: conceptA, conceptB, keyDifference required",
  "confusionFrequency: common | very_common | extremely_common only",
  "examTrackId and systemId required",
];

const SAVE_FLOW = `high_yield_content → ai_generation_audit → content_source_evidence (if required). Dedupe by title within track/topic.`;

function pickContentType(mix: Partial<Record<string, number>> | undefined): HighYieldContentType {
  if (!mix || Object.keys(mix).length === 0) return "high_yield_summary";
  const valid = Object.keys(mix).filter((k) =>
    VALID_CONTENT_TYPES.includes(k as HighYieldContentType)
  );
  if (valid.length === 0) return "high_yield_summary";
  const r = Math.random();
  let acc = 0;
  for (const slug of valid) {
    acc += (mix[slug] ?? 0) / 100;
    if (r < acc) return slug as HighYieldContentType;
  }
  return valid[0] as HighYieldContentType;
}

function normalizeConfusionFrequency(v: unknown): "common" | "very_common" | "extremely_common" | undefined {
  const s = String(v ?? "").toLowerCase().trim();
  if (VALID_CONFUSION_FREQUENCIES.includes(s as (typeof VALID_CONFUSION_FREQUENCIES)[number])) {
    return s as "common" | "very_common" | "extremely_common";
  }
  return undefined;
}

async function resolveTrackSlug(examTrackId: string): Promise<ExamTrack> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("exam_tracks").select("slug").eq("id", examTrackId).single();
    return (data?.slug ?? "rn") as ExamTrack;
  } catch {
    return "rn" as ExamTrack;
  }
}

async function resolveNames(
  systemId: string,
  topicId?: string | null
): Promise<{ systemName?: string; topicName?: string }> {
  try {
    const supabase = createServiceClient();
    const [sysRes, topicRes] = await Promise.all([
      systemId ? supabase.from("systems").select("name").eq("id", systemId).single() : { data: null },
      topicId ? supabase.from("topics").select("name").eq("id", topicId).single() : { data: null },
    ]);
    return {
      systemName: sysRes?.data?.name ?? undefined,
      topicName: topicRes?.data?.name ?? undefined,
    };
  } catch {
    return {};
  }
}

async function generateOneItem(
  track: ExamTrack,
  contentType: HighYieldContentType,
  context: { system?: string; topic?: string }
): Promise<HighYieldDraft | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const { system, user } = buildHighYieldPrompt(track, contentType, context);

  const res = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  const content = res.choices[0]?.message?.content?.trim();
  if (!content) return null;

  const parsed = extractJson<Record<string, unknown>>(content);
  if (!parsed?.title || typeof parsed.title !== "string") return null;

  const freq = normalizeConfusionFrequency(parsed.confusionFrequency);
  if (contentType === "common_confusion" && parsed.confusionFrequency && !freq) {
    parsed.confusionFrequency = "common";
  }

  const draft = parsed as unknown as HighYieldDraft;
  const validation = validateHighYieldPayload(draft, contentType);
  if (!validation.valid) return null;

  return draft;
}

export async function runHighYieldWorker(
  input: HighYieldWorkerInput
): Promise<HighYieldWorkerResult> {
  const result: HighYieldWorkerResult = {
    success: false,
    generated: 0,
    saved: 0,
    failed: 0,
    duplicates: 0,
    retries: 0,
    contentIds: [],
    errors: [],
    validationRules: VALIDATION_RULES,
    saveFlow: SAVE_FLOW,
  };

  if (!isOpenAIConfigured()) {
    result.errors.push("AI service not configured");
    return result;
  }

  const trackSlug = await resolveTrackSlug(input.examTrackId);
  const { systemName, topicName } = await resolveNames(input.systemId, input.topicId ?? null);

  const config: GenerationConfig = {
    trackId: input.examTrackId,
    trackSlug,
    systemId: input.systemId,
    systemName,
    topicId: input.topicId ?? undefined,
    topicName: topicName ?? undefined,
    highYieldType: "high_yield_summary",
    saveStatus: input.saveStatus ?? "draft",
  };

  const targetCount = Math.max(1, input.targetCount ?? 1);

  for (let i = 0; i < targetCount; i++) {
    const contentType = pickContentType(input.typeMix);

    let draft: HighYieldDraft | null = null;
    let attempts = 0;

    while (attempts <= MAX_RETRIES) {
      draft = await generateOneItem(trackSlug, contentType, {
        system: systemName,
        topic: topicName,
      });
      if (draft) break;
      attempts++;
      result.retries++;
    }

    if (!draft) {
      result.failed++;
      result.errors.push(`${contentType} ${i + 1}: generation failed after ${MAX_RETRIES + 1} attempts`);
      continue;
    }

    result.generated++;

    const title = (draft as { title?: string }).title?.trim() ?? "";
    const isDup = await checkHighYieldTitleDuplicate(
      input.examTrackId,
      input.topicId ?? null,
      title
    );
    if (isDup) {
      result.duplicates++;
      continue;
    }

    const auditId = await recordGenerationAudit({
      contentType,
      config: { ...config, highYieldType: contentType },
      createdBy: input.createdBy ?? null,
      generationCount: 1,
      promptVersion: "high-yield-worker-v1",
      batchJobId: input.batchJobId ?? null,
    });

    const persist = await saveAIHighYieldContent(
      { ...config, highYieldType: contentType },
      draft,
      contentType,
      auditId
    );

    if (persist.duplicate) {
      result.duplicates++;
    } else if (persist.success && persist.contentId) {
      result.saved++;
      result.contentIds.push(persist.contentId);
    } else {
      result.failed++;
      result.errors.push(persist.error ?? "Save failed");
    }
  }

  result.success = result.saved > 0 || (result.generated === 0 && result.errors.length === 0);
  return result;
}
