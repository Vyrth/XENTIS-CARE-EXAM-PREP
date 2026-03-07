import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AUTH_ROUTES } from "@/config/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Protected app layout. All routes under (app) require authentication.
 * Redirects to onboarding if profile onboarding not completed.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const profile = await getProfile(user.id);
  if (!profile) redirect(AUTH_ROUTES.LOGIN);

  // First-time users: redirect to onboarding
  if (!profile.onboarding_completed_at) {
    redirect(AUTH_ROUTES.ONBOARDING);
  }

  return <AppShell>{children}</AppShell>;
}
