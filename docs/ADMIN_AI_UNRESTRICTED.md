# Admin AI Generation — Unrestricted Access

## Summary

All admin-side AI generation limits, caps, throttles, and plan restrictions have been removed. Admins have unrestricted access to AI generation in the admin portal.

---

## 1. Root Causes

| Restriction | Location | Purpose (removed) |
|-------------|----------|-------------------|
| Admin rate limit 60/min | `admin-ai-guard.ts` | Throttled admin AI actions per minute |
| Batch count cap 50 | `factory/validation.ts` | Rejected batchCount > 50 |
| Batch count UI max 50 | `GenerationConfigPanel.tsx` | Input capped at 50 |
| Worker targetCount cap 50 | `question-worker`, `flashcard-worker`, `high-yield-worker` | Capped generated items per run |

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/auth/admin-ai-guard.ts` | Removed rate limit; guard now only enforces admin auth |
| `src/lib/ai/factory/validation.ts` | Removed batchCount > 50 validation |
| `src/components/admin/ai-factory/GenerationConfigPanel.tsx` | max 50 → 9999; onChange clamp 50 → 9999 |
| `src/lib/ai/workers/question-worker.ts` | Removed targetCount cap of 50 |
| `src/lib/ai/workers/flashcard-worker.ts` | Removed targetCount cap of 50 |
| `src/lib/ai/workers/high-yield-worker.ts` | Removed targetCount cap of 50 |

---

## 3. Limits Removed

| Limit | Before | After |
|-------|--------|-------|
| Admin AI rate limit | 60 requests/min per admin | None |
| Batch count (validation) | max 50 | No cap (min 1) |
| Batch count (UI) | max 50 | max 9999 |
| Question worker targetCount | max 50 | No cap |
| Flashcard worker targetCount | max 50 | No cap |
| High-yield worker targetCount | max 50 | No cap |

---

## 4. Admin-Only Access Still Enforced

| Mechanism | How |
|-----------|-----|
| **withAdminAIGuard()** | All admin AI server actions call this; returns 401 if not signed in, 403 if not admin |
| **isAdmin(userId)** | Checks `user_admin_roles` table; only users with admin role pass |
| **Admin layout** | `/admin/*` layout verifies `isAdmin` before rendering |
| **API routes** | Admin AI routes (`/api/admin/ai-factory/*`, `process-batch-queue`, etc.) require `isAdmin` or `CRON_SECRET` |

Non-admin users cannot access admin generation; they are blocked at auth.

---

## 5. Preserved (Not Admin-Specific)

| Item | Scope | Status |
|------|-------|--------|
| Learner entitlement checks | `/api/ai`, `/api/questions/ids`, etc. | Unchanged — free/paid limits still apply to learners |
| process-batch-queue rateLimitMs | 800ms between API calls | Kept — infrastructure throttling to protect OpenAI |
| Circuit breaker | rate-control.ts | Kept — protects against provider 429s |
| flashcardSetSchema max(50) | Per AI response format | Kept — schema for single response, not admin cap |

---

## 6. No Visible Quota/Limit Messaging in Admin

- No "upgrade required" in admin flows
- No "rate limit exceeded" from admin guard (removed)
- No "Batch count cannot exceed 50" (removed)
- Batch count input allows 1–9999
