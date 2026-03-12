/**
 * Production Pipeline - Deduplication Utilities
 *
 * - Reject duplicate stems (exact + normalized hash)
 * - Reject duplicate flashcard fronts
 * - Reject duplicate guide titles within track/system/topic
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { isLikelyDuplicate } from "@/lib/ai/similarity";

/** Normalize stem for hash: lowercase, trim, collapse whitespace */
export function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/** Simple hash for dedupe (non-crypto, fast) */
export function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return Math.abs(h).toString(36);
}

/** Check if question stem is duplicate (exact or near-duplicate) */
export async function checkStemDuplicate(
  trackId: string,
  topicId: string | null,
  stem: string
): Promise<{ isDuplicate: boolean; isExact: boolean }> {
  if (!isSupabaseServiceRoleConfigured()) return { isDuplicate: false, isExact: false };
  const supabase = createServiceClient();

  let q = supabase.from("questions").select("id, stem").eq("exam_track_id", trackId);
  if (topicId) q = q.eq("topic_id", topicId);
  const { data: recent } = await q.order("created_at", { ascending: false }).limit(50);

  if (!recent?.length) return { isDuplicate: false, isExact: false };
  for (const row of recent) {
    if (!row.stem) continue;
    if (row.stem.trim().toLowerCase() === stem.trim().toLowerCase()) {
      return { isDuplicate: true, isExact: true };
    }
    if (isLikelyDuplicate(stem, row.stem)) {
      return { isDuplicate: true, isExact: false };
    }
  }
  return { isDuplicate: false, isExact: false };
}

/** Check if flashcard front is duplicate */
export async function checkFlashcardFrontDuplicate(
  trackId: string,
  topicId: string | null,
  _systemId: string | null,
  frontText: string
): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  const supabase = createServiceClient();

  let deckQ = supabase.from("flashcard_decks").select("id").eq("exam_track_id", trackId);
  if (topicId) deckQ = deckQ.eq("topic_id", topicId);
  const { data: decks } = await deckQ.limit(500);
  const deckIds = (decks ?? []).map((d) => d.id);
  if (deckIds.length === 0) return false;

  const { data } = await supabase
    .from("flashcards")
    .select("id")
    .in("flashcard_deck_id", deckIds)
    .ilike("front_text", frontText.trim())
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Check if study guide title is duplicate within track/system/topic */
export async function checkGuideTitleDuplicate(
  trackId: string,
  systemId: string | null,
  topicId: string | null,
  title: string
): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  const supabase = createServiceClient();

  let q = supabase
    .from("study_guides")
    .select("id")
    .eq("exam_track_id", trackId)
    .ilike("title", title.trim())
    .limit(1);
  if (systemId) q = q.eq("system_id", systemId);
  if (topicId) q = q.eq("topic_id", topicId);

  const { data } = await q.maybeSingle();
  return !!data;
}

/** Check if high-yield title is duplicate */
export async function checkHighYieldTitleDuplicate(
  trackId: string,
  topicId: string | null,
  title: string
): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  const supabase = createServiceClient();

  let q = supabase
    .from("high_yield_content")
    .select("id")
    .eq("exam_track_id", trackId)
    .ilike("title", title.trim())
    .limit(1);
  if (topicId) q = q.eq("topic_id", topicId);

  const { data } = await q.maybeSingle();
  return !!data;
}
