import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AUTH_ROUTES } from "@/config/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Protected app layout. All routes under (app) require authentication.
 * Admin routes (/admin/*) skip onboarding; AdminLayout enforces admin role.
 * Learner routes (/(learner)/*) have their own layout that enforces onboarding + track.
 * Route groups avoid relying on x-pathname header which can be unreliable during RSC/hydration.
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

  return <AppShell>{children}</AppShell>;
}
