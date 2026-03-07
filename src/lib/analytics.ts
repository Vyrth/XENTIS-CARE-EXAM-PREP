/**
 * Analytics instrumentation - no-op by default.
 * Configure provider (PostHog, Mixpanel, Vercel Analytics) via env.
 */

export type AnalyticsEvent =
  | "page_view"
  | "exam_started"
  | "exam_completed"
  | "ai_action"
  | "upgrade_clicked"
  | "error_boundary"
  | "error_boundary_app"
  | "error_boundary_section"
  | "feedback_submitted";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // No-op: add your provider here
  // e.g. posthog.capture(event, props);
  // e.g. mixpanel.track(event, props);
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, props);
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  // posthog.identify(userId, traits);
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics] identify", userId, traits);
  }
}
