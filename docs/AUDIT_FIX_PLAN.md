# XENTIS-CARE-EXAM-PREP: Full App Audit & Fix Plan

**Goal:** Make learner app and admin panel fully functional, fully DB-backed, zero-mock, and internally consistent.

**Audit Date:** March 2025

---

## 1. Critical Blockers

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 1 | **Broken Study Plan links** | `study-plan/page.tsx` L84 | Links to `/study-guides/${sys.slug}` but study guides use UUID. `sys.slug` (e.g. "cardiovascular") is not a valid guide ID → 404 / "Study guide not found." |
| 2 | **Admin Analytics fake metrics** | `admin/analytics/page.tsx` L5–16 | Hardcoded "1,234", "12,456", "3,890", "24 min", system usage percentages. Presents fake data as real. |
| 3 | **Billing fake payment/history** | `billing/page.tsx` L89–117 | When paid: shows hardcoded "•••• 4242", "Expires 12/26", fake billing history ($29 Mar/Feb 2025). No Stripe API integration. |
| 4 | **AI Tutor mock when no API key** | `lib/ai/orchestrator.ts` L24–28 | Returns mock message instead of clear error state when `OPENAI_API_KEY` unset. |
| 5 | **requirePrimaryTrack fallback** | `lib/auth/track.ts` L112 | Returns `{ trackId: "", trackSlug: "rn" }` when no track — can leak RN content to users without track. |

---

## 2. Data Integrity Issues

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 1 | **Dashboard readiness defaults** | `lib/dashboard/loaders.ts` L229–241 | `deriveReadinessFromMastery()` uses hardcoded 70/65/80 when mastery is empty. Inflates readiness for new users. |
| 2 | **Study plan weekly metric** | `study-plan/page.tsx` L27 | "This week" shows only `studyMinutesToday` — not actual weekly total. Misleading. |
| 3 | **Notebook save fallback** | `hooks/useNotebook.ts` L57–59 | On save failure, adds note with `fallbackId: n-${Date.now()}` to local state only. Creates orphaned local-only notes. |
| 4 | **Admin recommendations no DB** | `admin/recommendations/page.tsx` | No queries to `adaptive_recommendation_profiles`, `recommended_content_queue`, `user_remediation_plans`. Static placeholder. |
| 5 | **Admin issue-reports no table** | `admin/issue-reports/page.tsx` | References `user_issue_reports` table which does not exist in migrations. Stub page. |
| 6 | **Admin mastery-rules empty fallback** | `admin/mastery-rules/page.tsx` | When `!isSupabaseServiceRoleConfigured()`, returns `[]`. Bypasses DB when misconfigured. |

---

## 3. UI/UX Issues

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 1 | **Video player placeholder** | `videos/[videoId]/VideoLessonClient.tsx` L125–130 | When `videoUrl` does not start with `http`, shows "Video player placeholder" instead of player or clear error. |
| 2 | **Study plan "coming soon"** | `study-plan/page.tsx` L65 | "Weekly activity tracking coming soon. Today: X min studied." — incomplete UX. |
| 3 | **Adaptive exam hardcoded config** | `adaptive-exam/page.tsx` L54–56 | `minQuestions: 75`, `maxQuestions: 150`, etc. when DB values null. Should come from config table or shared constant. |
| 4 | **Admin system-bundles Edit stub** | `admin/system-bundles/page.tsx` L48–53 | Edit button has no href/action. |
| 5 | **Admin ai-prompts non-persistent** | `admin/ai-prompts/page.tsx` L35–37 | Checkbox `defaultChecked` — toggling does not persist to DB. "Edit" and "Configure eligibility rules" non-functional. |
| 6 | **Admin analytics View report stub** | `admin/analytics/page.tsx` L61 | "View detailed report" button does nothing. |

---

## 4. Mock / Fallback Leftovers

| # | Source | Usage | Action |
|---|--------|-------|--------|
| 1 | `data/mock/readiness.ts` | `readiness-demo/page.tsx` only | Demo route — acceptable. Keep or remove demo. |
| 2 | `data/mock/high-yield.ts` | `loadHighYieldTopics` called with `telemetry: []`, `studentSignal: []` | Loader may reference; verify no mock data flows to learner. |
| 3 | `data/mock/performance.ts` | `readiness-demo` only | Demo only. |
| 4 | `data/mock/systems.ts`, `flashcards.ts`, `study-guides.ts`, `videos.ts` | Not used by learner routes | Dead code or test-only. Consolidate types to `src/types/`. |
| 5 | `lib/ai/retrieval/README.md` L66, 82 | Docs say "falls back to mock" | Code returns `[]` — README outdated. Update. |
| 6 | `lib/high-yield/loaders.ts` L22, 82, 139 | Comments mention "fall back to mock" | Implementation returns `[]`. Update comments. |
| 7 | `lib/ai/orchestrator.ts` L26 | Mock response when no API key | Replace with clear error UI. |
| 8 | **TrackSlug / Note / Question types** | `data/mock/types.ts` | Used across app for types only. Move to `src/types/` to avoid mock connotation. |

---

## 5. Broken Route Flows

| Route | Issue |
|-------|-------|
| `/study-plan` | "By System" tiles link to `/study-guides/${sys.slug}` — invalid. Should link to `/study-guides?systemSlug=X` or `/questions/system/X` or system hub page. |
| `/study-guides/cardiovascular` | 404 / "Study guide not found" when slug used as guideId (UUID expected). |
| `/admin/recommendations` | No data; static placeholder. |
| `/admin/issue-reports` | No `user_issue_reports` table; stub. |
| `/admin/analytics` | Fake metrics; no real data. |

---

## 6. Broken AI Flows

| # | Issue | Location |
|---|-------|----------|
| 1 | Mock response when no API key | `lib/ai/orchestrator.ts` |
| 2 | RAG retrieval README outdated | `lib/ai/retrieval/README.md` — says mock fallback; code returns `[]`. |
| 3 | Jade Tutor output contract | Content factory uses structured parsing; verify all modes have strict validation. |

---

## 7. Cross-Cutting Summary

| Area | Status | Notes |
|------|--------|-------|
| **App shell / sidebar** | OK | Admin link only when `isAdmin`. PRIMARY_NAV, ADMIN_NAV from config. |
| **Auth / route guards** | OK | Layout requires auth, onboarding, track. Admin routes use `requireAdmin`. |
| **Track resolution** | Issue | `requirePrimaryTrack` returns `{ trackId: "", trackSlug: "rn" }` when no track — risky fallback. |
| **Study plan persistence** | Partial | `user_streaks` exists; weekly aggregation not implemented. `studyMinutesToday` from DB or derived. |
| **Learner metrics** | Partial | Dashboard readiness uses hardcoded defaults when mastery empty. |
| **Jade Tutor** | Partial | Mock when no API key. Content factory otherwise DB-backed. |
| **DB loader fallbacks** | Mixed | Most return `[]` when empty. Some use hardcoded defaults (readiness). |
| **Generated content pipeline** | OK | Learner views filter `status = 'approved'` or `['approved','published']`. Draft content does not appear. |
| **API routes** | OK | Use createClient for user-scoped, createServiceClient for admin/background. |
| **RLS** | OK | Policies exist; createClient respects RLS. |

---

## 8. Implementation Order (Highest → Lowest Risk)

### Phase 1: Critical Blockers (Do First)

1. **Fix Study Plan links**  
   Change `/study-guides/${sys.slug}` to `/questions/system/${sys.slug}` or add `/study-guides?systemSlug=${sys.slug}` and support filter on study-guides page.

2. **Replace Admin Analytics fake metrics**  
   Add loaders for real metrics (e.g. `user_question_attempts`, `exam_sessions`, `user_streaks`). Wire to DB.

3. **Billing: Stripe integration**  
   Fetch payment method and billing history from Stripe API when user has subscription. Remove hardcoded values.

4. **AI Tutor: Clear error when no API key**  
   Return structured error; show "Configure OPENAI_API_KEY" message in UI instead of mock response.

5. **requirePrimaryTrack**  
   Do not return `trackSlug: "rn"` when track is null. Return null or redirect to onboarding.

### Phase 2: Data Integrity

6. **Dashboard readiness defaults**  
   When mastery empty, show 0 or "Not enough data" instead of 70/65/80.

7. **Study plan weekly metric**  
   Aggregate `user_streaks` by week or derive from `exam_sessions` + `user_question_attempts` for last 7 days.

8. **Notebook save failure**  
   On save failure: show error, do not add to local state. Retry or allow manual retry.

9. **Admin recommendations**  
   Add loaders for `adaptive_recommendation_profiles`, `recommended_content_queue`, `user_remediation_plans`. Build real UI or explicit "Coming soon" with DB check.

10. **Admin issue-reports**  
    Add `user_issue_reports` migration if needed, or create migration + loader. Wire page to DB.

11. **Admin mastery-rules**  
    When service role not configured, show clear error instead of empty list.

### Phase 3: UI/UX & Stubs

12. **Video player**  
    Support non-URL `videoUrl` (e.g. Vimeo/Youtube IDs) or show clear "Unsupported format" message.

13. **Study plan "coming soon"**  
    Implement weekly tracking or replace with accurate "Today only" messaging.

14. **Adaptive exam config**  
    Load defaults from `adaptive_exam_configs` or shared config module.

15. **Admin system-bundles Edit**  
    Add edit route/action or remove button.

16. **Admin ai-prompts**  
    Persist `enabled` toggle; implement Edit and Configure eligibility rules or remove.

17. **Admin analytics "View report"**  
    Implement or remove.

### Phase 4: Cleanup

18. **Move types from data/mock**  
    `TrackSlug`, `Note`, `Question`, etc. → `src/types/`. Update imports.

19. **Remove or isolate mock data**  
    Keep `readiness-demo` if desired; remove unused MOCK_* from learner/admin paths.

20. **Update README/comments**  
    `lib/ai/retrieval/README.md`, `lib/high-yield/loaders.ts` — remove "mock fallback" references.

---

## 9. Route Coverage Checklist

### Learner Routes

| Route | DB-Backed | Mock/Fake | Notes |
|-------|-----------|-----------|-------|
| /dashboard | Yes | Readiness defaults | Fix Phase 2 |
| /study-plan | Yes | Weekly = today only | Fix Phase 2–3 |
| /questions | Yes | No | OK |
| /topics | Yes | No | OK |
| /pre-practice | Yes | No | OK |
| /adaptive-exam | Yes | Config defaults | Fix Phase 3 |
| /practice | Yes | No | OK |
| /flashcards | Yes | No | OK |
| /videos | Yes | Player placeholder | Fix Phase 3 |
| /study-guides | Yes | No | OK |
| /notebook | Yes | Save fallback | Fix Phase 2 |
| /ai-tutor | Yes | Mock when no key | Fix Phase 1 |
| /high-yield | Yes | No | OK |
| /progress | Yes | No | OK |
| /weak-areas | Yes | No | OK |
| /strength-report | Yes | No | OK |
| /confidence-calibration | Yes | No | OK |
| /billing | Partial | Fake payment/history | Fix Phase 1 |
| /profile | Yes | No | OK |

### Admin Routes

| Route | DB-Backed | Mock/Fake | Notes |
|-------|-----------|-----------|-------|
| /admin | Yes | No | OK |
| /admin/curriculum | Yes | No | OK |
| /admin/system-bundles | Yes | Edit stub | Fix Phase 3 |
| /admin/questions | Yes | No | OK |
| /admin/study-guides | Yes | No | OK |
| /admin/flashcards | Yes | No | OK |
| /admin/videos | Yes | No | OK |
| /admin/review-queue | Yes | Invalid lane → [] | Intentional |
| /admin/publish-queue | Yes | No | OK |
| /admin/ai-prompts | Yes | Non-persistent UI | Fix Phase 3 |
| /admin/mastery-rules | Yes | Empty when no service | Fix Phase 2 |
| /admin/recommendations | No | Static | Fix Phase 2 |
| /admin/issue-reports | No | No table | Fix Phase 2 |
| /admin/high-yield | Yes | No | OK |
| /admin/exams | Yes | No | OK |
| /admin/batch-planner | Yes | No | OK |
| /admin/content-inventory | Yes | No | OK |
| /admin/ai-factory | Yes | No | OK |
| /admin/launch-readiness | Yes | No | OK |
| /admin/blueprint-coverage | Yes | No | OK |
| /admin/analytics | No | Fake metrics | Fix Phase 1 |

---

## 10. Files to Modify (by Phase)

### Phase 1
- `src/app/(app)/study-plan/page.tsx`
- `src/app/(app)/admin/analytics/page.tsx`
- `src/app/(app)/billing/page.tsx`
- `src/lib/ai/orchestrator.ts`
- `src/lib/auth/track.ts`
- New: `src/lib/admin/analytics-loaders.ts`

### Phase 2
- `src/lib/dashboard/loaders.ts`
- `src/hooks/useNotebook.ts`
- `src/app/(app)/admin/recommendations/page.tsx`
- `src/app/(app)/admin/issue-reports/page.tsx`
- `src/app/(app)/admin/mastery-rules/page.tsx`
- New migration: `user_issue_reports` (if needed)

### Phase 3
- `src/app/(app)/videos/[videoId]/VideoLessonClient.tsx`
- `src/app/(app)/adaptive-exam/page.tsx`
- `src/app/(app)/admin/system-bundles/page.tsx`
- `src/app/(app)/admin/ai-prompts/page.tsx`

### Phase 4
- `src/data/mock/types.ts` → `src/types/` (or consolidate)
- `src/lib/ai/retrieval/README.md`
- `src/lib/high-yield/loaders.ts` (comments)
