/**
 * Single source of truth for route classification.
 * Use these helpers everywhere: middleware, layouts, nav, auth callback.
 *
 * Route types (mutually exclusive for protected space):
 * - public: no auth (/, /pricing, etc.)
 * - auth: login/signup (redirect if already authenticated)
 * - admin: /admin, /admin/* (excl. /admin/login) — separate protected space, never hits learner logic
 * - learner: /dashboard, /practice, etc. — require onboarding + track
 * - onboarding: /onboarding
 *
 * Admin and learner are separate route groups; admin never runs learner redirect logic.
 */

import {
  ADMIN_BASE,
  ADMIN_LOGIN,
  BAD_ADMIN_PATHS,
  getAdminRedirectTarget,
} from "./admin-routes";
import { AUTH_ROUTES } from "./auth";

// -----------------------------------------------------------------------------
// Route classification (pathname-based, no auth state)
// -----------------------------------------------------------------------------

/** Paths that require no authentication */
export const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/faq",
  "/legal/terms",
  "/legal/privacy",
] as const;

/** Auth entry points: login, signup, admin login */
export const AUTH_PATHS = [AUTH_ROUTES.LOGIN, AUTH_ROUTES.SIGNUP, ADMIN_LOGIN] as const;

/** Onboarding flow */
export const ONBOARDING_PATH = "/onboarding" as const;

/** Auth callback - Supabase OAuth/magic link */
export const AUTH_CALLBACK_PATH = "/auth/callback" as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
}

export function isAuthCallbackRoute(pathname: string): boolean {
  return pathname.startsWith(AUTH_CALLBACK_PATH);
}

/**
 * Admin CMS routes: /admin and /admin/* but NOT /admin/login.
 * /admin/login is an auth route, not an admin-protected route.
 */
export function isAdminRoute(pathname: string): boolean {
  if (pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`)) {
    return false;
  }
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

/**
 * Learner routes: require onboarding + track.
 * Defined by route group (app)/(learner)/* - use pathname for client-side checks.
 */
const LEARNER_PATH_PREFIXES = [
  "/dashboard",
  "/study-plan",
  "/questions",
  "/topics",
  "/pre-practice",
  "/adaptive-exam",
  "/practice",
  "/flashcards",
  "/videos",
  "/study-guides",
  "/notebook",
  "/ai-tutor",
  "/high-yield",
  "/progress",
  "/weak-areas",
  "/strength-report",
  "/confidence-calibration",
  "/billing",
  "/profile",
  "/exam",
  "/results",
  "/study",
  "/readiness-demo",
] as const;

export function isLearnerRoute(pathname: string): boolean {
  return LEARNER_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isBadAdminPath(pathname: string): boolean {
  return BAD_ADMIN_PATHS.some(
    (bad) => pathname === bad || pathname.startsWith(`${bad}/`)
  );
}

// Re-export for convenience
export { getAdminRedirectTarget };

/** Barrel object for route classification (use in guards, middleware, nav) */
export const routeGuard = {
  isAdminRoute,
  isLearnerRoute,
  isPublicRoute,
  isAuthRoute,
  isOnboardingRoute,
  isAuthCallbackRoute,
  isBadAdminPath,
} as const;
