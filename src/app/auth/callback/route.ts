import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { syncProfileFromAuth, getProfile } from "@/lib/auth/profile";
import { isAdmin } from "@/lib/auth/admin";
import { getAuthBaseUrl, getSafeRedirectPath } from "@/lib/auth/url";
import { ADMIN_BASE } from "@/config/admin-routes";
import { isAdminRoute } from "@/config/routes";

/**
 * Auth callback handler. Supabase redirects here after:
 * - OAuth (Google, Apple)
 * - Magic link (email)
 *
 * Redirect priority (admin intent preserved):
 * 1. Validated `next` param (admin paths only for admin users)
 * 2. Admin user with no next -> /admin
 * 3. Learner -> onboarding or /dashboard
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

  const userIsAdmin = await isAdmin(data.user.id);
  const safeNext = getSafeRedirectPath(nextParam);

  // 1. Validated next param: use if safe. Admin paths only for admin users.
  if (safeNext) {
    if (isAdminRoute(safeNext) && !userIsAdmin) {
      return NextResponse.redirect(`${baseUrl}/dashboard`);
    }
    return NextResponse.redirect(`${baseUrl}${safeNext}`);
  }

  // 2. Admin user with no next -> /admin
  if (userIsAdmin) {
    return NextResponse.redirect(`${baseUrl}${ADMIN_BASE}`);
  }

  // 3. Learner -> onboarding or /dashboard
  const profile = await getProfile(data.user.id);
  const needsOnboarding = !profile?.onboarding_completed_at;
  const redirectPath = needsOnboarding ? "/onboarding" : "/dashboard";

  return NextResponse.redirect(`${baseUrl}${redirectPath}`);
}
