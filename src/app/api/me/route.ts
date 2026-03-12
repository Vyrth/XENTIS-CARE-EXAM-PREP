/**
 * Current user profile - returns track slug and entitlement usage for client components
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getEntitlements } from "@/lib/billing/access";
import { getAIActionsUsedToday, getQuestionsUsedToday } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ track: null, userId: null, entitlements: null }, { status: 200 });
  }
  const profile = await getProfile(user.id);
  const trackId = profile?.primary_exam_track_id;
  let track: string | null = null;
  if (trackId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("exam_tracks")
      .select("slug")
      .eq("id", trackId)
      .single();
    track = (data?.slug as string) ?? null;
  }

  const [entitlements, aiUsed, questionsUsed] = await Promise.all([
    getEntitlements(user.id),
    getAIActionsUsedToday(user.id),
    getQuestionsUsedToday(user.id),
  ]);

  return NextResponse.json({
    track,
    userId: user.id,
    entitlements: {
      plan: entitlements.plan,
      questionsPerDay: entitlements.questionsPerDay,
      aiActionsPerDay: entitlements.aiActionsPerDay,
      questionsUsedToday: questionsUsed,
      aiActionsUsedToday: aiUsed,
    },
  });
}
