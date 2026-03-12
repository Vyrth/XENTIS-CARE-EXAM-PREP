/**
 * Supabase environment variable utilities.
 * Centralizes access and provides dev-friendly warnings for missing vars.
 */

export const SUPABASE_ENV = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

/** True if URL and anon key are set (required for auth and RLS-aware clients) */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_ENV.url?.trim() && SUPABASE_ENV.anonKey?.trim());
}

/** True if URL and service role key are set (required for admin/webhook clients) */
export function isSupabaseServiceRoleConfigured(): boolean {
  return !!(SUPABASE_ENV.url?.trim() && SUPABASE_ENV.serviceRoleKey?.trim());
}

let warned = false;

/** One-time dev console warning when Supabase env vars are missing */
export function warnIfSupabaseMissing(): void {
  if (warned || process.env.NODE_ENV !== "development") return;
  if (!isSupabaseConfigured()) {
    warned = true;
    console.warn(
      "[Supabase] Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local. Auth and data features will not work."
    );
  }
}
