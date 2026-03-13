#!/usr/bin/env npx tsx
/**
 * Verify admin role for a user.
 *
 * Usage:
 *   npx tsx scripts/verify-admin.ts [email]
 *
 * If email is omitted, uses DEFAULT_ADMIN_EMAIL from .env.local.
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for reliable check).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? "support@xentis.com";

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const email = (process.argv[2] ?? ADMIN_EMAIL).trim().toLowerCase();
  if (!SUPABASE_URL?.trim()) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!SERVICE_ROLE_KEY?.trim()) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[verify-admin] Looking up user: ${email}`);

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.log(`[verify-admin] User not found: ${email}`);
    console.log("  Run: npm run admin:bootstrap  to create and assign admin role.");
    process.exit(1);
  }

  const { data: roles, error } = await supabase
    .from("user_admin_roles")
    .select("id, admin_role_id, created_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("[verify-admin] Query failed:", error.message);
    process.exit(1);
  }

  if (!roles?.length) {
    console.log(`[verify-admin] User ${email} (${user.id}) has NO admin role.`);
    console.log("  Run: npm run admin:bootstrap  to assign super_admin role.");
    process.exit(1);
  }

  const { data: adminRoleNames } = await supabase
    .from("admin_roles")
    .select("id, slug, name")
    .in("id", roles.map((r) => r.admin_role_id));

  const roleSlugs = adminRoleNames?.map((r) => r.slug).join(", ") ?? "unknown";

  console.log(`[verify-admin] OK: ${email} (${user.id}) has admin role(s): ${roleSlugs}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
