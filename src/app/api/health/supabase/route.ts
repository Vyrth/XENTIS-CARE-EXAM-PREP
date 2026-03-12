/**
 * Supabase health check - reports whether required env vars are present.
 * Does not expose key values. Safe for uptime monitoring.
 */

import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  isSupabaseServiceRoleConfigured,
  SUPABASE_ENV,
} from "@/lib/supabase/env";

export async function GET() {
  const configured = isSupabaseConfigured();
  const serviceRoleConfigured = isSupabaseServiceRoleConfigured();

  const missing: string[] = [];
  if (!SUPABASE_ENV.url?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ENV.anonKey?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!SUPABASE_ENV.serviceRoleKey?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  const status = configured ? "ok" : "unconfigured";

  return NextResponse.json(
    {
      status,
      configured,
      serviceRoleConfigured,
      urlPresent: !!SUPABASE_ENV.url?.trim(),
      anonKeyPresent: !!SUPABASE_ENV.anonKey?.trim(),
      serviceRoleKeyPresent: !!SUPABASE_ENV.serviceRoleKey?.trim(),
      missing: missing.length > 0 ? missing : undefined,
      message: configured
        ? "Supabase env vars configured"
        : `Missing: ${missing.join(", ")}. Add to .env.local`,
    },
    { status: configured ? 200 : 503 }
  );
}
