import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Onboarding layout. Requires auth. Redirects to dashboard if onboarding complete.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const profile = await getProfile(user.id);
  if (!profile) redirect(AUTH_ROUTES.LOGIN);

  if (profile.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
