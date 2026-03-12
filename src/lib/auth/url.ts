/**
 * Auth redirect URL - used by OAuth and magic link.
 * Prefer NEXT_PUBLIC_APP_URL, fallback to NEXT_PUBLIC_SITE_URL, then localhost.
 */
export function getAuthBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

/** Allowed redirect path prefixes (prevents open redirect) */
const SAFE_REDIRECT_PREFIXES = ["/admin", "/dashboard", "/onboarding", "/practice", "/study", "/flashcards", "/videos", "/ai-tutor", "/notebook", "/progress", "/topics", "/questions", "/exam", "/results", "/high-yield", "/weak-areas", "/study-plan", "/billing", "/confidence-calibration", "/strength-report", "/pre-practice", "/adaptive-exam"];

/**
 * Validate redirect path to prevent open redirect. Returns path if safe, null otherwise.
 */
export function getSafeRedirectPath(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const decoded = decodeURIComponent(raw.trim());
  if (!decoded.startsWith("/") || decoded.includes("//") || decoded.startsWith("/\\")) return null;
  if (decoded === "/" || decoded === "/login" || decoded === "/signup") return null;
  const allowed = SAFE_REDIRECT_PREFIXES.some((p) => decoded === p || decoded.startsWith(`${p}/`));
  return allowed ? decoded : null;
}

/** Full callback URL for OAuth / magic link redirect */
export function getAuthCallbackUrl(next = "/dashboard"): string {
  const base = getAuthBaseUrl();
  const safe = getSafeRedirectPath(next) ?? "/dashboard";
  return `${base}/auth/callback?next=${encodeURIComponent(safe)}`;
}
