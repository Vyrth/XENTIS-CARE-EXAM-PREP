/**
 * Beta feedback intake - store or forward to external tool
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUser();

  let body: { type?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type = "general", message } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // TODO: Insert into beta_feedback table or send to Canny/Typeform
  // For now, log server-side
  console.info("[feedback]", {
    userId: user?.id,
    type,
    message: message.slice(0, 500),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
