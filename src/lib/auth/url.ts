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

/** Full callback URL for OAuth / magic link redirect */
export function getAuthCallbackUrl(next = "/dashboard"): string {
  const base = getAuthBaseUrl();
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
