-- =============================================================================
-- Migration 017: Admin Audit Logs
-- =============================================================================
-- Tracks admin actions for compliance and debugging.
-- =============================================================================

CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_actor ON admin_audit_logs(actor_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (policy via user_admin_roles)
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_admin_roles uar
      JOIN admin_roles ar ON uar.admin_role_id = ar.id
      WHERE uar.user_id = auth.uid()
      AND ar.slug IN ('super_admin', 'content_editor', 'support', 'analytics_viewer')
    )
  );

-- Service role can insert (for server-side logging)
-- RLS allows service role by default; app uses service or bypass for insert
CREATE POLICY "Service can insert audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
