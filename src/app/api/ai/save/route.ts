/**
 * Save AI output to notebook or flashcards - server-side
 * Persists to ai_saved_outputs. Optionally creates flashcard deck.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const DEV = process.env.NODE_ENV === "development";

function isValidUUID(s: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(s);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type: "notebook" | "flashcards";
    content?: string;
    flashcards?: { front: string; back: string }[];
    source_content_type?: string;
    source_content_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, content, flashcards, source_content_type, source_content_id } = body;

  if (type === "notebook" && content) {
    const supabase = await createClient();
    const sourceId = source_content_id && isValidUUID(source_content_id) ? source_content_id : null;

    if (DEV) {
      console.log("[save] notebook", { sourceType: source_content_type, sourceId });
    }

    const { error } = await supabase.from("ai_saved_outputs").insert({
      user_id: user.id,
      output_type: "summary",
      source_content_type: source_content_type ?? "highlight",
      source_content_id: sourceId,
      source_highlight_text: content.slice(0, 500),
      output_data: {
        summary: content,
        source: source_content_type,
      },
    });

    if (error) {
      console.error("[save] notebook insert failed:", error);
      return NextResponse.json(
        { error: "Failed to save", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Saved to notebook",
      id: `saved-${Date.now()}`,
    });
  }

  if (type === "flashcards" && flashcards && Array.isArray(flashcards)) {
    const supabase = await createClient();
    const sourceId = source_content_id && isValidUUID(source_content_id) ? source_content_id : null;

    if (DEV) {
      console.log("[save] flashcards", { count: flashcards.length, sourceType: source_content_type });
    }

    const { error } = await supabase.from("ai_saved_outputs").insert({
      user_id: user.id,
      output_type: "flashcard_set",
      source_content_type: source_content_type ?? "highlight",
      source_content_id: sourceId,
      output_data: {
        flashcards: flashcards.map((c) => ({ front: c.front, back: c.back })),
        source: source_content_type,
      },
    });

    if (error) {
      console.error("[save] flashcards insert failed:", error);
      return NextResponse.json(
        { error: "Failed to save flashcards", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${flashcards.length} flashcards`,
      count: flashcards.length,
    });
  }

  return NextResponse.json(
    { error: "Missing content or flashcards" },
    { status: 400 }
  );
}
