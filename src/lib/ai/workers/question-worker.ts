/**
 * Jade Tutor Question Generation Worker
 *
 * Generates original board-style questions and saves them safely to Supabase.
 * - Uses worker prompts with strong originality rules (no copyrighted content)
 * - Validates every item before save
 * - Dedupes by stem hash
 * - Bulk insert: questions, question_options, audit, source evidence
 * - Logs: generated, saved, failed, duplicates, retries
 */

import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai-client";
import { createServiceClient } from "@/lib/supabase/service";
import { buildWorkerQuestionPrompt, buildWorkerBatchPrompt } from "@/lib/ai/prompts/question-prompts";
import { validateGeneratedQuestion } from "@/lib/ai/validators/question-validator";
import {
  saveGeneratedQuestions,
  stemHash,
  stemRationaleHash,
  type SaveQuestionInput,
} from "@/lib/ai/persistence/save-generated-questions";
import { parseQuestionPayload } from "@/lib/ai/question-factory/parser";
import { extractJson } from "@/lib/ai/content-factory/parsers";
import type { ExamTrack, QuestionItemType } from "@/lib/ai/question-factory/types";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.6;
const MAX_RETRIES = 2;
const BATCH_SIZE = 5;

export interface QuestionWorkerInput {
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  targetCount: number;
  difficultyMix?: Record<number, number>;
  blueprintTags?: string[];
  questionTypeMix?: Record<string, number>;
  objectives?: string[];
  domainId?: string | null;
  batchJobId?: string | null;
  createdBy?: string | null;
}

export interface QuestionWorkerResult {
  success: boolean;
  generated: number;
  saved: number;
  failed: number;
  duplicates: number;
  retries: number;
  questionIds: string[];
  errors: string[];
  validationRules: string[];
  insertStrategy: string;
}

const VALIDATION_RULES = [
  "Minimum stem length: 80 chars (120 for SBA/case_study)",
  "Minimum 4 options for SBA, 4 for multiple_response",
  "Exactly one correct for single_best_answer",
  "Multiple correct for multiple_response",
  "Rationale present (min 100 chars)",
  "examTrackId and systemId required",
];

const INSERT_STRATEGY = `Bulk insert: questions → question_options → question_adaptive_profiles → question_skill_tags → ai_generation_audit → content_source_evidence (original). Dedupe by normalized stem hash before insert.`;

/** Pick item type from mix (default: single_best_answer) */
function pickItemType(mix: Record<string, number> | undefined): QuestionItemType {
  if (!mix || Object.keys(mix).length === 0) return "single_best_answer";
  const r = Math.random();
  let acc = 0;
  for (const [slug, pct] of Object.entries(mix)) {
    acc += pct / 100;
    if (r < acc) return slug as QuestionItemType;
  }
  return "single_best_answer";
}

/** Pick difficulty from mix (1-5) */
function pickDifficulty(mix: Record<number, number> | undefined): 1 | 2 | 3 | 4 | 5 {
  if (!mix || Object.keys(mix).length === 0) return 3;
  const r = Math.random();
  let acc = 0;
  for (let d = 1; d <= 5; d++) {
    acc += (mix[d] ?? 0) / 100;
    if (r < acc) return d as 1 | 2 | 3 | 4 | 5;
  }
  return 3;
}

const questionTypeCache = new Map<string, string>();

/** Resolve question_type_id from slug (cached) */
async function resolveQuestionTypeId(slug: string): Promise<string | null> {
  const cached = questionTypeCache.get(slug);
  if (cached) return cached;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("question_types")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    const id = data?.id ?? null;
    if (id) questionTypeCache.set(slug, id);
    return id;
  } catch {
    return null;
  }
}

/** Generate a single question via OpenAI */
async function generateOneQuestion(
  track: ExamTrack,
  itemType: QuestionItemType,
  context: QuestionWorkerInput & { difficulty?: number; objective?: string },
  systemName?: string,
  topicName?: string
): Promise<{ raw: string; parsed: unknown } | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const { system, user } = buildWorkerQuestionPrompt(track, itemType, {
    examTrackId: context.examTrackId,
    systemId: context.systemId,
    topicId: context.topicId,
    systemName: systemName ?? undefined,
    topicName: topicName ?? undefined,
    objectives: context.objectives,
    blueprintTags: context.blueprintTags,
    difficultyMix: context.difficultyMix,
    questionTypeMix: context.questionTypeMix,
    domain: undefined,
    system: systemName,
    topic: topicName,
    objective: context.objective ?? context.objectives?.[0],
    difficulty: context.difficulty,
  });

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

  const parsed = parseQuestionPayload(content) ?? extractJson<Record<string, unknown>>(content);
  return parsed ? { raw: content, parsed } : null;
}

/** Generate a batch of questions (up to BATCH_SIZE) */
async function generateBatch(
  track: ExamTrack,
  itemType: QuestionItemType,
  context: QuestionWorkerInput & { difficulty?: number },
  count: number,
  systemName?: string,
  topicName?: string
): Promise<unknown[]> {
  const client = getOpenAIClient();
  if (!client) return [];

  const { system, user } = buildWorkerBatchPrompt(track, itemType, {
    ...context,
    systemName: systemName ?? undefined,
    topicName: topicName ?? undefined,
    difficulty: pickDifficulty(context.difficultyMix),
  }, count);

  const res = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: MAX_TOKENS * 2,
    temperature: TEMPERATURE,
  });

  const content = res.choices[0]?.message?.content?.trim();
  if (!content) return [];

  const arr = extractJson<unknown[]>(content);
  if (Array.isArray(arr)) return arr.filter((x) => x && typeof x === "object" && (x as Record<string, unknown>).stem);

  const single = extractJson<Record<string, unknown>>(content);
  if (single?.stem) return [single];
  return [];
}

/**
 * Run the question generation worker.
 * Generates original questions, validates, dedupes, and bulk-saves.
 */
export async function runQuestionGenerationWorker(
  input: QuestionWorkerInput
): Promise<QuestionWorkerResult> {
  const result: QuestionWorkerResult = {
    success: false,
    generated: 0,
    saved: 0,
    failed: 0,
    duplicates: 0,
    retries: 0,
    questionIds: [],
    errors: [],
    validationRules: VALIDATION_RULES,
    insertStrategy: INSERT_STRATEGY,
  };

  if (!isOpenAIConfigured()) {
    result.errors.push("AI service not configured");
    return result;
  }

  const trackSlug = await (async () => {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase.from("exam_tracks").select("slug").eq("id", input.examTrackId).single();
      return (data?.slug ?? "rn") as ExamTrack;
    } catch {
      return "rn" as ExamTrack;
    }
  })();

  const systemName = await (async () => {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase.from("systems").select("name").eq("id", input.systemId).single();
      return data?.name ?? undefined;
    } catch {
      return undefined;
    }
  })();

  const topicName = input.topicId
    ? await (async () => {
        try {
          const supabase = createServiceClient();
          const { data } = await supabase.from("topics").select("name").eq("id", input.topicId!).single();
          return data?.name ?? undefined;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const allParsed: unknown[] = [];
  const targetCount = Math.max(1, input.targetCount ?? 1);

  for (let i = 0; i < targetCount; i += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, targetCount - i);
    const itemType = pickItemType(input.questionTypeMix);
    const difficulty = pickDifficulty(input.difficultyMix);
    const objective = input.objectives?.[i % (input.objectives?.length ?? 1)];

    let batch: unknown[] = [];
    let retries = 0;

    while (batch.length < batchCount && retries <= MAX_RETRIES) {
      if (batchCount === 1) {
        const one = await generateOneQuestion(
          trackSlug,
          itemType,
          { ...input, difficulty, objective },
          systemName,
          topicName
        );
        if (one) batch = [one.parsed];
      } else {
        batch = await generateBatch(
          trackSlug,
          itemType,
          { ...input, difficulty },
          batchCount,
          systemName,
          topicName
        );
      }

      if (batch.length > 0) break;
      retries++;
      result.retries++;
    }

    result.generated += batch.length;
    allParsed.push(...batch);
  }

  const questionTypeSlug = pickItemType(input.questionTypeMix);
  const questionTypeId = await resolveQuestionTypeId(questionTypeSlug);
  if (!questionTypeId) {
    result.errors.push(`Question type '${questionTypeSlug}' not found`);
    return result;
  }

  const context = {
    examTrackId: input.examTrackId,
    systemId: input.systemId,
    topicId: input.topicId ?? null,
  };

  const toSave: SaveQuestionInput[] = [];

  for (const raw of allParsed) {
    const validation = validateGeneratedQuestion(raw, context);
    if (!validation.valid) {
      result.failed++;
      result.errors.push(`Validation: ${validation.errors.join("; ")}`);
      continue;
    }
    if (!validation.data) continue;

    toSave.push({
      question: validation.data,
      examTrackId: input.examTrackId,
      systemId: input.systemId,
      topicId: input.topicId ?? null,
      questionTypeId: await resolveQuestionTypeId(validation.data.itemType) ?? questionTypeId,
      domainId: input.domainId ?? null,
      batchJobId: input.batchJobId ?? null,
      createdBy: input.createdBy ?? null,
    });
  }

  const saveResult = await saveGeneratedQuestions(toSave);
  result.saved = saveResult.saved;
  result.failed += saveResult.failed;
  result.duplicates = saveResult.duplicates;
  result.questionIds = saveResult.questionIds;
  result.errors.push(...saveResult.errors);

  result.success = result.saved > 0 || (result.generated === 0 && result.errors.length === 0);

  return result;
}

export { stemHash, stemRationaleHash };
