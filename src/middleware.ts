import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  ADMIN_LOGIN,
  getAdminRedirectTarget,
  isAdminRoute,
  isBadAdminPath,
} from "@/config/admin-routes";
import { getSafeRedirectPath } from "@/lib/auth/url";

/**
 * Public routes - no auth required
 */
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/faq",
  "/legal/terms",
  "/legal/privacy",
];

/**
 * Auth routes - sign in, callback (redirect if already authenticated)
 */
const AUTH_ROUTES = ["/login", "/signup", ADMIN_LOGIN];

/**
 * Onboarding - first-time setup (redirect if already completed)
 */
const ONBOARDING_ROUTE = "/onboarding";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE || pathname.startsWith(`${ONBOARDING_ROUTE}/`);
}

function isAuthCallbackRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/callback");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isBadAdminPath(pathname)) {
    return NextResponse.redirect(new URL(getAdminRedirectTarget(), request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const requestWithPathname = new NextRequest(request.url, { headers: requestHeaders });
  const { user, response } = await updateSession(requestWithPathname);

  // Auth callback - always allow (Supabase handles redirect)
  if (isAuthCallbackRoute(pathname)) {
    return response;
  }

  // Public routes - allow all
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Auth routes (login, signup, admin/login) - allow unauthenticated; redirect authenticated users
  if (isAuthRoute(pathname)) {
    if (user) {
      // Admin login: let page handle redirect (admins -> returnTo/admin, non-admins -> dashboard)
      if (pathname.startsWith(ADMIN_LOGIN)) {
        return response;
      }
      const raw = request.nextUrl.searchParams.get("redirectTo");
      const redirectTo = getSafeRedirectPath(raw) ?? "/dashboard";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  // Not authenticated - redirect to appropriate login
  if (!user) {
    if (isAdminRoute(pathname)) {
      const adminLoginUrl = new URL(ADMIN_LOGIN, request.url);
      adminLoginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(adminLoginUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: role check happens in layout (middleware can't easily query DB)
  // Allow through; AdminLayout will redirect if not admin
  if (isAdminRoute(pathname)) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
