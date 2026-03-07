import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { AUTH_ROUTES } from "@/config/auth";

/**
 * Require authentication. Use at the top of Server Components or Route Handlers.
 * Redirects to login if not authenticated. Returns user.
 */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) redirect(AUTH_ROUTES.LOGIN);
  return user;
}
