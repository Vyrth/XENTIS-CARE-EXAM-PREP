/**
 * Notebook notes API - persists to user_notes
 * GET: list user's notes
 * POST: create note
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_notes")
    .select("id, note_text, content_type, content_id, created_at, updated_at")
    .eq("user_id", user.id)
    .in("content_type", ["notebook", "notebook_jade", "ai-tutor", "ai_tutor", "study_section", "topic", "question", "rationale"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[notebook] fetch failed:", error);
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }

  const notes = (data ?? []).map((r) => ({
    id: r.id,
    content: r.note_text,
    contentRef: r.content_type === "question" || r.content_type === "rationale" ? r.content_id : r.content_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { content: string; contentRef?: string; contentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, contentRef, contentId } = body;
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const isRefUuid = contentRef && isValidUUID(contentRef);
  const contentType = isRefUuid ? "question" : (contentRef ?? "notebook");
  const contentIdUuid =
    (contentId && isValidUUID(contentId) ? contentId : null) ??
    (isRefUuid ? contentRef : null) ??
    crypto.randomUUID();

  const { data, error } = await supabase
    .from("user_notes")
    .insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentIdUuid,
      note_text: content,
    })
    .select("id, created_at, updated_at")
    .single();

  if (error) {
    console.error("[notebook] insert failed:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    note: {
      id: data.id,
      content,
      contentRef: contentType,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
