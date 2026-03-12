import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { syncProfileFromAuth, getProfile } from "@/lib/auth/profile";
import { getAuthBaseUrl } from "@/lib/auth/url";

/**
 * Auth callback handler. Supabase redirects here after:
 * - OAuth (Google, Apple)
 * - Magic link (email)
 *
 * Exchanges code for session, syncs profile, and redirects to app.
 * New users (no onboarding_completed_at) go to /onboarding; others to /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const baseUrl = getAuthBaseUrl();

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
  }

  // Sync profile from auth metadata (email, name, avatar)
  await syncProfileFromAuth(data.user.id, {
    email: data.user.email ?? undefined,
    full_name: data.user.user_metadata?.full_name ?? undefined,
    avatar_url: data.user.user_metadata?.avatar_url ?? undefined,
  });

  // New users: onboarding. Returning users: dashboard (or next)
  const profile = await getProfile(data.user.id);
  const needsOnboarding = !profile?.onboarding_completed_at;
  const redirectPath =
    nextParam ?? (needsOnboarding ? "/onboarding" : "/dashboard");

  return NextResponse.redirect(`${baseUrl}${redirectPath}`);
}
