import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Onboarding layout. Requires auth. Redirects to dashboard if onboarding complete.
 * force-dynamic prevents stale profile reads that could cause redirect ping-pong.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const profile = await getProfile(user.id);
  if (!profile) redirect(AUTH_ROUTES.LOGIN);

  // Only redirect to dashboard when both onboarding and track are set.
  // Avoids redirect loop with app layout when profile is partially updated.
  if (profile.onboarding_completed_at && profile.primary_exam_track_id) {
    if (process.env.NODE_ENV === "development") {
      console.log("[guard] redirecting to dashboard (already onboarded)");
    }
    redirect("/dashboard");
  }

  return <>{children}</>;
}
