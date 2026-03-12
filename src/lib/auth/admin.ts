import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/**
 * Check if the given user has any admin role.
 * Uses service role when available for reliable checks (bypasses RLS/cookie quirks).
 * Falls back to session client when service role not configured.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (isSupabaseServiceRoleConfigured()) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_admin_roles")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    return !error && !!data;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return !error && !!data;
}
