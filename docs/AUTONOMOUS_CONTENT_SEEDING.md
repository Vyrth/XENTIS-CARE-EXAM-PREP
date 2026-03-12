# Autonomous Content Seeding System

## Overview

Uses the AI Factory pipeline to automatically generate large volumes of learner-ready content for all tracks (RN, FNP, PMHNP, LVN/LPN).

## Campaign Targets

| Track | Questions | Study Guides | Flashcards | High-Yield |
|-------|-----------|--------------|------------|------------|
| RN | 2500 | 200 | 100 | 100 |
| FNP | 1500 | 150 | 75 | 75 |
| PMHNP | 1000 | 100 | 50 | 50 |
| LVN/LPN | 800 | 80 | 40 | 40 |

**Total: 5,800 questions + guides, flashcards, high-yield**

## Pipeline Flow

1. **Launch** – Admin clicks "Launch Seeding" in AI Factory → `launchSeedingCampaignAction` → `launchCampaign` with `SEEDING_CAMPAIGN_TARGETS`
2. **Shards** – `generateCampaignShards` creates track/system/topic shards with blueprint prioritization
3. **Jobs** – Shards inserted into `ai_batch_jobs`; cron or manual `process-shard` claims and runs
4. **Generation** – `runBatchJob` → `generateContent` → AI API
5. **Persistence** – `saveAIQuestion` / `saveAIQuestionsBulk` → dedupe → insert
6. **Quality** – `computeQuestionQualityScore` → `upsertContentQualityMetadata`
7. **Auto-publish** – If `auto_publish_config.question.enabled` and eligible → `tryAutoPublish`

## Generated Item Requirements

- `exam_track_id` – Track-scoped
- `system_id` – From shard
- `topic_id` – From shard
- `difficulty` – 1–5 from distribution
- `rationale` – Required for auto-publish (min 50 chars)
- Correct answer – Exactly one option `is_correct: true`
- `stem_normalized_hash` – For dedupe

## After Save

1. **Schema validation** – `validateQuestionPayload` before insert
2. **Dedupe** – `content_dedupe_registry` + `stem_normalized_hash` + near-duplicate check
3. **Quality score** – `computeQuestionQualityScore` (board relevance, rationale length, correct count)
4. **content_quality_metadata** – `quality_score`, `auto_publish_eligible`, `validation_status`, `validation_errors`

## Auto-Publish Rules

Auto-publish only when:

- Schema valid
- No duplicate
- Rationale present (≥50 chars)
- Exactly one correct answer
- Quality score ≥ 70 (configurable via `auto_publish_config.min_quality_score`)
- `auto_publish_config.question.enabled = true`
- Track assigned

Otherwise content stays in `draft` or `editor_review` → review queue.

## Pre-Practice Series I–V

Each track has 5 exams (75–100 questions each):

| Version | Profile | Difficulty Tiers |
|---------|---------|------------------|
| I | Hard diagnostic | 4, 5 |
| II | Easier reinforcement | 1, 2 |
| III | Moderate mixed | 2, 3, 4 |
| IV | Extremely hard | 4, 5 (heavy 5) |
| V | Final readiness | 3, 4, 5 |

- `totalCount: 85` in `assembly_rules`
- Blueprint coverage via `queryPoolByFilters` with `byDifficulty`
- Track-scoped

## Admin Controls

- **Launch Seeding** – AI Factory → Campaign Dashboard → "Launch Seeding (RN 2500, FNP 1500, PMHNP 1000, LVN 800)"
- **Monitor** – Select campaign → view generated/saved/failed counts, by track/content type
- **Retry** – Retry failed shards, retry single job
- **Pause/Resume** – Pause campaign; no new claims
- **Auto-publish** – `auto_publish_config` table; enable per content type

## Files Changed

| File | Change |
|------|--------|
| `src/lib/ai/campaign-orchestrator.ts` | `SEEDING_CAMPAIGN_TARGETS` |
| `src/app/(app)/actions/ai-campaign.ts` | `launchSeedingCampaignAction` |
| `src/components/admin/ai-factory/CampaignDashboardTab.tsx` | Launch Seeding button |
| `src/lib/ai/content-quality-scoring.ts` | `computeQuestionQualityScore` |
| `src/lib/admin/ai-factory-persistence.ts` | Quality + auto-publish after `saveAIQuestion` |
| `src/lib/ai/factory/bulk-persistence.ts` | `applyQualityAndAutoPublish` after bulk insert |
| `supabase/migrations/20250313000002_pre_practice_series_seed.sql` | `totalCount: 85` |
| `supabase/migrations/20250313000003_pre_practice_75_100_questions.sql` | Update existing versions |
| `src/lib/questions/loaders.ts` | `effectiveLimit` from `assembly_rules.totalCount` |

## Remaining Blockers

1. **Publish gate** – `checkPublishGate` requires editor/SME/legal/QA stages. AI content may need workflow config to allow auto-publish or a bypass for quality-passed content.
2. **Source evidence** – `checkSourceEvidenceGate` may block publish; ensure AI content has required metadata.
3. **question_adaptive_profiles** – Pre-Practice difficulty assembly requires `question_adaptive_profiles.difficulty_tier`; ensure questions are profiled.
4. **Enable auto-publish** – Set `auto_publish_config.question.enabled = true` when ready for autonomous publishing.
