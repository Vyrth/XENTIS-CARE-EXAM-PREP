import { createBrowserClient } from "@supabase/ssr";
import {
  isSupabaseConfigured,
  SUPABASE_ENV,
  warnIfSupabaseMissing,
} from "./env";

/**
 * Browser-side Supabase client. Use in Client Components.
 * Session is managed via cookies.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  warnIfSupabaseMissing();
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  return createBrowserClient(SUPABASE_ENV.url!, SUPABASE_ENV.anonKey!);
}
