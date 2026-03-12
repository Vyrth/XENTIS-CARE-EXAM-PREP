# Post-Migration Verification & Live-Data Activation

**Date:** March 2025  
**Scope:** Post-Supabase migration verification, seed data, and live-data readiness

---

## 1. Database Tables Confirmed

| Table | Migration | Purpose |
|-------|-----------|---------|
| `exam_tracks` | 02, 19 | Track lookup (LVN, RN, FNP, PMHNP) |
| `admin_roles` | 08, 31, 32 | Admin role definitions |
| `profiles` | 08 | User profiles, primary_exam_track_id |
| `user_exam_tracks` | 08 | User track enrollment |
| `user_admin_roles` | 08 | Admin role assignments |
| `questions` | 04 | Question bank |
| `study_guides` | 06 | Study guides |
| `video_lessons` | 06 | Video lessons |
| `flashcard_decks` | 06, 23 | Flashcard decks |
| `high_yield_content` | 25 | High-yield content |
| `content_review_notes` | 27 | Review workflow notes |
| `content_review_checks` | 27 | Stage approval checks |
| `content_type_review_config` | 27 | Per-type review config |
| `content_source_evidence` | 28 | Legal/source evidence |
| `ai_chunks` | 12 | Jade Tutor retrieval |
| `exam_templates` | 05 | Practice/pre-practice exams |
| `systems`, `domains`, `topics` | 02 | Taxonomy |

---

## 2. Seed Data Status

| Data | Source | Status |
|------|--------|--------|
| **exam_tracks** | Migration 019 | ✅ Always present after migrations |
| **admin_roles (base)** | seed.sql, Migration 032 | ✅ Migration 032 ensures base roles exist when seed.sql not run |
| **admin_roles (reviewers)** | Migration 031 | ✅ sme_reviewer, legal_reviewer, qa_reviewer |
| **question_types** | seed.sql | ⚠️ Requires `seed.sql` or manual run |
| **systems, domains, topics** | seed_extended.sql | ⚠️ Requires seed run |
| **Content (questions, guides, etc.)** | seed_extended, seed_foundational | ⚠️ Requires seed run |

---

## 3. Pages Ready for Live Data

| Page | Data Source | Status |
|------|-------------|--------|
| **Onboarding** | exam_tracks (DB), /api/exam-tracks, /api/onboarding | ✅ DB-backed; fallback to config when empty |
| **Dashboard** | loadDashboardStats, loadMasteryData, loadHighYieldTopics, etc. | ✅ DB-backed |
| **Questions** | loadQuestionCounts, loadSystemsForTrack, loadDomains | ✅ DB-backed |
| **Study guides** | loadStudyGuides | ✅ DB-backed |
| **Videos** | loadVideos | ✅ DB-backed |
| **Flashcards** | loadFlashcardDecks | ✅ DB-backed |
| **High-yield** | loadHighYieldFeed | ✅ DB-backed |
| **AI Tutor (Jade)** | ai_chunks retrieval, falls back to mock when empty | ✅ DB-backed with mock fallback |
| **Pre-practice** | loadPrePracticeTemplate, loadQuestionCounts | ✅ DB-backed |
| **Practice exams** | loadExamTemplates, exam assembly | ✅ DB-backed |
| **Admin (all)** | loadExamTracks, loadAdmin*, etc. | ✅ DB-backed |

---

## 4. Pages Using Config/Mock (Not Blocking)

| Page | Current | Notes |
|------|---------|-------|
| **Study** (`/study`) | EXAM_TRACKS from config | Static list; matches DB. Could load from DB for future flexibility. |
| **Pre-practice** (`/pre-practice/[track]`) | EXAM_TRACKS for 404 check | Validates track param against config. Could validate against DB. |
| **Admin overview** | MOCK_QUESTIONS_ADMIN, MOCK_REVIEW_QUEUE, etc. | Dashboard counts are mock. Replace with loadAdminPublishQueue, loadReviewBacklog. |
| **Admin curriculum** | MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS | Replace with DB loaders. |
| **Admin issue reports** | MOCK_USER_ISSUES | Replace when issue_reports table/API exists. |
| **Admin recommendations** | MOCK_RECOMMENDATIONS | Replace when recommendations API exists. |
| **Admin AI prompts** | MOCK_AI_PROMPTS | Replace when ai_prompts table exists. |
| **Admin mastery rules** | MOCK_MASTERY_RULES | Replace when mastery_rules table exists. |
| **Readiness demo** | MOCK_READINESS_* | Demo page; intentionally uses mock. |

---

## 5. Pages Blocked by Missing Content

| Page | Blocker |
|------|---------|
| **Pre-practice exam** | Requires ≥150 approved questions + pre-practice template per track |
| **System exams** | Requires system exams configured + enough questions |
| **Jade Tutor** | Falls back to mock when ai_chunks empty; no blocker but degraded UX |
| **High-yield feeds** | Empty when no approved high_yield_content |

---

## 6. Seed Fixes Applied

- **Migration 032** (`20250306000032_essential_lookup_seeds.sql`): Seeds base admin_roles (super_admin, content_editor, support, analytics_viewer) with `ON CONFLICT (slug) DO NOTHING`. Ensures admin roles exist even when seed.sql is not run.

---

## 7. Onboarding Flow

- **Server:** Onboarding page loads exam_tracks from Supabase (createClient).
- **Client:** OnboardingForm receives tracks; if empty, fetches /api/exam-tracks (service-role fallback).
- **Fallback:** FALLBACK_TRACKS (config) when both fail; form shows track names. API `resolveExamTrackId` accepts slug and resolves to UUID from DB.
- **Result:** Onboarding works as long as exam_tracks exist (migration 19).

---

## 8. Remaining Recommendations

1. **Run seed scripts** after migrations for full content: `psql -f supabase/seed.sql` (or Supabase dashboard SQL).
2. **Replace admin overview mock data** with live loaders (loadAdminPublishQueue, loadReviewBacklog).
3. **Add question_types seed migration** if question_types should exist without seed.sql.
4. **Study page:** Optionally load tracks from DB for consistency with future track additions.
