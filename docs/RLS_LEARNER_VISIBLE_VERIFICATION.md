# RLS Learner-Visible Verification

After applying migration `20250322000001_learner_visible_approved_published_rls.sql`, verify that learner-read policies allow both `approved` and `published` status.

## Inspect policies

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('questions', 'question_options', 'study_guides', 'study_material_sections', 'video_lessons')
  AND cmd = 'SELECT'
  AND policyname ILIKE '%learner%'
ORDER BY tablename, policyname;
```

Expected policy names:

- `questions`: `Authenticated read learner-visible questions`
- `question_options`: `Authenticated read learner-visible question_options`
- `study_guides`: `Authenticated read learner-visible study_guides`
- `study_material_sections`: `Authenticated read learner-visible study_material_sections`
- `video_lessons`: `Authenticated read learner-visible video_lessons`

## Check qual (USING clause)

Each policy's `qual` should reference `status::text IN ('approved', 'published')` (or an equivalent EXISTS subquery for child tables).

## Quick test

As an authenticated learner, call `/api/questions/browse?page=1`. It should return published FNP questions when the user's primary track is FNP.
