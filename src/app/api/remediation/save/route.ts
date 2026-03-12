/**
 * Save remediation plan to user_remediation_plans
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name: string;
    targetType: string;
    targetId: string;
    planData: Record<string, unknown>;
    examTrackId: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, targetType, targetId, planData, examTrackId } = body;
  if (!name || !targetType || !targetId || !planData || !examTrackId) {
    return NextResponse.json(
      { error: "Missing name, targetType, targetId, planData, or examTrackId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_remediation_plans").insert({
    user_id: user.id,
    exam_track_id: examTrackId,
    name,
    target_type: targetType,
    target_id: targetId,
    plan_data: planData,
    is_active: true,
  });

  if (error) {
    console.error("[remediation/save] insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save remediation plan", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Remediation plan saved",
  });
}
