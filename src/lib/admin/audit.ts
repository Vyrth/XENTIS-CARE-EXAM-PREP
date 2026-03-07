/**
 * Admin audit logging - track who did what, when.
 * Add admin_audit_logs table and wire this to Supabase for persistence.
 */

import { createClient } from "@/lib/supabase/server";

export type AdminAuditAction =
  | "content_approve"
  | "content_reject"
  | "content_delete"
  | "content_publish"
  | "user_role_grant"
  | "user_role_revoke"
  | "status_transition";

export async function logAdminAction(
  actorId: string,
  action: AdminAuditAction,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Table admin_audit_logs must exist (migration)
    const { error } = await supabase.from("admin_audit_logs").insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload ?? {},
      ip: ip ?? null,
    });

    if (error) {
      // Fallback: log to console if table missing
      console.warn("[audit] admin_audit_logs insert failed:", error.message);
      console.info("[audit]", { actorId, action, entityType, entityId, payload });
    }
  } catch (e) {
    console.warn("[audit] logAdminAction error:", e);
  }
}
