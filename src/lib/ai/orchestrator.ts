/**
 * AI Orchestration layer - coordinates retrieval, prompts, and LLM calls
 */

import { AI_TUTOR_CONFIG } from "@/config/ai-tutor";
import { getOpenAIClient } from "./openai-client";
import { retrieveChunks } from "./retrieval";
import { getSystemPrompt } from "./prompts/system";
import { fillTemplate, PROMPT_TEMPLATES } from "./prompts/templates";
import { validateInput, FALLBACK_MESSAGES } from "./guardrails";
import { checkUsageLimit } from "./usage";
import type { AIRequest, AIResponse, AIAction } from "@/types/ai-tutor";

function formatRetrievedContext(chunks: { chunkText: string }[]): string {
  if (chunks.length === 0) return "(No relevant platform content found.)";
  return chunks.map((c, i) => `[${i + 1}] ${c.chunkText}`).join("\n\n---\n\n");
}

async function callChat(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; promptTokens?: number; completionTokens?: number }> {
  const openai = getOpenAIClient();
  if (!openai) {
    return {
      content: "[AI Tutor] Set OPENAI_API_KEY to enable. Using mock response for development.",
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  const res = await openai.chat.completions.create({
    model: AI_TUTOR_CONFIG.chatModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: AI_TUTOR_CONFIG.maxTokens,
    temperature: AI_TUTOR_CONFIG.temperature,
  });

  const choice = res.choices[0];
  const content = choice?.message?.content ?? "";

  return {
    content,
    promptTokens: res.usage?.prompt_tokens,
    completionTokens: res.usage?.completion_tokens,
  };
}

/** Parse JSON from response (for flashcards, quiz) */
function tryParseJSON<T>(text: string): T | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export async function runAIAction(
  req: AIRequest
): Promise<{ success: boolean; data?: AIResponse; error?: string }> {
  const { action, track } = req;

  const usageCheck = checkUsageLimit(req.userId, action, "free");
  if (!usageCheck.allowed) {
    return {
      success: false,
      error: `Daily limit reached (${usageCheck.used}/${usageCheck.limit}). Upgrade for more.`,
    };
  }

  const trackName = { lvn: "LVN/LPN", rn: "RN", fnp: "FNP", pmhnp: "PMHNP" }[track] ?? track;

  let query = "";
  let templateKey: keyof typeof PROMPT_TEMPLATES = "explain_highlight";
  const vars: Record<string, string> = {
    track: trackName,
    retrievedContext: "",
    count: "5",
  };

  switch (action) {
    case "explain_question": {
      const stem = req.questionStem ?? "";
      const rationale = req.rationale ?? "";
      const correctAnswer = req.correctAnswer ?? "";
      query = `${stem} ${rationale}`;
      vars.questionStem = stem;
      vars.rationale = rationale;
      vars.correctAnswer = correctAnswer;
      templateKey = "explain_question";
      break;
    }
    case "explain_highlight": {
      const text = req.highlightedText ?? "";
      const val = validateInput(text, "highlight");
      if (!val.valid) return { success: false, error: val.error };
      query = text;
      vars.highlightedText = text;
      vars.contentRef = req.contentRef ?? "";
      templateKey = "explain_highlight";
      break;
    }
    case "compare_concepts": {
      const concepts = req.concepts ?? [];
      query = concepts.join(" ");
      vars.concepts = concepts.join(", ");
      templateKey = "compare_concepts";
      break;
    }
    case "generate_flashcards": {
      const content = req.notebookContent ?? req.highlightedText ?? "";
      const val = validateInput(content, "notebook");
      if (!val.valid) return { success: false, error: val.error };
      query = content;
      vars.content = content;
      templateKey = "generate_flashcards";
      break;
    }
    case "summarize_to_notebook": {
      const content = req.notebookContent ?? "";
      const val = validateInput(content, "notebook");
      if (!val.valid) return { success: false, error: val.error };
      query = content;
      vars.notebookContent = content;
      templateKey = "summarize_to_notebook";
      break;
    }
    case "weak_area_coaching": {
      query = [...(req.weakSystems ?? []), ...(req.weakDomains ?? [])].join(" ");
      vars.weakSystems = (req.weakSystems ?? []).join(", ");
      vars.weakDomains = (req.weakDomains ?? []).join(", ");
      templateKey = "weak_area_coaching";
      break;
    }
    case "quiz_followup": {
      const content = req.notebookContent ?? req.highlightedText ?? req.questionStem ?? "";
      query = content;
      vars.content = content;
      templateKey = "quiz_followup";
      break;
    }
    case "generate_mnemonic": {
      const topic = req.topic ?? req.highlightedText ?? "";
      const val = validateInput(topic, "highlight");
      if (!val.valid) return { success: false, error: val.error };
      query = topic;
      vars.topic = topic;
      vars.mnemonicType = req.mnemonicType ?? "simple";
      templateKey = "generate_mnemonic";
      break;
    }
    default:
      return { success: false, error: "Unknown action" };
  }

  const chunks = retrieveChunks(query, { limit: AI_TUTOR_CONFIG.maxRetrievalChunks });
  vars.retrievedContext = formatRetrievedContext(chunks);

  const userPrompt = fillTemplate(templateKey, vars);
  const systemPrompt = getSystemPrompt(track);

  try {
    const { content, promptTokens, completionTokens } = await callChat(systemPrompt, userPrompt);

    const contentRefs = chunks.map((c) => c.contentId);

    if (action === "generate_flashcards") {
      const parsed = tryParseJSON<{ front: string; back: string }[]>(content);
      if (parsed && Array.isArray(parsed)) {
        return {
          success: true,
          data: {
            content: content.split(/\[[\s\S]*\]/)[0]?.trim() || "Here are your flashcards:",
            flashcards: parsed.slice(0, 10),
            contentRefs,
          },
        };
      }
    }

    if (action === "quiz_followup") {
      const parsed = tryParseJSON<{ stem: string; options: string[]; correctKey: string }[]>(content);
      if (parsed && Array.isArray(parsed)) {
        return {
          success: true,
          data: {
            content: content.split(/\[[\s\S]*\]/)[0]?.trim() || "Here are 5 follow-up questions:",
            quizQuestions: parsed.slice(0, 5),
            contentRefs,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        content: content || FALLBACK_MESSAGES[action],
        contentRefs,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: msg,
      data: { content: FALLBACK_MESSAGES[action] },
    };
  }
}
