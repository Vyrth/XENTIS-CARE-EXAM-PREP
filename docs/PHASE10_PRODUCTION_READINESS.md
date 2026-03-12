# Phase 10: Production Readiness Report

## Overview

Final hardening pass for the admin–learner bridge. Ensures the platform is operational as a two-sided system: admin creates/manages content, learner consumes published content, metrics reflect real activity, and AI supports both sides correctly.

---

## Client Usage Summary

| Client | Use Case | Files |
|--------|----------|-------|
| **createClient** (user-scoped, RLS) | Learner pages, dashboard, content loaders, auth, AI logging | `lib/content/loaders`, `lib/questions/loaders`, `lib/high-yield/loaders`, `lib/dashboard/loaders`, `lib/auth/*`, `api/ai/*`, `api/notebook/*`, `actions/exam` |
| **createServiceClient** (bypasses RLS) | Admin actions, AI factory, batch processing, adaptive engine, Stripe webhook | `lib/admin/*`, `lib/ai/factory/*`, `lib/ai/workers/*`, `actions/content-review`, `actions/questions`, `api/admin/*`, `api/adaptive/*` |

**Verification:** Learner routes use `createClient` (user-safe). Admin and server-only flows use `createServiceClient`. Adaptive session API uses service client but filters by `user_id` for ownership.

---

## Changes Made

### 1. Consolidated LEARNER_VISIBLE_STATUSES

- **adaptive-engine.ts:** Replaced local `const LEARNER_VISIBLE_STATUSES` with import from `@/config/content`.
- **production-planning-loaders.ts:** Replaced hardcoded `["approved", "published"]` with `LEARNER_VISIBLE_STATUSES`.

### 2. Logging Added

| Location | Event | Log |
|----------|-------|-----|
| `content-review.ts` | Status transition failure | `[content-review] status transition failed` |
| `content-review.ts` | Publish success | `[content-review] published` |
| `ai/factory/persistence.ts` | Question persist success | `[ai-factory] question persisted` |
| `ai/factory/persistence.ts` | Question persist failure | `[ai-factory] question persist failed` / `[ai-factory] question insert failed` |
| `api/ai/route.ts` | Jade Tutor request failure | `[jade-tutor] request failed` |
| `lib/content/loaders.ts` | loadStudyGuideById failure | `[content] loadStudyGuideById failed` |
| `lib/content/loaders.ts` | loadVideoById failure | `[content] loadVideoById failed` |

All logs skip when `NODE_ENV === "test"`.

### 3. RLS Compatibility

- Learner loaders use `createClient` (session-based) and respect RLS.
- Content tables (`questions`, `study_guides`, `video_lessons`, `flashcard_decks`, `high_yield_content`) have RLS; learner policies filter by `exam_track_id` and status.
- Admin flows use service role for full access; no learner data exposed.

---

## Readiness Summary

### Working

| Area | Status |
|------|--------|
| Admin content creation | Questions, study guides, videos, flashcards, high-yield via AI factory and manual |
| Review workflow | Draft → editor → SME → legal → QA → approved → published |
| Publish flow | `transitionContentStatus`; revalidates learner pages |
| Learner content loaders | `loadStudyGuides`, `loadVideos`, `loadFlashcardDecks`, `loadQuestionsPage`, etc. use `LEARNER_VISIBLE_STATUSES` |
| Dashboard | Real stats, mastery, recommendations |
| Progress / weak-areas / strength-report | Real activity only |
| Jade Tutor (AI) | Track-scoped, entitlement-checked, rate-limited |
| Adaptive exam | Config from DB; session creation and item selection |
| Pre-practice exam | Template + question pool; 150-question minimum |
| Reset to zero | Phase 8 SQL + API |

### Partially Working

| Area | Notes |
|------|-------|
| AI generation | Depends on `OPENAI_API_KEY`; mock response when unset |
| Stripe billing | Webhook requires `STRIPE_WEBHOOK_SECRET` |
| Analytics materialization | `user_*_mastery` may need background job; dashboard derives from activity when empty |

### Still Blocked (Pre-Deployment)

| Blocker | Mitigation |
|---------|------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin, AI factory, reset, adaptive engine |
| `OPENAI_API_KEY` | Required for Jade Tutor and AI content generation |
| RLS policies | Ensure `exam_tracks`, `systems`, `topics` readable by authenticated users |
| Seed data | `adaptive_exam_configs`, `exam_tracks`, taxonomy must exist |

### Must-Fix Before Deployment

1. **Environment:** Set `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Database:** Run migrations; seed `adaptive_exam_configs` and taxonomy.
3. **Admin bootstrap:** Create admin user via `scripts/bootstrap-admin.ts` or `user_admin_roles`.
4. **Stripe (if billing):** Configure webhook and `STRIPE_WEBHOOK_SECRET`.

---

## Remaining Blockers

None in code. Deployment blockers are configuration and environment.

---

## Changed Files

| File | Change |
|------|--------|
| `src/lib/adaptive/adaptive-engine.ts` | Use `LEARNER_VISIBLE_STATUSES` from config |
| `src/lib/admin/production-planning-loaders.ts` | Use `LEARNER_VISIBLE_STATUSES` from config |
| `src/app/(app)/actions/content-review.ts` | Log status transition failure and publish success |
| `src/lib/ai/factory/persistence.ts` | Log question persist success/failure |
| `src/app/api/ai/route.ts` | Log Jade Tutor request failure |
| `src/lib/content/loaders.ts` | Log loadStudyGuideById and loadVideoById failures |
