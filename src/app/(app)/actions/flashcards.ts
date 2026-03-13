"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  loadStudyGuideSectionContent,
  type CardMetadata,
} from "@/lib/admin/flashcard-studio-loaders";
import { ensureSourceEvidenceForAdminContent } from "@/lib/admin/source-evidence";
import { ensureContentEvidenceMetadata } from "@/lib/admin/source-governance";
import { getTrackSlug } from "@/lib/admin/source-governance-helpers";
import { computeFlashcardDeckQualityScore } from "@/lib/ai/content-quality-scoring";
import { upsertContentQualityMetadata, runAutoPublishFlow } from "@/lib/admin/auto-publish";

export interface FlashcardDeckFormData {
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  name: string;
  description?: string | null;
  deckType: string;
  difficulty: string;
  status?: string;
  isPublic?: boolean;
}

export interface FlashcardInput {
  id?: string;
  frontText: string;
  backText: string;
  metadata?: CardMetadata;
  displayOrder: number;
}

export interface SaveFlashcardResult {
  success: boolean;
  deckId?: string;
  error?: string;
  validationErrors?: string[];
}

export async function createFlashcardDeck(
  data: FlashcardDeckFormData
): Promise<SaveFlashcardResult> {
  if (!data.examTrackId?.trim() || !data.name?.trim()) {
    return { success: false, validationErrors: ["Track and name are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { data: d, error } = await supabase
      .from("flashcard_decks")
      .insert({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        deck_type: data.deckType || "standard",
        difficulty: data.difficulty || "medium",
        status: data.status || "draft",
        source: "platform",
        is_public: data.isPublic ?? false,
      })
      .select("id")
      .single();

    if (error || !d) {
      return { success: false, error: error?.message ?? "Failed to create deck" };
    }

    await ensureSourceEvidenceForAdminContent("flashcard_deck", d.id);
    const trackSlug = await getTrackSlug(data.examTrackId);
    if (trackSlug) {
      await ensureContentEvidenceMetadata("flashcard_deck", d.id, trackSlug, {});
    }

    revalidatePath("/admin/flashcards");
    return { success: true, deckId: d.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateFlashcardDeck(
  deckId: string,
  data: FlashcardDeckFormData
): Promise<SaveFlashcardResult> {
  if (!data.examTrackId?.trim() || !data.name?.trim()) {
    return { success: false, validationErrors: ["Track and name are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("flashcard_decks")
      .update({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        deck_type: data.deckType || "standard",
        difficulty: data.difficulty || "medium",
        status: data.status || "draft",
        is_public: data.isPublic ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/flashcards");
    revalidatePath(`/admin/flashcards/${deckId}`);
    return { success: true, deckId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveFlashcards(
  deckId: string,
  cards: FlashcardInput[]
): Promise<SaveFlashcardResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const meta = c.metadata ?? {};
      const metadata: Record<string, unknown> = {};
      if (meta.hint) metadata.hint = meta.hint;
      if (meta.memoryTrick) metadata.memoryTrick = meta.memoryTrick;
      if (meta.compareContrast) metadata.compareContrast = meta.compareContrast;
      if (meta.rapidRecall) metadata.rapidRecall = meta.rapidRecall;

      if (c.id) {
        await supabase
          .from("flashcards")
          .update({
            front_text: c.frontText.trim(),
            back_text: c.backText.trim(),
            metadata: Object.keys(metadata).length > 0 ? metadata : {},
            display_order: i,
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.id)
          .eq("flashcard_deck_id", deckId);
      } else {
        await supabase.from("flashcards").insert({
          flashcard_deck_id: deckId,
          front_text: c.frontText.trim(),
          back_text: c.backText.trim(),
          metadata: Object.keys(metadata).length > 0 ? metadata : {},
          display_order: i,
        });
      }
    }

    if (cards.length > 0) {
      const { data: deck } = await supabase
        .from("flashcard_decks")
        .select("name, deck_type, status, exam_track_id")
        .eq("id", deckId)
        .single();
      const trackSlug = deck?.exam_track_id ? await getTrackSlug(deck.exam_track_id) : null;
      if (trackSlug) {
        await ensureContentEvidenceMetadata("flashcard_deck", deckId, trackSlug, {});
      }
      const draft = {
        name: deck?.name ?? "",
        cards: cards.map((c) => ({ frontText: c.frontText, backText: c.backText })),
        deckType: deck?.deck_type,
      };
      const quality = computeFlashcardDeckQualityScore(draft);
      await upsertContentQualityMetadata("flashcard_deck", deckId, {
        qualityScore: quality.qualityScore,
        autoPublishEligible: quality.autoPublishEligible,
        validationStatus: quality.validationStatus,
        validationErrors: quality.validationErrors,
      });
      const fromStatus = (deck?.status as string) ?? "draft";
      await runAutoPublishFlow("flashcard_deck", deckId, "flashcard_deck", fromStatus, null);
    }

    revalidatePath("/admin/flashcards");
    revalidatePath(`/admin/flashcards/${deckId}`);
    return { success: true, deckId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteFlashcard(
  deckId: string,
  cardId: string
): Promise<SaveFlashcardResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("flashcards")
      .delete()
      .eq("id", cardId)
      .eq("flashcard_deck_id", deckId);
    revalidatePath("/admin/flashcards");
    revalidatePath(`/admin/flashcards/${deckId}`);
    return { success: true, deckId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function reorderFlashcards(
  deckId: string,
  cardIds: string[]
): Promise<SaveFlashcardResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    for (let i = 0; i < cardIds.length; i++) {
      await supabase
        .from("flashcards")
        .update({ display_order: i, updated_at: new Date().toISOString() })
        .eq("id", cardIds[i])
        .eq("flashcard_deck_id", deckId);
    }
    revalidatePath("/admin/flashcards");
    revalidatePath(`/admin/flashcards/${deckId}`);
    return { success: true, deckId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Fetch study guide section content for AI flashcard generation */
export async function fetchStudyGuideSectionContent(
  sectionId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const content = await loadStudyGuideSectionContent(sectionId);
  if (!content?.trim()) {
    return { success: false, error: "Section has no content" };
  }
  return { success: true, content };
}
