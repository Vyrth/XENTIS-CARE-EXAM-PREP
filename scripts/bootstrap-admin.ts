#!/usr/bin/env npx tsx
/**
 * Bootstrap admin user for Xentis Care Exam Prep.
 *
 * Creates the default admin user (support@xentis.com) if it does not exist,
 * assigns super_admin role, and ensures profile exists.
 *
 * Usage: npm run admin:bootstrap
 * Requires: SUPABASE_SERVICE_ROLE_KEY, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD in env
 * Load from .env.local: node --env-file=.env.local node_modules/.bin/tsx scripts/bootstrap-admin.ts
 *
 * Idempotent: safe to run multiple times.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? "support@xentis.com";
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  if (!SUPABASE_URL?.trim()) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!SERVICE_ROLE_KEY?.trim()) fail("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!ADMIN_PASSWORD?.trim()) fail("Missing DEFAULT_ADMIN_PASSWORD (never hardcode in source)");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = ADMIN_EMAIL.trim().toLowerCase();
  console.log(`[bootstrap-admin] Checking for admin user: ${email}`);

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`[bootstrap-admin] User already exists: ${userId}`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Xentis Admin" },
    });
    if (error) fail(`Failed to create user: ${error.message}`);
    if (!created?.user?.id) fail("User creation returned no id");
    userId = created.user.id;
    console.log(`[bootstrap-admin] Created user: ${userId}`);
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) {
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: "Xentis Admin",
    });
    if (profileErr) {
      console.warn(`[bootstrap-admin] Profile insert failed (trigger may have created it): ${profileErr.message}`);
    } else {
      console.log("[bootstrap-admin] Created profile");
    }
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("slug", "super_admin")
    .maybeSingle();

  if (!adminRole) fail("admin_roles.super_admin not found. Run migrations first.");

  const { data: existingRole } = await supabase
    .from("user_admin_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("admin_role_id", adminRole.id)
    .maybeSingle();

  if (!existingRole) {
    const { error: roleErr } = await supabase.from("user_admin_roles").insert({
      user_id: userId,
      admin_role_id: adminRole.id,
    });
    if (roleErr) fail(`Failed to assign admin role: ${roleErr.message}`);
    console.log("[bootstrap-admin] Assigned super_admin role");
  } else {
    console.log("[bootstrap-admin] Admin role already assigned");
  }

  console.log("[bootstrap-admin] Done. Admin can sign in at /admin/login");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
