#!/usr/bin/env npx tsx
/**
 * Seed user-specific data (readiness snapshots, adaptive queues, exam sessions)
 * Requires: User must be signed up first. Pass --userId=UUID or we use first profile.
 *
 * Usage:
 *   npm run seed:user
 *   npm run seed:user -- --userId=YOUR_UUID
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const userId = getUserId();
  if (!userId) {
    console.error("No user ID. Sign up first, then run: npm run seed:user -- --userId=YOUR_UUID");
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Ensure profile exists
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).single();
  if (!profile) {
    console.error("Profile not found for user", userId, "- sign up first");
    process.exit(1);
  }

  // Get exam_track_id for RN
  const { data: track } = await supabase.from("exam_tracks").select("id").eq("slug", "rn").single();
  if (!track) {
    console.error("RN track not found - run db:seed first");
    process.exit(1);
  }

  // User exam track
  await supabase.from("user_exam_tracks").upsert(
    { user_id: userId, exam_track_id: track.id },
    { onConflict: "user_id,exam_track_id" }
  );

  // Readiness snapshot
  await supabase.from("user_readiness_snapshots").insert({
    user_id: userId,
    exam_track_id: track.id,
    overall_score_pct: 72,
    breakdown: { cardiovascular: 68, respiratory: 72, renal: 65, psychosocial: 75 },
    snapshot_at: new Date().toISOString(),
  });

  // Get a question for adaptive queue
  const { data: q } = await supabase
    .from("questions")
    .select("id")
    .eq("exam_track_id", track.id)
    .limit(1)
    .single();

  if (q) {
    await supabase.from("adaptive_question_queue").insert({
      user_id: userId,
      question_id: q.id,
      exam_track_id: track.id,
      priority: "high",
      reason_slug: "weak_system",
      added_at: new Date().toISOString(),
    });
  }

  // Get study guide for content queue
  const { data: sg } = await supabase
    .from("study_guides")
    .select("id")
    .eq("exam_track_id", track.id)
    .limit(1)
    .single();

  if (sg) {
    await supabase.from("recommended_content_queue").insert({
      user_id: userId,
      exam_track_id: track.id,
      content_type: "study_guide",
      content_id: sg.id,
      priority: "medium",
      reason_slug: "weak_system",
      added_at: new Date().toISOString(),
    });
  }

  console.log("User seed complete for", userId);
}

function getUserId(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--userId="));
  if (arg) return arg.split("=")[1] ?? null;
  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
