/**
 * Admin AI draft generator - calls OpenAI, parses JSON, records audit.
 * All output is draft-only. Never auto-publishes.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import {
  buildQuestionDraftPrompt,
  buildDistractorRationalePrompt,
  buildStudySectionPrompt,
  buildFlashcardDraftPrompt,
  buildMnemonicDraftPrompt,
  buildHighYieldSummaryPrompt,
} from "./prompts";
import type {
  AdminDraftParams,
  AdminDraftType,
  QuestionDraftOutput,
  DistractorRationaleDraftOutput,
  StudySectionDraftOutput,
  FlashcardDraftOutput,
  MnemonicDraftOutput,
  HighYieldSummaryDraftOutput,
  AdminDraftResult,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 2048;

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function recordAudit(
  contentType: AdminDraftType,
  contentId: string | null,
  params: AdminDraftParams,
  createdBy?: string | null
): Promise<string | null> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const { isSupabaseServiceRoleConfigured } = await import("@/lib/supabase/env");
    if (!isSupabaseServiceRoleConfigured()) return null;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_generation_audit")
      .insert({
        content_type: contentType,
        content_id: contentId,
        generation_params: {
          track: params.track,
          trackId: params.trackId,
          systemId: params.systemId,
          systemName: params.systemName,
          topicId: params.topicId,
          topicName: params.topicName,
          objective: params.objective,
          targetDifficulty: params.targetDifficulty,
          itemType: params.itemType,
        },
        model_used: DEFAULT_MODEL,
        created_by: createdBy || null,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function generateQuestionDraft(
  params: AdminDraftParams,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "question"; data: QuestionDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildQuestionDraftPrompt(params);
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<QuestionDraftOutput>(content);
    if (!parsed?.stem || !parsed?.options?.length) {
      return { success: false, error: "Could not parse question from AI response" };
    }

    const options = parsed.options.map((o) => ({
      key: String(o.key ?? "?").trim().slice(0, 1) || "A",
      text: String(o.text ?? "").trim(),
      isCorrect: Boolean(o.isCorrect),
      distractorRationale: o.distractorRationale?.trim(),
    }));
    if (options.length < 2) return { success: false, error: "Need at least 2 options" };

    const auditId = await recordAudit("question", null, params, createdBy);

    return {
      success: true,
      output: {
        type: "question",
        data: {
          stem: String(parsed.stem ?? "").trim(),
          leadIn: parsed.leadIn?.trim(),
          instructions: parsed.instructions?.trim(),
          options,
          rationale: parsed.rationale?.trim(),
        },
      },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function generateDistractorRationaleDraft(
  params: AdminDraftParams,
  optionText: string,
  correctOptionText: string,
  stem: string,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "distractor_rationale"; data: DistractorRationaleDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildDistractorRationalePrompt(
    params,
    optionText,
    correctOptionText,
    stem
  );
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 512,
      temperature: 0.5,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<{ distractorRationale: string }>(content);
    const rationale = parsed?.distractorRationale?.trim();
    if (!rationale) return { success: false, error: "Could not parse distractor rationale" };

    const auditId = await recordAudit("distractor_rationale", null, params, createdBy);

    return {
      success: true,
      output: { type: "distractor_rationale", data: { distractorRationale: rationale } },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function generateStudySectionDraft(
  params: AdminDraftParams,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "study_section"; data: StudySectionDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildStudySectionPrompt(params);
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<StudySectionDraftOutput>(content);
    if (!parsed?.title || !parsed?.contentMarkdown) {
      return { success: false, error: "Could not parse study section from AI response" };
    }

    const auditId = await recordAudit("study_section", null, params, createdBy);

    return {
      success: true,
      output: {
        type: "study_section",
        data: {
          title: String(parsed.title).trim(),
          contentMarkdown: String(parsed.contentMarkdown).trim(),
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : undefined,
          mnemonics: Array.isArray(parsed.mnemonics) ? parsed.mnemonics : undefined,
        },
      },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function generateFlashcardDraft(
  params: AdminDraftParams,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "flashcard"; data: FlashcardDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildFlashcardDraftPrompt(params);
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 512,
      temperature: 0.6,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<FlashcardDraftOutput>(content);
    if (!parsed?.frontText || !parsed?.backText) {
      return { success: false, error: "Could not parse flashcard from AI response" };
    }

    const auditId = await recordAudit("flashcard", null, params, createdBy);

    return {
      success: true,
      output: {
        type: "flashcard",
        data: {
          frontText: String(parsed.frontText).trim(),
          backText: String(parsed.backText).trim(),
          hint: parsed.hint?.trim(),
          memoryTrick: parsed.memoryTrick?.trim(),
        },
      },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function generateMnemonicDraft(
  params: AdminDraftParams,
  conceptOrText: string,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "mnemonic"; data: MnemonicDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildMnemonicDraftPrompt(params, conceptOrText);
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 1024,
      temperature: 0.6,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<MnemonicDraftOutput>(content);
    if (!parsed?.mnemonic) return { success: false, error: "Could not parse mnemonic from AI response" };

    const auditId = await recordAudit("mnemonic", null, params, createdBy);

    return {
      success: true,
      output: {
        type: "mnemonic",
        data: {
          conceptSummary: parsed.conceptSummary?.trim() ?? "",
          mnemonic: parsed.mnemonic.trim(),
          whyItWorks: parsed.whyItWorks?.trim() ?? "",
          rapidRecallVersion: parsed.rapidRecallVersion?.trim() ?? "",
          boardTip: parsed.boardTip?.trim() ?? "",
        },
      },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function generateHighYieldSummaryDraft(
  params: AdminDraftParams,
  createdBy?: string | null
): Promise<AdminDraftResult<{ type: "high_yield_summary"; data: HighYieldSummaryDraftOutput }>> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }
  const client = getOpenAIClient();
  if (!client) return { success: false, error: "Failed to initialize AI client" };

  const { system, user } = buildHighYieldSummaryPrompt(params);
  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
    });
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { success: false, error: "Empty AI response" };

    const parsed = extractJson<HighYieldSummaryDraftOutput>(content);
    if (!parsed?.title || !parsed?.explanation) {
      return { success: false, error: "Could not parse high-yield summary from AI response" };
    }

    const auditId = await recordAudit("high_yield_summary", null, params, createdBy);

    return {
      success: true,
      output: {
        type: "high_yield_summary",
        data: {
          title: String(parsed.title).trim(),
          explanation: String(parsed.explanation).trim(),
          whyHighYield: parsed.whyHighYield?.trim(),
          commonConfusion: parsed.commonConfusion?.trim(),
        },
      },
      auditId: auditId ?? undefined,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}
