"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { isLikelyDuplicate } from "@/lib/ai/similarity";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  /** True when exact match - blocks save */
  isIdentical?: boolean;
  message?: string;
  /** Count of similar items found */
  similarCount?: number;
}

/** Check for duplicate question stem in same track/topic */
export async function checkDuplicateQuestion(
  trackId: string,
  topicId: string | null,
  stem: string
): Promise<DuplicateCheckResult> {
  if (!isSupabaseServiceRoleConfigured() || !stem?.trim()) {
    return { isDuplicate: false };
  }
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("questions")
      .select("id, stem")
      .eq("exam_track_id", trackId);
    if (topicId) query = query.eq("topic_id", topicId);
    else query = query.is("topic_id", null);
    const { data: rows } = await query.limit(100);
    const trimmed = stem.trim();
    for (const r of rows ?? []) {
      const existing = (r.stem as string)?.trim() ?? "";
      if (!existing) continue;
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        return { isDuplicate: true, isIdentical: true, message: "Identical stem already exists in this topic", similarCount: 1 };
      }
      if (isLikelyDuplicate(trimmed, existing)) {
        return { isDuplicate: true, isIdentical: false, message: "Very similar stem already exists in this topic", similarCount: 1 };
      }
    }
    return { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

/** Check for duplicate study guide title in same track/topic/system */
export async function checkDuplicateStudyGuide(
  trackId: string,
  topicId: string | null,
  systemId: string | null,
  title: string
): Promise<DuplicateCheckResult> {
  if (!isSupabaseServiceRoleConfigured() || !title?.trim()) {
    return { isDuplicate: false };
  }
  try {
    const supabase = createServiceClient();
    let query = supabase.from("study_guides").select("id, title").eq("exam_track_id", trackId);
    if (topicId) query = query.eq("topic_id", topicId);
    if (systemId) query = query.eq("system_id", systemId);
    const { data: rows } = await query.limit(100);
    const trimmed = title.trim();
    let similarCount = 0;
    for (const r of rows ?? []) {
      const existing = (r.title as string)?.trim() ?? "";
      if (!existing) continue;
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        return { isDuplicate: true, isIdentical: true, message: "Identical title already exists in this topic", similarCount: 1 };
      }
      if (isLikelyDuplicate(trimmed, existing)) {
        similarCount++;
      }
    }
    return similarCount > 0
      ? { isDuplicate: true, isIdentical: false, message: `${similarCount} similar guide(s) exist in this topic`, similarCount }
      : { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

/** Check which flashcard fronts in a deck are duplicates. Returns indices of duplicate cards. */
export async function checkDuplicateFlashcardDeck(
  trackId: string,
  topicId: string | null,
  systemId: string | null,
  fronts: string[]
): Promise<{ duplicateIndices: number[]; messages: string[]; hasIdenticalDuplicate: boolean }> {
  const duplicateIndices: number[] = [];
  const messages: string[] = [];
  let hasIdenticalDuplicate = false;
  for (let i = 0; i < fronts.length; i++) {
    const r = await checkDuplicateFlashcardFront(trackId, topicId, systemId, fronts[i]);
    if (r.isDuplicate) {
      duplicateIndices.push(i);
      if (r.message) messages.push(`Card ${i + 1}: ${r.message}`);
      if (r.isIdentical) hasIdenticalDuplicate = true;
    }
  }
  return { duplicateIndices, messages, hasIdenticalDuplicate };
}

/** Check for duplicate flashcard front in same track/topic (any deck) */
export async function checkDuplicateFlashcardFront(
  trackId: string,
  topicId: string | null,
  systemId: string | null,
  frontText: string
): Promise<DuplicateCheckResult> {
  if (!isSupabaseServiceRoleConfigured() || !frontText?.trim()) {
    return { isDuplicate: false };
  }
  try {
    const supabase = createServiceClient();
    let deckQuery = supabase.from("flashcard_decks").select("id").eq("exam_track_id", trackId);
    if (topicId) deckQuery = deckQuery.eq("topic_id", topicId);
    if (systemId) deckQuery = deckQuery.eq("system_id", systemId);
    const { data: decks } = await deckQuery.limit(50);
    const deckIds = (decks ?? []).map((d) => d.id);
    if (deckIds.length === 0) return { isDuplicate: false };

    const { data: cards } = await supabase
      .from("flashcards")
      .select("front_text")
      .in("flashcard_deck_id", deckIds)
      .limit(500);
    const trimmed = frontText.trim();
    let similarCount = 0;
    for (const c of cards ?? []) {
      const existing = (c.front_text as string)?.trim() ?? "";
      if (!existing) continue;
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        return { isDuplicate: true, isIdentical: true, message: "Identical card front already exists in this topic", similarCount: 1 };
      }
      if (isLikelyDuplicate(trimmed, existing)) {
        similarCount++;
      }
    }
    return similarCount > 0
      ? { isDuplicate: true, isIdentical: false, message: `${similarCount} similar card(s) exist in this topic`, similarCount }
      : { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

/** Check for duplicate high-yield title in same track/topic */
export async function checkDuplicateHighYieldTitle(
  trackId: string,
  topicId: string | null,
  systemId: string | null,
  title: string
): Promise<DuplicateCheckResult> {
  if (!isSupabaseServiceRoleConfigured() || !title?.trim()) {
    return { isDuplicate: false };
  }
  try {
    const supabase = createServiceClient();
    let query = supabase.from("high_yield_content").select("id, title").eq("exam_track_id", trackId);
    if (topicId) query = query.eq("topic_id", topicId);
    if (systemId) query = query.eq("system_id", systemId);
    const { data: rows } = await query.limit(100);
    const trimmed = title.trim();
    let similarCount = 0;
    for (const r of rows ?? []) {
      const existing = (r.title as string)?.trim() ?? "";
      if (!existing) continue;
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        return { isDuplicate: true, isIdentical: true, message: "Identical title already exists in this topic", similarCount: 1 };
      }
      if (isLikelyDuplicate(trimmed, existing)) {
        similarCount++;
      }
    }
    return similarCount > 0
      ? { isDuplicate: true, isIdentical: false, message: `${similarCount} similar high-yield item(s) exist in this topic`, similarCount }
      : { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}
