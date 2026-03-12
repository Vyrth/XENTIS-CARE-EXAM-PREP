import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getPrimaryTrack, clearOrphanedPrimaryTrack } from "@/lib/auth/track";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Learner layout. All routes under (learner) require onboarding + track.
 * Admin routes (/admin/*) are siblings and skip this layout entirely.
 * This avoids relying on x-pathname header which can be unreliable during RSC/hydration.
 */
export const dynamic = "force-dynamic";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const profile = await getProfile(user.id);
  if (!profile) redirect(AUTH_ROUTES.LOGIN);

  if (!profile.onboarding_completed_at) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] redirecting to onboarding (incomplete)");
    }
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  if (!profile.primary_exam_track_id) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] redirecting to onboarding (no track)");
    }
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  const primary = await getPrimaryTrack(user.id);
  if (!primary?.trackId) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] orphaned track, clearing and redirecting to onboarding");
    }
    await clearOrphanedPrimaryTrack(user.id);
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  return <>{children}</>;
}
