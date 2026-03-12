/**
 * Jade Tutor - Intent Handlers
 *
 * Each handler produces validated output for its intent.
 * Uses strict response contract - malformed AI output never reaches the UI.
 */

import { callJade } from "@/lib/ai/jade-client";
import { retrieveChunks } from "@/lib/ai/retrieval";
import {
  getTutoringSystemPrompt,
  buildQuestionGenerationPrompt,
  buildConceptExplanationPrompt,
} from "./prompts";
import {
  parseQuestionSet,
  parseFlashcardSet,
  parseConceptExplanation,
} from "./response-contract";
import {
  extractTopicFromMessage,
  extractQuestionCount,
  extractTrackFromMessage,
} from "./intents";
import type { ExamTrack } from "@/lib/ai/jade-client";
import type { QuestionSetPayload, ConceptExplanationPayload } from "./response-contract";

const AI_TUTOR_CONFIG = { maxRetrievalChunks: 8 };

function formatContext(chunks: { chunkText: string }[]): string {
  if (chunks.length === 0) return "(No relevant platform content found.)";
  return chunks.map((c, i) => `[${i + 1}] ${c.chunkText}`).join("\n\n---\n\n");
}

/** Convert QuestionSetPayload to UI format (options with isCorrect, correctKey) */
function toUIQuestions(payload: QuestionSetPayload): { stem: string; options: { key: string; text: string; isCorrect: boolean }[]; rationale: string; correctKey: string }[] {
  return payload.questions.map((q) => {
    const correctKey = q.correct_answer.slice(0, 1).toUpperCase();
    const options = q.choices.map((c) => ({
      key: c.key,
      text: c.text,
      isCorrect: c.key.toUpperCase() === correctKey,
    }));
    return {
      stem: q.stem,
      options,
      rationale: q.rationale,
      correctKey,
    };
  });
}

/** Generate practice questions - track-aware, strict schema */
export async function handleGenerateQuestions(
  track: ExamTrack,
  message: string
): Promise<{
  success: boolean;
  mode?: "question_set";
  track?: ExamTrack;
  topic?: string;
  system?: string;
  questions?: { stem: string; options: { key: string; text: string; isCorrect: boolean }[]; rationale: string; correctKey: string }[];
  content?: string;
  error?: string;
}> {
  const topic = extractTopicFromMessage(message) ?? "general nursing concepts";
  const count = extractQuestionCount(message);
  const msgTrack = extractTrackFromMessage(message);
  const effectiveTrack = msgTrack ?? track;

  const userPrompt = buildQuestionGenerationPrompt(effectiveTrack, {
    topic,
    count,
    difficulty: "medium",
  });

  const systemPrompt = getTutoringSystemPrompt(effectiveTrack);
  const result = await callJade({
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
    temperature: 0.5,
  });

  if (!result.success || !result.content) {
    return { success: false, error: result.error ?? "Failed to generate questions" };
  }

  const parseResult = parseQuestionSet(result.content, effectiveTrack);
  if (parseResult.ok) {
    const uiQuestions = toUIQuestions(parseResult.data);
    return {
      success: true,
      mode: "question_set",
      track: parseResult.data.track,
      topic: parseResult.data.topic,
      system: parseResult.data.system,
      questions: uiQuestions,
      content: `Here are ${uiQuestions.length} practice questions on ${topic}. These are board-style practice questions, not official exam content.`,
    };
  }

  return {
    success: false,
    error: parseResult.error ?? "Could not parse generated questions. Please try again.",
  };
}

/** Handle explain concept - returns structured concept_explanation payload */
export async function handleExplainConcept(
  track: ExamTrack,
  message: string
): Promise<{
  success: boolean;
  mode?: "concept_explanation";
  conceptExplanation?: ConceptExplanationPayload;
  content?: string;
  error?: string;
}> {
  const chunks = await retrieveChunks(message, { limit: AI_TUTOR_CONFIG.maxRetrievalChunks });
  const context = formatContext(chunks);
  const topic = extractTopicFromMessage(message) ?? message.slice(0, 100);

  const systemPrompt = getTutoringSystemPrompt(track);
  const userPrompt = `${buildConceptExplanationPrompt(topic)}

The student asked: "${message.replace(/"/g, '\\"')}"

Platform context (use when relevant):
${context}`;

  const result = await callJade({
    systemPrompt,
    userPrompt,
    maxTokens: 1536,
    temperature: 0.5,
  });

  if (!result.success || !result.content) {
    return { success: false, error: result.error ?? "Failed to explain" };
  }

  const parseResult = parseConceptExplanation(result.content);
  if (parseResult.ok) {
    return {
      success: true,
      mode: "concept_explanation",
      conceptExplanation: parseResult.data,
      content: parseResult.data.summary,
    };
  }

  return {
    success: false,
    error: parseResult.error ?? "Could not format the explanation. Please try again.",
  };
}

/** Handle generate flashcards - strict flashcard_set schema */
export async function handleGenerateFlashcards(
  track: ExamTrack,
  message: string
): Promise<{
  success: boolean;
  mode?: "flashcard_set";
  flashcards?: { front: string; back: string }[];
  content?: string;
  error?: string;
}> {
  const chunks = await retrieveChunks(message, { limit: AI_TUTOR_CONFIG.maxRetrievalChunks });
  const context = formatContext(chunks);

  const systemPrompt = getTutoringSystemPrompt(track);
  const userPrompt = `Create 5-10 flashcards from this request. Output valid JSON with this exact structure:
{
  "mode": "flashcard_set",
  "cards": [
    {"front": "question or term", "back": "answer or definition"},
    ...
  ]
}

Request: "${message.replace(/"/g, '\\"')}"

Platform context:
${context}

Make flashcards concise and exam-relevant.`;

  const result = await callJade({
    systemPrompt,
    userPrompt,
    maxTokens: 2048,
    temperature: 0.5,
  });

  if (!result.success || !result.content) {
    return { success: false, error: result.error ?? "Failed to generate flashcards" };
  }

  const parseResult = parseFlashcardSet(result.content);
  if (parseResult.ok) {
    const cards = parseResult.data.cards;
    return {
      success: true,
      mode: "flashcard_set",
      flashcards: cards,
      content: `Here are ${cards.length} flashcards. You can save them to a deck.`,
    };
  }

  return {
    success: false,
    error: parseResult.error ?? "Could not parse flashcards. Please try again.",
  };
}
