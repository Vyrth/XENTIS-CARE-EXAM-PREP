# Trial Expiration Reminder Emails

## Overview

Users on the 1-month free trial receive an email reminder **7 days before** their trial expires. The reminder is sent **exactly once** per user. Data continuity is emphasized: progress stays on the same profile if they upgrade.

---

## 1. Scheduler / Cron Flow

| Step | Description |
|------|-------------|
| 1 | Vercel Cron runs daily at **14:00 UTC** (`0 14 * * *`) |
| 2 | `POST /api/cron/trial-reminders` with `Authorization: Bearer <CRON_SECRET>` |
| 3 | `processTrialReminders()` queries `user_subscriptions` for `status = 'trialing'` and `current_period_end` in the 7-day window (UTC date) |
| 4 | For each user: claim reminder → send email (see duplicate prevention below) |
| 5 | Returns `{ processed, sent, skipped, errors }` |

**Manual run:** Admin can call the same endpoint with an admin session (no CRON_SECRET).

---

## 2. Email Trigger Logic

- **Condition:** `user_subscriptions.status = 'trialing'` AND `current_period_end` date = today + 7 days (UTC)
- **Recipient:** `profiles.email` (user's real profile email)
- **Skip if:** No email, or reminder already sent (see duplicate prevention)

---

## 3. Duplicate-Send Prevention

1. **`trial_reminder_sent` table** – `UNIQUE(user_id, reminder_type)` where `reminder_type = 'trial_7_days'`
2. **Claim-before-send:** Before sending, `INSERT` into `trial_reminder_sent`. `ON CONFLICT DO NOTHING` is implicit via unique constraint; we use `insert().select("id")` and check if a row was returned.
3. **If insert succeeds** → we "claimed" this reminder; send email.
4. **If insert fails (23505)** → already sent; skip.
5. **Retry-safe:** Cron retries or overlapping runs will not double-send; the first successful insert wins.

---

## 4. Email Content

- **Subject:** "Your free trial ends in 7 days"
- **Body:** Trial end date, data continuity message (progress stays on same profile), upgrade CTA linking to `/pricing`

---

## 5. Files Changed

| File | Purpose |
|------|---------|
| `supabase/migrations/20250312000001_trial_reminder_sent.sql` | `trial_reminder_sent` table |
| `src/lib/email/types.ts` | Email provider types |
| `src/lib/email/resend.ts` | Resend implementation |
| `src/lib/email/console.ts` | Console fallback (dev) |
| `src/lib/email/index.ts` | Provider selection |
| `src/lib/email/trial-reminder.ts` | Template + send |
| `src/lib/billing/trial-reminders.ts` | Job logic |
| `src/app/api/cron/trial-reminders/route.ts` | Cron API |
| `vercel.json` | Cron schedule |
| `.env.local.example` | CRON_SECRET, RESEND_API_KEY, EMAIL_FROM |

---

## 6. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (for cron) | Auth for cron endpoints |
| `RESEND_API_KEY` | Yes (prod) | Resend API key; if missing, emails log to console |
| `EMAIL_FROM` | No | Sender, e.g. `Xentis Care <noreply@yourdomain.com>`; default `onboarding@resend.dev` |

---

## 7. Tables Audited

| Table | Role |
|-------|------|
| `user_subscriptions` | Source: trialing subs with `current_period_end` |
| `profiles` | Email, full_name for personalization |
| `trial_reminder_sent` | Idempotent tracking; prevents duplicate sends |
