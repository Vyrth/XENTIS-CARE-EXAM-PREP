/**
 * Jade Tutor Flashcard Generation Worker
 *
 * Generates one deck per topic/system bundle with:
 * - 10 to 25 cards per deck
 * - front/back text
 * - metadata tags (hint, memoryTrick)
 * - difficulty (easy/medium/hard)
 * - track-specific wording
 *
 * Tied to exam_track_id, system_id, topic_id.
 * Supports dedupe, retries, batch logs, bulk save, audit.
 */

import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai-client";
import { createServiceClient } from "@/lib/supabase/service";
import { buildFlashcardDeckPrompt } from "@/lib/ai/prompts/flashcard-prompts";
import { validateFlashcardDeckPayload } from "@/lib/ai/flashcard-factory";
import { saveAIFlashcardDeck } from "@/lib/admin/ai-factory-persistence";
import { recordGenerationAudit } from "@/lib/ai/audit-logging";
import { extractJson } from "@/lib/ai/content-factory/parsers";
import type { FlashcardDeckOutput } from "@/lib/ai/content-factory/types";
import type { ExamTrack, FlashcardDeckMode } from "@/lib/ai/flashcard-factory/types";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { FlashcardStyle } from "@/lib/admin/flashcard-mass-production-plan";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.6;
const MAX_RETRIES = 2;
const MIN_CARDS = 10;
const MAX_CARDS = 25;

export interface FlashcardWorkerInput {
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  targetCount: number;
  cardCountPerDeck?: number;
  deckMode?: "rapid_recall" | "high_yield_clinical";
  flashcardStyle?: FlashcardStyle;
  saveStatus?: "draft" | "editor_review";
  batchJobId?: string | null;
  createdBy?: string | null;
}

export interface FlashcardWorkerResult {
  success: boolean;
  generated: number;
  saved: number;
  failed: number;
  duplicates: number;
  retries: number;
  deckIds: string[];
  totalCards: number;
  errors: string[];
  validationRules: string[];
  saveFlow: string;
}

const VALIDATION_RULES = [
  "Deck name required, min 2 chars",
  "cards array required, min 3 cards (worker uses 10-25)",
  "Each card: frontText, backText required",
  "examTrackId and systemId required",
];

const SAVE_FLOW = `flashcard_decks → flashcards → ai_generation_audit → content_source_evidence (if required). Dedupe by card front_text within track/topic.`;

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

function normalizeDeckOutput(raw: unknown): FlashcardDeckOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (!p.name || typeof p.name !== "string") return null;
  if (!Array.isArray(p.cards) || p.cards.length < 3) return null;

  const cards = p.cards
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const card = c as Record<string, unknown>;
      const front = String(card.frontText ?? card.front_text ?? "").trim();
      const back = String(card.backText ?? card.back_text ?? "").trim();
      if (!front || !back) return null;
      return {
        frontText: front,
        backText: back,
        hint: card.hint ? String(card.hint).trim() : undefined,
        memoryTrick: card.memoryTrick ?? card.memory_trick ? String(card.memoryTrick ?? card.memory_trick).trim() : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (cards.length < 3) return null;

  const deckType = (p.deckType ?? p.deck_type ?? "rapid_recall") as FlashcardDeckMode;
  const difficulty = (p.difficulty === "easy" || p.difficulty === "medium" || p.difficulty === "hard")
    ? p.difficulty
    : "medium";

  return {
    name: p.name.trim(),
    description: p.description ? String(p.description).trim() : undefined,
    deckType: deckType === "high_yield_clinical" ? "high_yield_clinical" : "rapid_recall",
    difficulty,
    cards,
  };
}

async function generateOneDeck(
  track: ExamTrack,
  mode: FlashcardDeckMode,
  context: {
    system?: string;
    topic?: string;
    cardCount?: number;
    flashcardStyle?: FlashcardStyle;
  }
): Promise<FlashcardDeckOutput | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const { system, user } = buildFlashcardDeckPrompt(track, mode, {
    system: context.system,
    topic: context.topic,
    cardCount: context.cardCount ?? 15,
    flashcardStyle: context.flashcardStyle,
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

  const parsed = extractJson<Record<string, unknown>>(content);
  return normalizeDeckOutput(parsed);
}

export async function runFlashcardWorker(
  input: FlashcardWorkerInput
): Promise<FlashcardWorkerResult> {
  const result: FlashcardWorkerResult = {
    success: false,
    generated: 0,
    saved: 0,
    failed: 0,
    duplicates: 0,
    retries: 0,
    deckIds: [],
    totalCards: 0,
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

  const cardCount = Math.min(
    Math.max(input.cardCountPerDeck ?? 15, MIN_CARDS),
    MAX_CARDS
  );
  const mode: FlashcardDeckMode = input.deckMode ?? "rapid_recall";

  const config: GenerationConfig = {
    trackId: input.examTrackId,
    trackSlug,
    systemId: input.systemId,
    systemName,
    topicId: input.topicId ?? undefined,
    topicName: topicName ?? undefined,
    flashcardDeckMode: mode,
    flashcardStyle: input.flashcardStyle ?? "rapid_recall",
    cardCount,
    saveStatus: input.saveStatus ?? "draft",
  };

  const targetCount = Math.max(1, input.targetCount ?? 1);

  for (let i = 0; i < targetCount; i++) {
    let deck: FlashcardDeckOutput | null = null;
    let attempts = 0;

    while (attempts <= MAX_RETRIES) {
      deck = await generateOneDeck(trackSlug, mode, {
        system: systemName,
        topic: topicName,
        cardCount,
        flashcardStyle: input.flashcardStyle,
      });
      if (deck) break;
      attempts++;
      result.retries++;
    }

    if (!deck) {
      result.failed++;
      result.errors.push(`Deck ${i + 1}: generation failed after ${MAX_RETRIES + 1} attempts`);
      continue;
    }

    const validation = validateFlashcardDeckPayload(deck);
    if (!validation.valid) {
      result.failed++;
      result.errors.push(`Deck ${i + 1}: ${validation.errors.join("; ")}`);
      continue;
    }

    result.generated++;
    result.totalCards += deck.cards.length;

    const auditId = await recordGenerationAudit({
      contentType: "flashcard_deck",
      config,
      createdBy: input.createdBy ?? null,
      generationCount: deck.cards.length,
      promptVersion: "flashcard-worker-v1",
      batchJobId: input.batchJobId ?? null,
    });

    const persist = await saveAIFlashcardDeck(config, deck, auditId);

    if (persist.duplicate) {
      result.duplicates++;
    } else if (persist.success && persist.contentId) {
      result.saved++;
      result.deckIds.push(persist.contentId);
    } else {
      result.failed++;
      result.errors.push(persist.error ?? "Save failed");
    }
  }

  result.success = result.saved > 0 || (result.generated === 0 && result.errors.length === 0);
  return result;
}
