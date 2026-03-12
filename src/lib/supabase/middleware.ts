import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  SUPABASE_ENV,
  warnIfSupabaseMissing,
} from "./env";

/**
 * Middleware session refresh. Refreshes Supabase auth and writes cookies to response.
 * Use getUser() for server-side verification (validates JWT).
 * Fails gracefully when env vars are missing (avoids repeated header errors in dev).
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    warnIfSupabaseMissing();
    return { user: null, response };
  }

  const supabase = createServerClient(
    SUPABASE_ENV.url!,
    SUPABASE_ENV.anonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired; validates JWT server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response };
}
