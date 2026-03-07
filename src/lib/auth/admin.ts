import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user has any admin role.
 * Use in Server Components and Route Handlers for admin-only areas.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}
