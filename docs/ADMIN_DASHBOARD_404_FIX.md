# Admin Dashboard 404 Fix & Route Hardening

## Root Cause

The admin area lives at `/admin`, not `/dashboard/admin`. There is no route at `/dashboard/admin` in the app structure:

- **Canonical admin routes:** `/admin`, `/admin/analytics`, `/admin/ai-factory`, etc.
- **Learner dashboard:** `/dashboard`

Users or links pointing to `/dashboard/admin` received a 404 because that path does not exist.

## Centralized Admin Route Definition

**`src/config/admin-routes.ts`** — Single source of truth for admin routing:

- `ADMIN_BASE` — Canonical base path (`/admin`)
- `ADMIN_LOGIN` — Admin login path (`/admin/login`)
- `ADMIN_ROUTES` — All admin sub-routes (OVERVIEW, QUESTIONS, AI_FACTORY, etc.)
- `BAD_ADMIN_PATHS` — Paths that redirect to `/admin` (e.g. `/dashboard/admin`, `/admin-dashboard`)
- `isAdminRoute(pathname)` — Check if path is under admin area
- `isBadAdminPath(pathname)` — Check if path is a known bad admin-like route
- `getAdminRedirectTarget()` — Safe redirect target for admin users
- `adminContentPath(type, id?)` — Build content edit paths

Use these constants and helpers instead of hardcoded strings.

## Files Changed

1. **`src/config/admin-routes.ts`** (new)
   - Centralized admin route constants and helpers

2. **`src/config/auth.ts`**
   - Re-exports `ADMIN_ROUTE_PREFIX` from admin-routes

3. **`src/config/nav.ts`**
   - Uses `ADMIN_ROUTES` for all admin nav hrefs

4. **`src/middleware.ts`**
   - Uses `isBadAdminPath`, `getAdminRedirectTarget`, `ADMIN_LOGIN`, `isAdminRoute` from admin-routes

5. **`src/app/(app)/layout.tsx`**
   - Uses `isAdminRoute` from admin-routes

6. **`src/app/(app)/admin/layout.tsx`**
   - Uses `PROTECTED_ROUTES.DASHBOARD` for non-admin redirect

7. **`src/app/(app)/admin/[[...slug]]/page.tsx`** (new)
   - Catch-all for unknown admin paths; redirects to `/admin` instead of 404

8. **`src/components/layout/AppSidebar.tsx`**
   - Uses `isAdminRoute` from admin-routes

9. **`src/components/auth/AdminLoginForm.tsx`**
   - Uses `getAdminRedirectTarget()` for post-login redirect

10. **`src/app/(public)/admin/login/page.tsx`**
    - Uses `getAdminRedirectTarget()` for server redirect

11. **`src/app/(app)/admin/page.tsx`**, **publish-queue/page.tsx`**
    - Use `ADMIN_ROUTES` for all admin links

12. **`src/lib/admin/ai-factory-gap-links.ts`**
    - Uses `ADMIN_ROUTES.AI_FACTORY`

13. **`src/app/(app)/actions/source-evidence.ts`**, **content-review.ts`**
    - Use `ADMIN_ROUTES` for revalidatePath

14. **`src/app/(app)/actions/ai-batch.ts`**, **`src/app/api/admin/reset-content/route.ts`**
    - Use `ADMIN_ROUTES` for revalidatePath

## Guard / Redirect Behavior

- **Middleware:** Any request to `BAD_ADMIN_PATHS` (e.g. `/dashboard/admin`) redirects to `/admin`
- **Admin login:** Authenticated admins from `/admin/login` redirect to `getAdminRedirectTarget()` (`/admin`)
- **Admin catch-all:** Unknown admin paths (e.g. `/admin/nonexistent`) redirect to `/admin` instead of 404

## Canonical Admin Route Structure

| Route | Constant |
|-------|----------|
| `/admin` | `ADMIN_ROUTES.OVERVIEW` |
| `/admin/analytics` | `ADMIN_ROUTES.ANALYTICS` |
| `/admin/ai-factory` | `ADMIN_ROUTES.AI_FACTORY` |
| `/admin/curriculum` | `ADMIN_ROUTES.CURRICULUM` |
| `/admin/questions` | `ADMIN_ROUTES.QUESTIONS` |
| ... | See `src/config/admin-routes.ts` |

**Not** `/dashboard/admin` — that path redirects to `/admin`.

## Non-Admin Protection

- **AdminLayout** (`src/app/(app)/admin/layout.tsx`): Checks `isAdmin(user.id)`; non-admins redirect to `/dashboard`
- **Middleware:** Does not perform admin role check (DB access); AdminLayout handles it
- **Admin login** (`/admin/login`): Redirects admins to `/admin`, non-admins to `/dashboard`

## Verification

- `/admin` loads for admin users
- `/dashboard` loads for learners
- `/dashboard/admin` redirects to `/admin` (no 404)
- `/admin/nonexistent` redirects to `/admin` (no 404)
- Non-admin users hitting `/admin` are redirected to `/dashboard`
- Learner routing unchanged
