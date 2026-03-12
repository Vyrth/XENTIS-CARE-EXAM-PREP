import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
const AUTH_ROUTES = ["/login", "/signup", "/admin/login"];

/**
 * Onboarding - first-time setup (redirect if already completed)
 */
const ONBOARDING_ROUTE = "/onboarding";

/**
 * Admin routes - require admin role
 */
const ADMIN_ROUTE_PREFIX = "/admin";

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

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith(ADMIN_ROUTE_PREFIX);
}

function isAuthCallbackRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/callback");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
      if (pathname.startsWith("/admin/login")) {
        // Admin login: redirect to /admin (layout will redirect to /dashboard if not admin)
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      const redirectTo =
        request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  // Not authenticated - redirect to login
  if (!user) {
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
