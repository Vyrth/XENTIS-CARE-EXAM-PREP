import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Admin layout. Requires auth + admin role.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
