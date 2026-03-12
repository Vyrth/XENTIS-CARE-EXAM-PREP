/**
 * Centralized admin route constants and helpers.
 * Use these instead of hardcoded "/admin" strings to prevent 404s and keep routing consistent.
 */

/** Canonical admin base path. All admin routes live under this. */
export const ADMIN_BASE = "/admin" as const;

/** Admin login (public auth route, not under ADMIN_BASE) */
export const ADMIN_LOGIN = "/admin/login" as const;

/** Known bad/invalid admin-like paths that should redirect to ADMIN_BASE */
export const BAD_ADMIN_PATHS = [
  "/dashboard/admin",
  "/admin-dashboard",
  "/dashboard/admin-dashboard",
] as const;

/** Canonical admin sub-routes. Use adminPath() to build full paths. */
export const ADMIN_ROUTES = {
  OVERVIEW: ADMIN_BASE,
  CURRICULUM: `${ADMIN_BASE}/curriculum`,
  SYSTEM_BUNDLES: `${ADMIN_BASE}/system-bundles`,
  QUESTIONS: `${ADMIN_BASE}/questions`,
  QUESTIONS_IMPORT: `${ADMIN_BASE}/questions/import`,
  QUESTIONS_NEW: `${ADMIN_BASE}/questions/new`,
  STUDY_GUIDES: `${ADMIN_BASE}/study-guides`,
  STUDY_GUIDES_NEW: `${ADMIN_BASE}/study-guides/new`,
  FLASHCARDS: `${ADMIN_BASE}/flashcards`,
  FLASHCARDS_NEW: `${ADMIN_BASE}/flashcards/new`,
  VIDEOS: `${ADMIN_BASE}/videos`,
  VIDEOS_NEW: `${ADMIN_BASE}/videos/new`,
  MEDIA_RIGHTS: `${ADMIN_BASE}/media-rights`,
  REVIEW_QUEUE: `${ADMIN_BASE}/review-queue`,
  PUBLISH_QUEUE: `${ADMIN_BASE}/publish-queue`,
  AI_PROMPTS: `${ADMIN_BASE}/ai-prompts`,
  MASTERY_RULES: `${ADMIN_BASE}/mastery-rules`,
  RECOMMENDATIONS: `${ADMIN_BASE}/recommendations`,
  ISSUE_REPORTS: `${ADMIN_BASE}/issue-reports`,
  HIGH_YIELD: `${ADMIN_BASE}/high-yield`,
  HIGH_YIELD_NEW: `${ADMIN_BASE}/high-yield/new`,
  EXAMS: `${ADMIN_BASE}/exams`,
  EXAMS_TEMPLATES: `${ADMIN_BASE}/exams/templates`,
  EXAMS_SYSTEM: `${ADMIN_BASE}/exams/system`,
  BATCH_PLANNER: `${ADMIN_BASE}/batch-planner`,
  CONTENT_INVENTORY: `${ADMIN_BASE}/content-inventory`,
  LAUNCH_READINESS: `${ADMIN_BASE}/launch-readiness`,
  BLUEPRINT_COVERAGE: `${ADMIN_BASE}/blueprint-coverage`,
  ANALYTICS: `${ADMIN_BASE}/analytics`,
  AI_FACTORY: `${ADMIN_BASE}/ai-factory`,
  AUTONOMOUS_OPERATIONS: `${ADMIN_BASE}/autonomous-operations`,
  MISSING_CONTENT: `${ADMIN_BASE}/missing-content`,
} as const;

/**
 * Check if pathname is under the admin CMS area.
 * Includes /admin/login - use routes.isAdminRoute() for admin-protected routes only.
 * @deprecated Prefer routes.isAdminRoute() which excludes /admin/login
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

/** Check if pathname is a known bad admin-like path */
export function isBadAdminPath(pathname: string): boolean {
  return BAD_ADMIN_PATHS.some(
    (bad) => pathname === bad || pathname.startsWith(`${bad}/`)
  );
}

/** Safe redirect target for admin users. Use when redirecting from bad/missing admin routes. */
export function getAdminRedirectTarget(): string {
  return ADMIN_BASE;
}

/** Build admin path for a content type and optional id */
export function adminContentPath(
  type: "questions" | "study-guides" | "videos" | "flashcards" | "high-yield" | "exams/templates" | "exams/system",
  id?: string
): string {
  const base = `${ADMIN_BASE}/${type}`;
  return id ? `${base}/${id}` : base;
}
