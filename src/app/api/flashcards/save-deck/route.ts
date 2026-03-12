/**
 * Create a flashcard deck from AI-generated cards.
 * Creates deck with source='ai', user_id, exam_track_id.
 * Logs to ai_saved_outputs for audit.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const primary = await getPrimaryTrack(user.id);
  const trackId = primary?.trackId;
  if (!trackId) {
    return NextResponse.json(
      { error: "Complete onboarding to set your exam track" },
      { status: 400 }
    );
  }

  let body: {
    name?: string;
    flashcards: { front: string; back: string }[];
    sourceContentType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, flashcards, sourceContentType } = body;
  if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
    return NextResponse.json(
      { error: "flashcards array is required and must not be empty" },
      { status: 400 }
    );
  }

  const deckName = name ?? `Jade Tutor — ${new Date().toLocaleDateString()}`;
  const supabase = await createClient();

  const { data: deck, error: deckError } = await supabase
    .from("flashcard_decks")
    .insert({
      exam_track_id: trackId,
      user_id: user.id,
      name: deckName,
      source: "ai",
      is_public: false,
    })
    .select("id")
    .single();

  if (deckError || !deck) {
    console.error("[flashcards/save-deck] deck insert failed:", deckError);
    return NextResponse.json(
      { error: "Failed to create deck", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  const cardsToInsert = flashcards.map((c, i) => ({
    flashcard_deck_id: deck.id,
    front_text: c.front,
    back_text: c.back,
    display_order: i,
  }));

  const { error: cardsError } = await supabase
    .from("flashcards")
    .insert(cardsToInsert);

  if (cardsError) {
    console.error("[flashcards/save-deck] cards insert failed:", cardsError);
    await supabase.from("flashcard_decks").delete().eq("id", deck.id);
    return NextResponse.json(
      { error: "Failed to save flashcards", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  await supabase.from("ai_saved_outputs").insert({
    user_id: user.id,
    output_type: "flashcard_set",
    source_content_type: sourceContentType ?? "notebook",
    output_data: {
      flashcard_deck_id: deck.id,
      count: flashcards.length,
      source: "notebook",
    },
  });

  return NextResponse.json({
    success: true,
    deckId: deck.id,
    count: flashcards.length,
    message: `Saved ${flashcards.length} flashcards to new deck`,
  });
}
