import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { isAdmin } from "./admin";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Require admin role. Use in admin Server Components or Route Handlers.
 * Redirects to login if not authenticated, or dashboard if not admin.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) redirect("/dashboard");

  return user;
}
