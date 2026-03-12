/**
 * Jade Tutor Study Guide Generation Worker
 *
 * Generates track-specific study guides with:
 * - title, summary (description)
 * - key concepts (keyTakeaways)
 * - red flags (commonConfusions)
 * - interventions (clinicalPearls)
 * - common pitfalls (commonConfusions)
 * - exam pearls (clinicalPearls)
 * - status: draft or editor_review
 *
 * Tied to exam_track_id, system_id, topic_id.
 * Supports dedupe, retries, batch logs, bulk save, audit.
 */

import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai-client";
import { createServiceClient } from "@/lib/supabase/service";
import { buildStudyGuidePrompt } from "@/lib/ai/prompts/study-guide-prompts";
import { validateStudyGuidePayload } from "@/lib/ai/study-guide-factory";
import { checkGuideTitleDuplicate } from "@/lib/ai/dedupe-utils";
import { saveAIStudyGuide } from "@/lib/admin/ai-factory-persistence";
import { recordGenerationAudit } from "@/lib/ai/audit-logging";
import { extractJson } from "@/lib/ai/content-factory/parsers";
import type { StudyGuideOutput } from "@/lib/ai/content-factory/types";
import type { ExamTrack } from "@/lib/ai/study-guide-factory/types";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 8192;
const TEMPERATURE = 0.6;
const MAX_RETRIES = 2;

export interface StudyGuideWorkerInput {
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  targetCount: number;
  sectionCount?: number;
  boardFocus?: string;
  saveStatus?: "draft" | "editor_review";
  batchJobId?: string | null;
  createdBy?: string | null;
}

export interface StudyGuideWorkerResult {
  success: boolean;
  generated: number;
  saved: number;
  failed: number;
  duplicates: number;
  retries: number;
  guideIds: string[];
  errors: string[];
  validationRules: string[];
  saveFlow: string;
}

const VALIDATION_RULES = [
  "title required, min 3 chars",
  "description required, min 10 chars",
  "sections required, min 1",
  "Each section: title, contentMarkdown required",
  "examTrackId and systemId required",
];

const SAVE_FLOW = `study_guides → study_material_sections → ai_generation_audit → content_source_evidence (if required). Dedupe by title within track/system/topic.`;

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

async function generateOneGuide(
  track: ExamTrack,
  context: { system?: string; topic?: string; boardFocus?: string; sectionCount?: number }
): Promise<StudyGuideOutput | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const { system, user } = buildStudyGuidePrompt(track, context);

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

  const parsed = extractJson<StudyGuideOutput>(content);
  if (!parsed?.title || !Array.isArray(parsed.sections) || parsed.sections.length < 1) return null;

  const validation = validateStudyGuidePayload(parsed);
  if (!validation.valid) return null;

  return parsed;
}

export async function runStudyGuideWorker(
  input: StudyGuideWorkerInput
): Promise<StudyGuideWorkerResult> {
  const result: StudyGuideWorkerResult = {
    success: false,
    generated: 0,
    saved: 0,
    failed: 0,
    duplicates: 0,
    retries: 0,
    guideIds: [],
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
    boardFocus: input.boardFocus,
    sectionCount: Math.min(Math.max(input.sectionCount ?? 4, 2), 8),
    studyGuideMode: "full",
    saveStatus: input.saveStatus ?? "draft",
  };

  const targetCount = Math.min(Math.max(1, input.targetCount), 20);

  for (let i = 0; i < targetCount; i++) {
    let guide: StudyGuideOutput | null = null;
    let attempts = 0;

    while (attempts <= MAX_RETRIES) {
      guide = await generateOneGuide(trackSlug, {
        system: systemName,
        topic: topicName,
        boardFocus: input.boardFocus,
        sectionCount: config.sectionCount,
      });
      if (guide) break;
      attempts++;
      result.retries++;
    }

    if (!guide) {
      result.failed++;
      result.errors.push(`Guide ${i + 1}: generation failed after ${MAX_RETRIES + 1} attempts`);
      continue;
    }

    result.generated++;

    const isDup = await checkGuideTitleDuplicate(
      input.examTrackId,
      input.systemId,
      input.topicId ?? null,
      guide.title.trim()
    );
    if (isDup) {
      result.duplicates++;
      continue;
    }

    const auditId = await recordGenerationAudit({
      contentType: "study_guide",
      config,
      createdBy: input.createdBy ?? null,
      generationCount: guide.sections.length,
      promptVersion: "study-guide-worker-v1",
      batchJobId: input.batchJobId ?? null,
    });

    const persist = await saveAIStudyGuide(config, guide, auditId);

    if (persist.duplicate) {
      result.duplicates++;
    } else if (persist.success && persist.contentId) {
      result.saved++;
      result.guideIds.push(persist.contentId);
    } else {
      result.failed++;
      result.errors.push(persist.error ?? "Save failed");
    }
  }

  result.success = result.saved > 0 || (result.generated === 0 && result.errors.length === 0);
  return result;
}
