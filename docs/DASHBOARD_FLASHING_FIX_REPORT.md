# Dashboard Flashing/Freezing Fix – Implementation Report

## Root Cause

The dashboard flashing and freezing was caused by several factors:

1. **Unstable hook dependencies in DashboardReadinessClient**
   - `useRecommendations` received an `inputs` object recreated every render with new `getSystemSlug`, `getDomainSlug`, `getItemTypeSlug` function references
   - This forced `useMemo` to recompute on every render, triggering cascading re-renders in `AdaptiveRecommendationWidget` and children

2. **Theme flash on load**
   - `ThemeProvider` applied the theme class in `useEffect` after first paint
   - Users briefly saw the wrong theme (e.g. light) before the correct theme (e.g. dark) was applied

3. **Redundant navigation after onboarding**
   - `OnboardingForm` called both `router.refresh()` and `window.location.href = "/dashboard"`
   - The full page load already refreshes; the extra `router.refresh()` could cause a brief double navigation

4. **Unstable derived values in HighYieldStudyFeed**
   - `display` (topics.slice) and `guideBySystem` (new Map) were recreated every render
   - Caused unnecessary re-renders of child cards

5. **x-pathname on response instead of request** (Phase 2 fix)
   - Middleware set `x-pathname` on the **response** headers
   - Server components use `headers()` which reads **request** headers
   - Dashboard fallback logic (`pathname === "/dashboard"`) always saw `null`, causing incorrect redirects

6. **Stale profile reads causing redirect ping-pong**
   - Layouts could be statically cached, returning stale profile data
   - App layout: profile says onboarding incomplete → redirect to onboarding
   - Onboarding layout: profile says complete → redirect to dashboard
   - Loop when cache returned inconsistent data

7. **QuestionBrowse filters effect churn**
   - `setFilters` ran on every searchParams change even when values were identical
   - Caused unnecessary re-renders and fetchPage re-runs

## Files Changed

### Phase 1 (original)
| File | Change |
|------|--------|
| `src/components/dashboard/DashboardReadinessClient.tsx` | Stabilized `getSystemSlug`, `getDomainSlug`, `getItemTypeSlug` with `useCallback`; memoized `recommendationInputs`; added dev mount/unmount logging |
| `src/components/high-yield/HighYieldStudyFeed.tsx` | Memoized `display` and `guideBySystem` with `useMemo` |
| `src/app/onboarding/OnboardingForm.tsx` | Removed redundant `router.refresh()` before `window.location.href` |
| `src/app/layout.tsx` | Added blocking theme init script in `<body>` to set theme class before React hydrates |
| `src/lib/debug/dashboard-logger.ts` | **New** – dev-only diagnostics (enable via `localStorage.setItem("DEBUG_DASHBOARD", "1")`) |

### Phase 2 (infinite loop / redirect fixes)
| File | Change |
|------|--------|
| `src/middleware.ts` | Set `x-pathname` on **request** headers (not response) so `headers()` in server components receives it |
| `src/components/dashboard/DashboardReadinessClient.tsx` | Use refs for slug maps so `getSystemSlug`/`getDomainSlug`/`getItemTypeSlug` have stable identity; prevents `useRecommendations` input churn |
| `src/app/(app)/layout.tsx` | Added `dynamic = "force-dynamic"`; dev-only redirect logging |
| `src/app/onboarding/layout.tsx` | Added `dynamic = "force-dynamic"`; dev-only redirect logging |
| `src/app/(app)/dashboard/page.tsx` | Improved redirect debug logging (pathname, profile track) |
| `src/components/questions/QuestionBrowse.tsx` | Only call `setFilters` when derived values actually differ; avoids unnecessary state churn |

## What Caused the Flashing

- **Repeated re-renders**: `useRecommendations` received a new `inputs` object every render because inline functions (`getSystemSlug`, etc.) were recreated each time. That invalidated `useMemo`, recomputed recommendations, and re-rendered `AdaptiveRecommendationWidget` and its children.
- **Theme flash**: Theme was applied in `useEffect` after hydration, so the first paint used the wrong theme.
- **Loading skeleton swap**: If any effect or state update triggered a re-suspend or re-fetch, the loading state could briefly reappear. Stabilizing hooks reduces unnecessary re-renders and avoids that.
- **Redirect loop**: `x-pathname` was never available in server components, so dashboard fallback logic failed. Combined with possible stale profile reads, layouts could ping-pong between onboarding and dashboard.
- **Maximum update depth exceeded**: Unstable callback/object references caused cascading re-renders and effect re-runs.

## How to Reproduce Before/After

**Before:**
1. Log in and go to `/dashboard`
2. Observe repeated flashing or freezing
3. After onboarding, notice a brief double navigation
4. Console: "Maximum update depth exceeded", redirect-boundary loop

**After:**
1. Log in and go to `/dashboard` – page should render smoothly
2. Complete onboarding – single clean redirect to dashboard
3. Theme should match preference from first paint (no flash)
4. No infinite render or redirect loops

## Debug Logging

- **Server (terminal)**: `[app-layout]`, `[onboarding-layout]`, `[dashboard]` redirect logs in development
- **Client**: `localStorage.setItem("DEBUG_DASHBOARD", "1")` for mount/unmount in DashboardReadinessClient

## What Was Not Changed

- No polling, `setInterval`, or `router.refresh()` found on the dashboard
- `loading.tsx` is only shown during the initial load
- `useMastery` and `useReadiness` were left as-is; their inputs are stable from the server
