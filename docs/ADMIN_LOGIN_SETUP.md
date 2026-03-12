# Admin Login Setup

This guide explains how to set up and use the admin login for Xentis Care Exam Prep.

## Required Environment Variables

Add these to `.env.local` (never commit; .env.local is gitignored):

```env
# Admin bootstrap (create default admin user)
DEFAULT_ADMIN_EMAIL=support@xentis.com
DEFAULT_ADMIN_PASSWORD=your-secure-password

# Supabase (required for bootstrap)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Create the Admin User

Run the bootstrap script (loads `.env.local` automatically):

```bash
npm run admin:bootstrap
```

The script will:

1. Check if a user with `DEFAULT_ADMIN_EMAIL` exists
2. If not, create the auth user with email/password (email confirmed)
3. Ensure a profile exists
4. Assign the `super_admin` role in `user_admin_roles`

The script is **idempotent** — safe to run multiple times.

## Manual SQL: Assign Admin to Existing User

If you cannot run the bootstrap script (e.g. user already exists in production), assign admin via SQL.

**Note:** The `profiles` table has no `role` column. Admin is determined by `user_admin_roles`.

```sql
-- Assign super_admin to user by email (idempotent)
INSERT INTO user_admin_roles (user_id, admin_role_id)
SELECT p.id, ar.id
FROM profiles p
CROSS JOIN admin_roles ar
WHERE p.email = 'support@xentis.com'
  AND ar.slug = 'super_admin'
ON CONFLICT (user_id, admin_role_id) DO NOTHING;
```

To verify:

```sql
SELECT p.email, ar.slug
FROM profiles p
JOIN user_admin_roles uar ON uar.user_id = p.id
JOIN admin_roles ar ON ar.id = uar.admin_role_id
WHERE p.email = 'support@xentis.com';
```

## Log In Locally

1. **Admin login URL:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

2. Enter:
   - **Email:** `support@xentis.com` (or your `DEFAULT_ADMIN_EMAIL`)
   - **Password:** The value of `DEFAULT_ADMIN_PASSWORD`

3. After successful sign-in, you are redirected to `/admin`.

## Admin Authorization

- **`/admin`** and all `/admin/*` routes require:
  - Authenticated user (redirect to `/login` if not)
  - Admin role (redirect to `/dashboard` if not admin)

- Admin role is determined by `user_admin_roles` — a row linking the user to an `admin_roles` entry (e.g. `super_admin`).

## Public Admin Link

A small "Admin" link appears on:

- Public navbar (desktop and mobile)
- Landing page footer

It points to `/admin/login`.
