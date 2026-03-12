/**
 * Dev-only dashboard diagnostics.
 * Enable via localStorage: localStorage.setItem("DEBUG_DASHBOARD", "1")
 * Disable: localStorage.removeItem("DEBUG_DASHBOARD")
 */

const ENABLED =
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  localStorage.getItem("DEBUG_DASHBOARD") === "1";

export function logDashboardMount(component: string) {
  if (ENABLED) console.log(`[dashboard] mount: ${component}`);
}

export function logDashboardUnmount(component: string) {
  if (ENABLED) console.log(`[dashboard] unmount: ${component}`);
}

export function logDashboardFetch(label: string, start: boolean) {
  if (ENABLED) console.log(`[dashboard] fetch ${start ? "start" : "end"}: ${label}`);
}

export function logDashboardRedirect(reason: string, to: string) {
  if (ENABLED) console.log(`[dashboard] redirect: ${reason} -> ${to}`);
}

export function logDashboardRouter(op: "push" | "replace" | "refresh", path?: string) {
  if (ENABLED) console.log(`[dashboard] router.${op}${path ? ` ${path}` : ""}`);
}
