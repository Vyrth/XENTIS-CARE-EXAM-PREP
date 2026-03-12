# Autonomous AI Content Factory + Pre-Practice Series

## Root Causes Found

1. **Single Pre-Practice exam** – Platform had one `pre_practice` slug; no I–V series.
2. **No auto-publish** – AI content saved as draft/editor_review only; no quality gate or auto-publish rules.
3. **No quality metadata** – No `quality_score`, `auto_publish_eligible`, or `validation_status` on content.
4. **Question selection** – Pre-practice used full track pool; no difficulty-based assembly from rules.
5. **No pre_practice_series model** – No tables for series/versions or exam mapping.

## Files Changed

### Schema / Migrations

- `supabase/migrations/20250313000001_pre_practice_series_and_auto_publish.sql` – New tables and columns
- `supabase/migrations/20250313000002_pre_practice_series_seed.sql` – Seed Pre-Practice I–V per track

### Loaders & API

- `src/lib/exam/loaders.ts` – `loadPrePracticeVersions`, `loadPrePracticeVersionByKey`
- `src/lib/questions/loaders.ts` – `loadQuestionIdsForPrePracticeVersion` (assembly rules + difficulty)
- `src/app/api/questions/ids/route.ts` – Support `pre_practice_i` … `pre_practice_v` modes
- `src/lib/exam/question-bank.ts` – Pre-practice mode handling for limits

### Actions & Admin

- `src/lib/admin/auto-publish.ts` – Quality gate, eligibility, `tryAutoPublish`, `upsertContentQualityMetadata`
- `src/app/(app)/actions/exam.ts` – Session type and template lookup for pre_practice_* modes

### UI

- `src/app/(app)/pre-practice/[track]/page.tsx` – Pre-Practice I–V lobby with version cards
- `src/app/(app)/exam/[examId]/page.tsx` – Pass-through for pre_practice_i … pre_practice_v modes
- `src/types/exam.ts` – `ExamMode` extended with pre_practice_i … pre_practice_v

## Schema Additions

| Table | Purpose |
|-------|---------|
| `pre_practice_series` | One per track; groups versions I–V |
| `pre_practice_versions` | I–V with `version_key`, `difficulty_profile`, `assembly_rules` |
| `content_quality_metadata` | `quality_score`, `auto_publish_eligible`, `validation_status` |
| `auto_publish_config` | Per content type: enabled, min_quality_score, requirements |
| `publish_audit` | Audit trail for publish actions (incl. auto-publish) |
| `exam_templates.pre_practice_version_id` | Optional link to pre_practice_versions |

## Campaign Flow Verified

- **Launch campaign** – `launch-campaign/route.ts` → `campaign-orchestrator` → shards → `process-shard` → batch engine → persistence
- **Dedupe** – `content_dedupe_registry` used before save; duplicates skipped
- **Auto-publish** – `tryAutoPublish` checks `content_quality_metadata` and `auto_publish_config`; calls `transitionContentStatus` when eligible

## Pre-Practice I–V Flow Verified

1. **Seed** – Migration seeds `pre_practice_series` and `pre_practice_versions` for RN, FNP, PMHNP, LVN.
2. **Lobby** – `loadPrePracticeVersions` loads I–V; learner sees cards with descriptions.
3. **Start exam** – Link to `/exam/pre_practice_i-{track}-{seed}` (or ii, iii, iv, v).
4. **Question IDs** – API `mode=pre_practice_i` → `loadQuestionIdsForPrePracticeVersion` → `queryPoolByFilters` with `byDifficulty` tiers.
5. **Fallback** – If filtered pool &lt; 50 questions, falls back to full track pool.

## Admin Controls

- **AI Factory** – Launch by track/content type/count; monitor campaigns/shards/jobs (existing).
- **Auto-publish** – `auto_publish_config` table; all content types disabled by default.
- **Pre-Practice** – Series/versions seeded by migration; no extra admin action required for basic use.

## Remaining Blockers Before Large-Scale Autonomous Publishing

1. **Quality scoring** – AI factory does not yet write `content_quality_metadata`. Add scoring (e.g. schema validation, answer/rationale consistency) and `upsertContentQualityMetadata` after save.
2. **Auto-publish integration** – Call `tryAutoPublish` after AI factory save when `auto_publish_config.enabled` for that content type.
3. **Publish gate** – `checkPublishGate` and `checkSourceEvidenceGate` still apply; auto-publish must satisfy those or they must be relaxed for AI content.
4. **Pre-practice exam templates** – Optional: create `exam_templates` with slugs `pre_practice_i` … `pre_practice_v` and link to `pre_practice_versions` for analytics.
5. **Weakness analysis** – Pre-Practice I completion should feed weak areas; verify `submitExamAndScore` and weak-area pipeline use session results.
6. **question_adaptive_profiles** – Difficulty-based assembly requires `question_adaptive_profiles`; ensure questions have `difficulty_tier` populated.
