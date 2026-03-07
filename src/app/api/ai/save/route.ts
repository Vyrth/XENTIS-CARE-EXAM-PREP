/**
 * Save AI output to notebook or flashcards - server-side
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type: "notebook" | "flashcards"; content?: string; flashcards?: { front: string; back: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, content, flashcards } = body;

  if (type === "notebook" && content) {
    // In production: insert into ai_saved_outputs or notes table
    return NextResponse.json({
      success: true,
      message: "Saved to notebook",
      id: `saved-${Date.now()}`,
    });
  }

  if (type === "flashcards" && flashcards && Array.isArray(flashcards)) {
    // In production: insert into flashcards table, link to ai_saved_outputs
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
