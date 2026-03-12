/**
 * Admin AI Factory - auth guard (no rate limits for admins).
 * All AI Content Factory server actions must use this.
 * Admins have unrestricted AI generation access.
 */

import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export interface AdminAIGuardResult {
  allowed: true;
  userId: string;
}

export interface AdminAIGuardDenied {
  allowed: false;
  error: string;
  status?: 401 | 403;
}

/**
 * Enforce admin-only for AI Content Factory actions.
 * No rate limits, quotas, or plan restrictions for admins.
 * Call at the start of each action. Returns userId if allowed, or error details if denied.
 */
export async function withAdminAIGuard(): Promise<AdminAIGuardResult | AdminAIGuardDenied> {
  const user = await getSessionUser();
  if (!user) {
    return { allowed: false, error: "Sign in required", status: 401 };
  }

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    return { allowed: false, error: "Admin access required", status: 403 };
  }

  return { allowed: true, userId: user.id };
}
