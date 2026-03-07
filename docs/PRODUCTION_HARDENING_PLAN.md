# Production Hardening Plan

## 1. Error Boundaries

**Goal**: Prevent full-app crashes; show fallback UI and log errors.

**Implementation**:
- Root error boundary: `app/error.tsx` (Next.js convention)
- App shell boundary: `(app)/error.tsx`
- Section boundaries: Wrap exam, AI tutor, admin in `<ErrorBoundary>`

**Files**:
- `src/app/error.tsx` — Root fallback
- `src/app/(app)/error.tsx` — App shell fallback
- `src/components/ui/ErrorBoundary.tsx` — Reusable client boundary

**Behavior**: Log to analytics/error service; show "Something went wrong" + retry.

---

## 2. Loading States

**Goal**: Show skeletons/spinners during data fetches; avoid layout shift.

**Implementation**:
- Route-level: `loading.tsx` in route segments
- Component-level: Suspense + skeleton components
- Button-level: Disabled + spinner on submit

**Locations**:
- `app/(app)/dashboard/loading.tsx`
- `app/(app)/practice/**/loading.tsx`
- `app/(app)/exam/**/loading.tsx`
- `app/(app)/admin/**/loading.tsx`
- AI chat: loading indicator while streaming

---

## 3. Empty States

**Goal**: Clear messaging when no data; CTA to add or explore.

**Implementation**:
- Reusable `<EmptyState>` component
- Per-context: "No questions yet", "No flashcards", "No recommendations"

**Locations**:
- Dashboard (no activity)
- Practice (no systems/questions)
- Flashcards (empty deck)
- Recommendations queue
- Admin review queue

---

## 4. Rate Limiting (AI Endpoints)

**Goal**: Prevent abuse; stay within OpenAI quotas.

**Implementation**:
- In-memory or Redis: requests per user per window (e.g., 20/min free, 100/min paid)
- Middleware or route-level check before `runAIAction`
- Return 429 with `Retry-After` header

**Config**: `RATE_LIMIT_AI_FREE=20`, `RATE_LIMIT_AI_PAID=100`, window 60s

---

## 5. Webhook Retry Handling

**Goal**: Idempotent processing; handle Stripe retries safely.

**Implementation**:
- Verify signature before processing
- Use `stripe_event_id` or `event.id` for idempotency (store processed IDs, skip duplicates)
- Return 200 quickly; process async if needed
- On error: return 500 so Stripe retries (exponential backoff)
- Log failures for manual replay

**Stripe events**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 6. Audit Logs (Admin Actions)

**Goal**: Track who did what, when for compliance and debugging.

**Implementation**:
- Table: `admin_audit_logs` (actor_id, action, entity_type, entity_id, payload, ip, created_at)
- Helper: `logAdminAction(actorId, action, entityType, entityId, payload?)`
- Call from: status transitions, publish, delete, role changes

**Actions**: `content_approve`, `content_reject`, `content_delete`, `user_role_grant`, etc.

---

## 7. Storage Cleanup Strategy

**Goal**: Avoid unbounded growth; comply with retention.

**Implementation**:
- **ai_interaction_logs**: Partition by month; archive/delete after 12 months
- **exam_sessions**: Keep 2 years; anonymize or delete older
- **Supabase Storage**: Lifecycle rules for temp uploads (delete after 7 days)
- **Media assets**: Soft delete; hard delete after 90 days if unused

**Cron**: Supabase Edge Function or external job weekly.

---

## 8. Analytics Instrumentation

**Goal**: Track key events for product and support.

**Implementation**:
- Lib: `lib/analytics.ts` — `track(event, props)` — no-op or send to provider
- Events: `page_view`, `exam_started`, `exam_completed`, `ai_action`, `upgrade_clicked`
- Provider: PostHog, Mixpanel, or Vercel Analytics

---

## 9. Beta Feedback Intake

**Goal**: Capture user feedback during beta.

**Implementation**:
- In-app feedback widget (floating button) → form or modal
- Fields: feedback type (bug/feature/general), message, optional screenshot
- Store in `beta_feedback` table or external tool (Canny, Typeform)
- Link from dashboard and post-exam

---

## 10. Performance Review

- [ ] Lighthouse CI on critical paths (dashboard, exam start)
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Bundle analysis: code-split heavy routes
- [ ] Image optimization: next/image, WebP

---

## 11. Accessibility Review

- [ ] Keyboard navigation (tab order, focus trap in modals)
- [ ] Screen reader: landmarks, labels, live regions
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible

---

## 12. Security Review

- [ ] Auth: session expiry, secure cookies
- [ ] RLS: no data leakage across users
- [ ] API: no IDOR (user can only access own resources)
- [ ] XSS: sanitize user content
- [ ] CSRF: SameSite cookies, validate origin
