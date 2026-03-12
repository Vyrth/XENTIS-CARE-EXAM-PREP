import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getPrimaryTrack, clearOrphanedPrimaryTrack } from "@/lib/auth/track";
import { AUTH_ROUTES } from "@/config/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Protected app layout. All routes under (app) require authentication.
 * Redirects to onboarding if profile onboarding not completed or no track set.
 * Verifies track exists (handles orphaned FK); clears and redirects if not.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const profile = await getProfile(user.id);
  if (!profile) redirect(AUTH_ROUTES.LOGIN);

  if (process.env.NODE_ENV === "development") {
    console.log("[guard] onboarding status", {
      onboarding_completed_at: !!profile.onboarding_completed_at,
      primary_exam_track_id: profile.primary_exam_track_id ?? "null",
    });
  }

  // First-time users: redirect to onboarding
  if (!profile.onboarding_completed_at) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] redirecting to onboarding (incomplete)");
    }
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  // Track required: redirect if primary_exam_track_id not set
  if (!profile.primary_exam_track_id) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] redirecting to onboarding (no track)");
    }
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  // Orphaned track: primary_exam_track_id points to non-existent exam_track
  const primary = await getPrimaryTrack(user.id);
  if (!primary?.trackId) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] orphaned track, clearing and redirecting to onboarding");
    }
    await clearOrphanedPrimaryTrack(user.id);
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  return <AppShell>{children}</AppShell>;
}
