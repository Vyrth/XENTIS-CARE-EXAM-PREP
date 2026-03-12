import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseServiceRoleConfigured,
  SUPABASE_ENV,
  warnIfSupabaseMissing,
} from "./env";

/**
 * Service role client - bypasses RLS. Use ONLY for:
 * - Stripe webhooks (no user session)
 * - Server-side admin operations
 * Never expose to client.
 * Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export function createServiceClient() {
  warnIfSupabaseMissing();
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error(
      "Missing Supabase service role env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
    );
  }
  return createClient(SUPABASE_ENV.url!, SUPABASE_ENV.serviceRoleKey!);
}
