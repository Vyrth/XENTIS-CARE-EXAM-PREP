/**
 * Jade Tutor Question Worker - bulk persistence.
 *
 * Saves validated questions to Supabase:
 * - questions
 * - question_options
 * - ai_generation_audit
 * - content_source_evidence (placeholder for original AI content)
 * - question_adaptive_profiles
 * - question_skill_tags
 *
 * Uses normalized stem hash and stem+rationale hash for dedupe.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { normalizeForHash, simpleHash } from "@/lib/ai/dedupe-utils";
import type { ValidatedQuestion } from "@/lib/ai/validators/question-validator";
import {
  extractArchetypeFromStem,
  buildScopeKey,
  appendToGenerationMemory,
} from "@/lib/ai/scenario-diversification";

const MODEL_USED = "gpt-4o-mini";
const PROMPT_VERSION = "question-worker-v1";

export interface SaveQuestionInput {
  question: ValidatedQuestion;
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  questionTypeId: string;
  domainId?: string | null;
  batchJobId?: string | null;
  createdBy?: string | null;
}

export interface SaveQuestionsResult {
  saved: number;
  failed: number;
  duplicates: number;
  questionIds: string[];
  errors: string[];
}

/**
 * Compute stem hash for dedupe (normalized stem only).
 */
export function stemHash(stem: string): string {
  return simpleHash(normalizeForHash(stem));
}

/**
 * Compute stem+rationale hash for stronger dedupe.
 */
export function stemRationaleHash(stem: string, rationale: string): string {
  return simpleHash(normalizeForHash(stem) + "|" + normalizeForHash(rationale));
}

/**
 * Fetch existing stem hashes for the track scope to filter duplicates.
 */
async function fetchExistingHashes(
  supabase: ReturnType<typeof createServiceClient>,
  examTrackId: string,
  systemId: string,
  topicId?: string | null,
  limit = 300
): Promise<Set<string>> {
  let q = supabase
    .from("questions")
    .select("stem, stem_metadata")
    .eq("exam_track_id", examTrackId)
    .eq("system_id", systemId)
    .not("stem", "is", null)
    .limit(limit);

  if (topicId) q = q.eq("topic_id", topicId);
  else q = q.is("topic_id", null);

  const { data } = await q.order("created_at", { ascending: false });
  const hashes = new Set<string>();
  for (const row of data ?? []) {
    const s = (row as { stem?: string }).stem;
    if (s) hashes.add(stemHash(s));
  }
  return hashes;
}

/**
 * Build stem_metadata for a validated question.
 */
function buildStemMetadata(q: ValidatedQuestion): Record<string, unknown> {
  const archetype = extractArchetypeFromStem(q.stem, q.rationale);
  const meta: Record<string, unknown> = {
    leadIn: q.leadIn,
    instructions: q.instructions,
    rationale: q.rationale,
    aiGenerated: true,
    source: "jade_question_worker",
    learningObjective: q.learningObjective,
    teachingPoint: q.teachingPoint,
    boardRelevance: q.boardRelevance,
    mnemonic: q.mnemonic,
    scenario_archetype: archetype,
  };
  return Object.fromEntries(Object.entries(meta).filter(([, v]) => v != null && v !== ""));
}

/**
 * Bulk save validated questions.
 * Dedupes by stem hash before insert.
 * Returns saved count, failed count, duplicates, and question IDs.
 */
export async function saveGeneratedQuestions(
  inputs: SaveQuestionInput[]
): Promise<SaveQuestionsResult> {
  const result: SaveQuestionsResult = {
    saved: 0,
    failed: 0,
    duplicates: 0,
    questionIds: [],
    errors: [],
  };

  if (!isSupabaseServiceRoleConfigured()) {
    result.errors.push("Supabase not configured");
    return result;
  }

  if (inputs.length === 0) return result;

  const supabase = createServiceClient();
  const examTrackId = inputs[0]!.examTrackId;
  const systemId = inputs[0]!.systemId;
  const topicId = inputs[0]!.topicId ?? null;

  const existingHashes = await fetchExistingHashes(supabase, examTrackId, systemId, topicId);
  const toInsert: SaveQuestionInput[] = [];

  for (const inp of inputs) {
    const h = stemHash(inp.question.stem);
    if (existingHashes.has(h)) {
      result.duplicates++;
      continue;
    }
    toInsert.push(inp);
    existingHashes.add(h);
  }

  for (const inp of toInsert) {
    try {
      const stemMeta = buildStemMetadata(inp.question);

      const { data: qRow, error: qErr } = await supabase
        .from("questions")
        .insert({
          exam_track_id: inp.examTrackId,
          question_type_id: inp.questionTypeId,
          domain_id: inp.domainId ?? null,
          system_id: inp.systemId,
          topic_id: inp.topicId ?? null,
          stem: inp.question.stem.trim(),
          stem_metadata: stemMeta,
          status: "draft",
        })
        .select("id")
        .single();

      if (qErr || !qRow) {
        result.failed++;
        result.errors.push(`Question insert: ${qErr?.message ?? "Unknown error"}`);
        continue;
      }

      const questionId = (qRow as { id: string }).id;

      let optionsOk = true;
      for (let i = 0; i < inp.question.options.length; i++) {
        const opt = inp.question.options[i]!;
        const optMeta: Record<string, unknown> = {};
        if (opt.distractorRationale) optMeta.rationale = opt.distractorRationale;

        const { error: optErr } = await supabase.from("question_options").insert({
          question_id: questionId,
          option_key: opt.key,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          option_metadata: Object.keys(optMeta).length > 0 ? optMeta : {},
          display_order: i,
        });

        if (optErr) {
          await supabase.from("questions").delete().eq("id", questionId);
          result.failed++;
          result.errors.push(`Options: ${optErr.message}`);
          optionsOk = false;
          break;
        }
      }
      if (!optionsOk) continue;

      const archetype = stemMeta.scenario_archetype;
      if (archetype && typeof archetype === "object") {
        appendToGenerationMemory(
          buildScopeKey(inp.examTrackId, inp.systemId, inp.topicId),
          archetype as Parameters<typeof appendToGenerationMemory>[1]
        ).catch(() => {});
      }

      if (inp.question.difficulty >= 1 && inp.question.difficulty <= 5) {
        await supabase.from("question_adaptive_profiles").upsert(
          { question_id: questionId, difficulty_tier: inp.question.difficulty },
          { onConflict: "question_id" }
        );
      }

      if (Array.isArray(inp.question.tags) && inp.question.tags.length > 0) {
        const seen = new Set<string>();
        const tagRows = inp.question.tags
          .map((tag) => {
            const slug = String(tag).trim().toLowerCase().replace(/\s+/g, "_").slice(0, 64) || "tag";
            if (seen.has(slug)) return null;
            seen.add(slug);
            return { question_id: questionId, skill_slug: slug, skill_name: String(tag).trim().slice(0, 128) || slug };
          })
          .filter((r): r is NonNullable<typeof r> => r != null);
        if (tagRows.length > 0) {
          await supabase.from("question_skill_tags").upsert(tagRows, {
            onConflict: "question_id,skill_slug",
          });
        }
      }

      const genParams = {
        aiGenerated: true,
        source: "jade_question_worker",
        trackId: inp.examTrackId,
        systemId: inp.systemId,
        topicId: inp.topicId,
        itemType: inp.question.itemType,
        difficulty: inp.question.difficulty,
        promptVersion: PROMPT_VERSION,
      };

      await supabase.from("ai_generation_audit").insert({
        content_type: "question",
        content_id: questionId,
        generation_params: genParams,
        model_used: MODEL_USED,
        created_by: inp.createdBy ?? null,
        outcome: "saved",
        ...(inp.batchJobId && { batch_job_id: inp.batchJobId }),
      });

      await supabase.from("content_source_evidence").upsert(
        {
          content_type: "question",
          content_id: questionId,
          source_basis: "original",
          legal_status: "original",
          author_notes: "Jade Tutor AI-generated; original content, no copyrighted material",
        },
        { onConflict: "content_type,content_id" }
      );

      result.saved++;
      result.questionIds.push(questionId);
    } catch (e) {
      result.failed++;
      result.errors.push(String(e));
    }
  }

  return result;
}
