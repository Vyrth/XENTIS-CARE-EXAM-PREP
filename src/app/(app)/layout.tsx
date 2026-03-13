import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AUTH_ROUTES } from "@/config/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Protected app layout. All routes under (app) require authentication + profile.
 *
 * Route space separation (by Next.js route groups):
 * - Admin: (app)/admin/* → uses AdminLayout (requireAdmin). NO learner redirect logic.
 * - Learner: (app)/(learner)/* → uses LearnerLayout (onboarding + track). NO admin redirect logic.
 *
 * This layout applies only auth + profile. Admin and learner redirects live in their
 * respective layouts. Admin routes can never be hijacked by learner redirects.
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
