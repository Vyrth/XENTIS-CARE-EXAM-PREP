import { redirect } from "next/navigation";
import { getAdminRedirectTarget } from "@/config/admin-routes";

/**
 * Catch-all for unknown admin paths (e.g. /admin/nonexistent).
 * Redirects to admin overview instead of 404.
 * Required catch-all [...slug] matches one or more segments; does not conflict with /admin.
 */
export default function AdminCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  void params; // Catch-all receives slug but we always redirect
  redirect(getAdminRedirectTarget());
}
