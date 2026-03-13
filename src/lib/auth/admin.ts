import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

const DEBUG = process.env.NODE_ENV === "development" && process.env.DEBUG_ADMIN_AUTH === "1";

/**
 * Check if the given user has any admin role.
 *
 * Source of truth: user_admin_roles table (user_id -> admin_role_id).
 * Lookup order:
 * 1. RPC is_admin() — uses auth.uid() from session, SECURITY DEFINER, most reliable
 * 2. Service-role direct query — bypasses RLS when SUPABASE_SERVICE_ROLE_KEY set
 * 3. Session client direct query — subject to RLS (user_id = auth.uid() allowed)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabaseSession = await createClient();

  // 1. RPC is_admin() — canonical DB function, uses auth.uid() from session
  const { data: rpcResult, error: rpcError } = await supabaseSession.rpc("is_admin");

  if (!rpcError && typeof rpcResult === "boolean") {
    if (DEBUG) {
      console.log("[isAdmin] RPC is_admin()", { userId, result: rpcResult });
    }
    return rpcResult;
  }

  if (DEBUG && rpcError) {
    console.warn("[isAdmin] RPC is_admin() failed, falling back to direct query", {
      userId,
      rpcError: rpcError.message,
    });
  }

  // 2/3. Direct query — service role bypasses RLS; session client uses RLS (user_id = auth.uid())
  const useServiceRole = isSupabaseServiceRoleConfigured();
  const supabase = useServiceRole ? createServiceClient() : supabaseSession;
  const { data, error } = await supabase
    .from("user_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const result = !error && !!data;
  if (DEBUG) {
    console.log("[isAdmin] direct query", {
      userId,
      useServiceRole,
      error: error?.message ?? null,
      hasRow: !!data,
      result,
    });
  }

  return result;
}
