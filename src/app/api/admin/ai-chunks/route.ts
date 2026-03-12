/**
 * POST /api/admin/ai-chunks - Insert RAG chunk for Jade Tutor retrieval
 * Admin-only. Inserts into ai_chunks for study sections, topic summaries, etc.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";

function isValidUUID(s: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(s);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  let body: {
    contentType?: string;
    contentId?: string;
    chunkIndex?: number;
    chunkText?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contentType, contentId, chunkIndex = 0, chunkText, metadata } = body;

  if (!contentType || typeof contentType !== "string") {
    return NextResponse.json(
      { error: "contentType is required" },
      { status: 400 }
    );
  }
  if (!contentId || !isValidUUID(contentId)) {
    return NextResponse.json(
      { error: "contentId must be a valid UUID" },
      { status: 400 }
    );
  }
  if (!chunkText || typeof chunkText !== "string") {
    return NextResponse.json(
      { error: "chunkText is required" },
      { status: 400 }
    );
  }

  const trimmed = chunkText.trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: "chunkText cannot be empty" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Upsert: delete existing chunk for this content+index, then insert
    await supabase
      .from("ai_chunks")
      .delete()
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("chunk_index", chunkIndex);

    const { error } = await supabase.from("ai_chunks").insert({
      content_type: contentType,
      content_id: contentId,
      chunk_index: chunkIndex,
      chunk_text: trimmed.slice(0, 8000),
      metadata: metadata ?? {},
    });

    if (error) {
      console.error("[admin/ai-chunks] insert failed:", error);
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Chunk saved for Jade Tutor retrieval",
    });
  } catch (e) {
    console.error("[admin/ai-chunks] error:", e);
    return NextResponse.json(
      { error: String(e), code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
