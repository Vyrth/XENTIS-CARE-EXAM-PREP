# Auto-Publish Config – AI Factory Content Types

**Date:** March 2025  
**Status:** Enabled via migration

---

## 1. Current Config Table Values (Before Migration)

| content_type       | enabled | min_quality_score | require_track_assigned | require_no_duplicate | require_answer_rationale_consistent | require_source_mapping |
|--------------------|---------|------------------|------------------------|----------------------|-------------------------------------|------------------------|
| question           | true*   | 75               | true                   | true                 | true                                | true                   |
| study_guide        | false   | 70               | true                   | true                 | true                                | true                   |
| flashcard_deck     | false   | 70               | true                   | true                 | true                                | true                   |
| high_yield_content | false   | 70               | true                   | true                 | true                                | true                   |

\* question enabled by `20250316000001_enable_auto_publish_questions.sql`

**Videos:** No row in `auto_publish_config` → no auto-publish (excluded by design).

---

## 2. Final Config by Content Type (After Migration)

| content_type       | enabled | min_quality_score | require_track_assigned | require_no_duplicate | require_answer_rationale_consistent | require_source_mapping |
|--------------------|---------|------------------|------------------------|----------------------|-------------------------------------|------------------------|
| question           | **true**| 75               | true                   | true                 | true                                | **true**               |
| study_guide        | **true**| 70               | true                   | true                 | true                                | **true**               |
| flashcard_deck     | **true**| 70               | true                   | true                 | true                                | **true**               |
| high_yield_content | **true**| 70               | true                   | true                 | true                                | **true**               |

**Videos:** Still excluded (no row).

---

## 3. Recommended Thresholds

| content_type       | min_quality_score | Rationale |
|--------------------|-------------------|-----------|
| question           | 75                | Higher stakes; rationale, stem, and options must be strong |
| study_guide        | 70                | Sections with content; description and structure matter |
| flashcard_deck     | 70                | Cards with front/back; deck structure and relevance |
| high_yield_content | 70                | Title and explanation; board relevance |

**require_track_assigned:** `true` for all. Content must have `exam_track_id` for learner visibility.

**require_source_mapping:** `true`. All AI-generated and admin-created content now gets `content_evidence_metadata` automatically via `ensureContentEvidenceMetadata`. See `docs/SOURCE_EVIDENCE_METADATA_FLOW.md`.

**require_answer_rationale_consistent:** `true` for questions (single correct answer, rationale consistency). Other types use table defaults.

---

## 4. Files / Migrations Changed

| File | Change |
|------|--------|
| `supabase/migrations/20250317000001_enable_auto_publish_ai_factory.sql` | New migration: enable auto-publish for question, study_guide, flashcard_deck, high_yield_content; set thresholds and `require_source_mapping = false` |
| `docs/AUTO_PUBLISH_CONFIG.md` | This document |

**Supersedes:** `20250316000001_enable_auto_publish_questions.sql` (this migration sets all four types; the older one only enabled questions).

---

## 5. Verification

After running migrations:

```sql
SELECT content_type, enabled, min_quality_score, require_track_assigned, require_source_mapping
FROM auto_publish_config
ORDER BY content_type;
```

Expected: all four AI Factory types with `enabled = true`, `require_track_assigned = true`, `require_source_mapping = true`.
