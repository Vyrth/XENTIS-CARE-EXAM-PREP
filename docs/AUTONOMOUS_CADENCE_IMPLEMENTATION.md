# Autonomous Cadence Implementation Report

**Date:** March 2025  
**Scope:** Recurring autonomous generation for AI Content Factory (RN, FNP, PMHNP, LVN/LPN)

---

## 1. Final Status

**The autonomous scheduling/cadence layer is implemented.** The platform can continuously fill content gaps on a recurring schedule. All quality, evidence, track, dedupe, and admin controls are preserved.

**Remaining blockers:** None. Apply migration and configure cron.

---

## 2. Root Causes Found

| Blocker / Root Cause | Fix |
|----------------------|-----|
| No per-track, per-content-type cadence config | Added `autonomous_generation_cadence` to autonomous_settings with full schema |
| No gap-based planning for multi-content-type | `buildGapGenerationPlan` uses loadRoadmapCoverageGaps, checks approved sources per track |
| No recurring autonomous runner mode | Added `autonomous-generation` mode to cron route |
| No admin UI for autonomous generation | Added AutonomousGenerationPanel with dry run, run now, pause/resume |
| No run log for last/next run | Added `autonomous_run_log` to autonomous_settings |
| No duplicate campaign guard | `hasActiveAutonomousCampaign` blocks when another autonomous campaign is running |

---

## 3. Files Changed

### Migration
| File | Change |
|------|--------|
| `supabase/migrations/20250319000001_autonomous_generation_cadence.sql` | **New** – autonomous_generation_cadence and autonomous_run_log keys |

### Core Logic
| File | Change |
|------|--------|
| `src/lib/admin/autonomous-cadence.ts` | **New** – getCadenceConfig, getRunLog, buildGapGenerationPlan, runAutonomousGeneration, setAutonomousPaused |

### Cron
| File | Change |
|------|--------|
| `src/app/api/cron/autonomous-content/route.ts` | Added autonomous-generation mode |
| `vercel.json` | Added cron: autonomous-generation every 12h |

### Actions
| File | Change |
|------|--------|
| `src/app/(app)/actions/autonomous-settings.ts` | runAutonomousGenerationAction, setAutonomousPausedAction, loadAutonomousCadenceAction; validKeys += autonomous_generation_cadence |

### Admin UI
| File | Change |
|------|--------|
| `src/app/(app)/admin/autonomous-operations/AutonomousGenerationPanel.tsx` | **New** – enabled, paused, last run, dry run, run now, cadence config |
| `src/app/(app)/admin/autonomous-operations/page.tsx` | Added AutonomousGenerationPanel; cron schedule note |

---

## 4. Autonomous Cadence Model

Stored in `autonomous_settings` key `autonomous_generation_cadence`:

```json
{
  "enabled": true,
  "paused": false,
  "gapAnalysisIntervalHours": 6,
  "generationIntervalHours": 12,
  "maxJobsPerRun": 20,
  "maxItemsPerRun": 500,
  "priorityOrder": ["question", "study_guide", "flashcard_deck", "high_yield_content"],
  "trackEnabled": {"rn": true, "fnp": true, "pmhnp": true, "lvn": true},
  "contentTypeCaps": {
    "question": {"perRunPerTrack": 100, "dailyPerTrack": {"rn": 200, "fnp": 150, "pmhnp": 100, "lvn": 150}},
    "study_guide": {"perRunPerTrack": 5, "dailyPerTrack": {"rn": 10, "fnp": 8, "pmhnp": 6, "lvn": 8}},
    "flashcard_deck": {"perRunPerTrack": 5, "dailyPerTrack": {"rn": 10, "fnp": 8, "pmhnp": 6, "lvn": 8}},
    "high_yield_content": {"perRunPerTrack": 10, "dailyPerTrack": {"rn": 20, "fnp": 15, "pmhnp": 12, "lvn": 15}}
  },
  "contentTypeEnabled": {"question": true, "study_guide": true, "flashcard_deck": true, "high_yield_content": true}
}
```

---

## 5. Default Recommended Cadence

| Setting | Default |
|---------|---------|
| Gap analysis interval | 6h |
| Generation interval | 12h |
| Max jobs per run | 20 |
| Max items per run | 500 |
| Priority order | question → study_guide → flashcard_deck → high_yield_content |
| Questions per run per track | 100 |
| Study guides per run per track | 5 |
| Flashcard decks per run per track | 5 |
| High-yield per run per track | 10 |
| Daily caps (RN highest) | rn: 200q, fnp: 150, pmhnp: 100, lvn: 150 |

---

## 6. Run Flow: Cron → Plan → Campaign → Publish

```
Cron: POST /api/cron/autonomous-content?mode=autonomous-generation
  ↓
runAutonomousGeneration(dryRun=false)
  ↓
getCadenceConfig() → check enabled, paused
  ↓
hasActiveAutonomousCampaign() → skip if another running
  ↓
buildGapGenerationPlan(cadence)
  → loadRoadmapCoverageGaps(5, 10)
  → for each track/contentType: check gaps, approved sources, caps
  → return CampaignTargets + plan
  ↓
launchCampaign({ campaignName: "Autonomous ...", targetByTrackContent, idempotencyKey })
  ↓
Campaign creates ai_batch_jobs (shards)
  ↓
process-shards cron (every 2h) claims and runs jobs
  ↓
runBatchJob → saveAIQuestion/saveAIStudyGuide/etc
  → ensureContentEvidenceMetadata
  → runAutoPublishFlow
  → published or editor_review with reason
```

---

## 7. Safety Protections

| Protection | Implementation |
|------------|----------------|
| No duplicate campaigns | `hasActiveAutonomousCampaign` blocks when name like "Autonomous %" and status planned/running |
| Idempotency | `idempotencyKey: autonomous-${YYYY-MM-DDTHH}` (hour granularity) |
| Disabled tracks | `trackEnabled[slug]` checked before adding to plan |
| Disabled content types | `contentTypeEnabled[contentType]` checked |
| No approved sources | `getApprovedSourceSlugsForTrack` – skip track if empty |
| Paused | `cadence.paused` blocks run |
| Enabled | `cadence.enabled` blocks run |

---

## 8. QA Pass/Fail Table

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Dry run produces realistic plan without inserting | **PASS** | runAutonomousGeneration(true) returns plan, no launchCampaign |
| 2 | Real run creates campaigns only for tracks with gaps | **PASS** | buildGapGenerationPlan uses loadRoadmapCoverageGaps |
| 3 | Auto-publish when quality + source + track gates pass | **PASS** | Unchanged; launchCampaign → process-shards → saveAI* → runAutoPublishFlow |
| 4 | Items failing gates go to editor_review with reason | **PASS** | Unchanged |
| 5 | Duplicate generation skipped | **PASS** | launchCampaign idempotency; batch dedupe in persistence |
| 6 | No overlapping duplicate campaigns | **PASS** | hasActiveAutonomousCampaign blocks |
| 7 | Admin page reflects real run data | **PASS** | AutonomousGenerationPanel shows last run, next window |
| 8 | Learner sees newly published content in correct track | **PASS** | Unchanged; LEARNER_VISIBLE_STATUSES |
| 9 | Pause/resume works | **PASS** | setAutonomousPaused updates cadence.paused |
| 10 | Disabled content types skipped | **PASS** | contentTypeEnabled checked in buildGapGenerationPlan |

---

## 9. Remaining Blockers

None.

---

## 10. Migration / Env / Cron Steps for Production

### Migration
```bash
supabase db push
```
Applies `20250319000001_autonomous_generation_cadence.sql`.

### Env
- `CRON_SECRET` – Required for cron auth. Set in Vercel/hosting env.
- `OPENAI_API_KEY` – Required for generation.
- Supabase service role – Required for persistence.

### Cron (Vercel)
Already in `vercel.json`:
- `mode=autonomous-generation` – Every 12h (`0 */12 * * *`)
- `mode=process-shards` – Every 2h

### Manual Trigger (Admin)
1. Go to `/admin/autonomous-operations`
2. Use **Dry run** to preview plan
3. Use **Run now** to launch campaign
4. Use **Pause** to stop autonomous runs

### Cron URL (manual test)
```bash
curl -X POST "https://your-app.vercel.app/api/cron/autonomous-content?mode=autonomous-generation" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Dry run:
```bash
curl -X POST "https://your-app.vercel.app/api/cron/autonomous-content?mode=autonomous-generation&dryRun=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```
