/**
 * Helpers for source governance (track slug lookup by id).
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/** Get track slug by exam_track_id */
export async function getTrackSlug(examTrackId: string): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("slug")
    .eq("id", examTrackId)
    .single();
  return data?.slug ?? null;
}
