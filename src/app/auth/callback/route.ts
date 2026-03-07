import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { syncProfileFromAuth } from "@/lib/auth/profile";

/**
 * OAuth callback handler. Supabase redirects here after Google/Apple sign-in.
 * Exchanges code for session, syncs profile, and redirects to app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync profile from OAuth metadata (email, name, avatar)
      await syncProfileFromAuth(data.user.id, {
        email: data.user.email ?? undefined,
        full_name: data.user.user_metadata?.full_name ?? undefined,
        avatar_url: data.user.user_metadata?.avatar_url ?? undefined,
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
