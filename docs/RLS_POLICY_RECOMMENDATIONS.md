# RLS Policy Recommendations

This document supplements the existing RLS policies in `supabase/migrations/20250306000014_rls_policies.sql` with recommendations for:

1. **Student-owned data** — Users can only access their own records
2. **Admin-only content management** — Only admins can create/update/delete content
3. **Published content visibility** — Authenticated users see approved content only

---

## 1. Student-Owned Data

**Principle:** `user_id = auth.uid()` for all user-scoped tables.

### Tables (already implemented)

| Table | Policy | Notes |
|-------|--------|-------|
| `profiles` | SELECT, UPDATE own | Users read/update only their profile |
| `user_notes` | ALL own | Full CRUD on own notes |
| `user_highlights` | ALL own | Full CRUD on own highlights |
| `user_exam_tracks` | ALL own | Users manage their track enrollment |
| `exam_sessions` | ALL own | Users manage their exam attempts |
| `exam_session_questions` | ALL via session | Access through parent exam_sessions |
| `user_*_mastery` | ALL own | Topic, subtopic, system, domain, skill mastery |
| `user_question_review_queue` | ALL own | Adaptive review queue |
| `adaptive_*` | ALL own | Recommendation profiles, queues |
| `user_subscriptions` | SELECT own | Users view own subscription; updates via webhook |

### Recommended pattern

```sql
CREATE POLICY "Users manage own <table>"
  ON <table> FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

For tables where the user owns via a parent (e.g., `exam_session_questions`):

```sql
CREATE POLICY "Users manage own session questions"
  ON exam_session_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_questions.exam_session_id
        AND es.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_questions.exam_session_id
        AND es.user_id = auth.uid()
    )
  );
```

---

## 2. Admin-Only Content Management

**Principle:** Only users with a row in `user_admin_roles` can INSERT/UPDATE/DELETE on content tables.

### Helper function (already exists)

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_admin_roles uar
    JOIN profiles p ON p.id = uar.user_id
    WHERE p.id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Content tables to protect

| Table | Admin policy |
|-------|--------------|
| `questions` | INSERT, UPDATE, DELETE: `is_admin()` |
| `question_options` | INSERT, UPDATE, DELETE: `is_admin()` |
| `study_guides` | INSERT, UPDATE, DELETE: `is_admin()` |
| `study_material_sections` | INSERT, UPDATE, DELETE: `is_admin()` |
| `video_lessons` | INSERT, UPDATE, DELETE: `is_admin()` |
| `flashcard_decks` (platform) | INSERT, UPDATE, DELETE: `is_admin()` when `user_id IS NULL` |
| `exam_templates` | INSERT, UPDATE, DELETE: `is_admin()` |
| `system_exams` | INSERT, UPDATE, DELETE: `is_admin()` |
| `media_assets` | INSERT, UPDATE, DELETE: `is_admin()` |
| `content_sources` | INSERT, UPDATE, DELETE: `is_admin()` |

### Recommended migration

```sql
-- Example: questions table
-- Authenticated users can SELECT approved questions (existing policy)
-- Add admin write policy:

CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (is_admin());
```

**Note:** If the current policy allows only SELECT for authenticated users, the above adds write capability for admins. The `TO authenticated` ensures only logged-in users are considered; `is_admin()` further restricts to admins.

---

## 3. Published Content Visibility

**Principle:** Students see only `status = 'approved'` content. Admins see all.

### Current implementation

- `study_guides`: `USING (status = 'approved')`
- `questions`: `USING (status = 'approved')`
- `video_lessons`: `USING (status = 'approved')`

### Recommended: Admin override

Allow admins to see draft/review content for editing:

```sql
-- Replace or add policy for study_guides
DROP POLICY IF EXISTS "Authenticated read approved study_guides" ON study_guides;

CREATE POLICY "Authenticated read study_guides"
  ON study_guides FOR SELECT
  TO authenticated
  USING (status = 'approved' OR is_admin());
```

Apply similar pattern to `questions`, `video_lessons`, and other content tables with a `status` column.

### Content status flow

| Status | Student visibility | Admin visibility |
|--------|-------------------|------------------|
| `draft` | No | Yes |
| `review` | No | Yes |
| `approved` | Yes | Yes |
| `archived` | No | Yes |

---

## 4. Service Role Bypass

**Important:** The Supabase **service role** key bypasses RLS. Use it only for:

- Stripe webhooks (subscription updates)
- Background jobs (analytics, embeddings)
- Server-side admin operations that must run as system

Never expose the service role key to the client. Use `createClient()` with the anon key for browser and standard server requests; use a separate server client with the service role only when necessary.

---

## 5. Summary Checklist

- [x] Student-owned tables: `user_id = auth.uid()` in USING and WITH CHECK
- [x] Content tables: SELECT for authenticated with `status = 'approved'`
- [ ] Admin write policies: Add INSERT/UPDATE/DELETE for content tables with `is_admin()`
- [ ] Admin read override: Allow admins to see draft/review content
- [x] `is_admin()` helper: SECURITY DEFINER, queries `user_admin_roles`
