import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  SUPABASE_ENV,
  warnIfSupabaseMissing,
} from "./env";

/**
 * Server-side Supabase client. Use in Server Components, Route Handlers, Server Actions.
 * Reads session from cookies for each request.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export async function createClient() {
  warnIfSupabaseMissing();
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_ENV.url!,
    SUPABASE_ENV.anonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component; ignore
          }
        },
      },
    }
  );
}
