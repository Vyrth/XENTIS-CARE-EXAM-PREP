# Autonomous Content Operations Cadence + Source Governance

## Overview

Automated content generation on a controlled schedule using trusted official source frameworks (NCSBN NCLEX, ANCC certification outlines).

## Schedules (Vercel Cron)

| Schedule | Path | Mode | Purpose |
|----------|------|------|---------|
| Every 2h | `/api/cron/autonomous-content?mode=process-shards` | process-shards | Process queued AI batch jobs |
| Daily 02:00 UTC | `/api/cron/autonomous-content?mode=nightly-underfill` | nightly-underfill | Generate content for underfilled topics/systems |
| Sunday 03:00 UTC | `/api/cron/autonomous-content?mode=weekly-rebalance` | weekly-rebalance | Blueprint rebalance campaigns |
| 1st of month 04:00 UTC | `/api/cron/autonomous-content?mode=monthly-low-coverage` | monthly-low-coverage | Regenerate low-coverage areas |

**Auth:** `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret` header

## Source Governance

| Track | Framework | Authority |
|-------|-----------|-----------|
| RN | NCSBN NCLEX-RN Test Plan | ncsbn.org/nclex-rn |
| LVN/LPN | NCSBN NCLEX-PN Test Plan | ncsbn.org/nclex-pn |
| FNP | ANCC FNP Certification Content Outline | nursingworld.org/ancc |
| PMHNP | ANCC PMHNP Content Outline | nursingworld.org/ancc |

- **No generic blogs or random prep sites** as generation authority
- Generated content linked to `content_source_framework` (entity_type, entity_id, source_framework_id)
- `source_framework_config` maps each track to its framework

## Blueprint Coverage Engine

- `computeBlueprintGaps(trackId)` – Compares published content vs `autonomous_settings.blueprint_targets`
- Per-track targets: `minQuestionsPerTopic`, `minQuestionsPerSystem`
- Returns gaps sorted by gap size (largest first)
- `queueNightlyUnderfillCampaign()` – Launches 80 questions per track with underfilled systems/topics
- `queueWeeklyRebalanceCampaign()` – Launches campaign from blueprint gaps (up to 500/track)

## Autonomous Publish Flow

- **Auto-publish:** Above `minQualityScore` (default 75)
- **Review queue:** Between `borderlineThreshold` (65) and `minQualityScore`
- **Reject:** Below `rejectBelow` (40)
- Malformed/unsafe/duplicate items rejected before save (dedupe, schema validation)

## Admin Controls

**Admin → Autonomous Operations** (`/admin/autonomous-operations`)

- **Cadence:** Toggle nightly underfill, weekly rebalance, monthly low-coverage
- **Auto-publish:** Min quality score
- **Source frameworks:** Read-only list (NCSBN/ANCC)
- **Blueprint gaps:** Top 20 underfilled systems/topics

**Settings stored in `autonomous_settings`:**

- `cadence` – processShardsEveryHours, nightlyUnderfillEnabled, weeklyRebalanceEnabled, monthlyLowCoverageEnabled
- `auto_publish` – minQualityScore, borderlineThreshold, rejectBelow
- `source_governance` – requireOfficialFramework, blockGenericSources
- `blueprint_targets` – Per-track minQuestionsPerTopic, minQuestionsPerSystem
- `pre_practice` – regenerateMonthly, minQualityThreshold, minCoverageThreshold

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20250314000001_autonomous_operations_and_source_governance.sql` | source_frameworks, source_framework_config, autonomous_settings, content_source_framework |
| `src/lib/admin/autonomous-operations.ts` | getSettings, computeBlueprintGaps, queueNightlyUnderfillCampaign, queueWeeklyRebalanceCampaign, getSourceFrameworkForTrack |
| `src/app/api/cron/autonomous-content/route.ts` | Cron handler for process-shards, nightly-underfill, weekly-rebalance, monthly-low-coverage |
| `vercel.json` | Added 4 cron entries |
| `src/app/(app)/actions/autonomous-settings.ts` | loadAutonomousSettingsAction, saveAutonomousSettingsAction, loadSourceFrameworksAction, loadBlueprintGapsAction |
| `src/app/(app)/admin/autonomous-operations/page.tsx` | Admin UI |
| `src/app/(app)/admin/autonomous-operations/AutonomousSettingsForm.tsx` | Cadence and threshold form |
| `src/lib/admin/ai-factory-persistence.ts` | Link saved questions to content_source_framework |
| `src/app/(app)/admin/page.tsx` | Autonomous Operations tile |

## Pre-Practice I–V Automation

- Pre-Practice I–V already seeded per track (migration 20250313000002)
- `pre_practice` settings: regenerateMonthly, minQualityThreshold, minCoverageThreshold
- **Not yet implemented:** Cron to regenerate Pre-Practice when thresholds not met (would require exam template/pool regeneration logic)

## Remaining Blockers

1. **Pre-Practice regeneration** – No cron yet to regenerate Pre-Practice I–V when quality/coverage below threshold
2. **Source framework in prompts** – AI prompts could explicitly reference NCSBN/ANCC; currently track behavior hints at it
3. **Block generic sources** – `blockGenericSources` in settings not yet enforced in generation (would need URL/source validation)
4. **Vercel cron query params** – Verify query params in path work; if not, use separate route files per mode
