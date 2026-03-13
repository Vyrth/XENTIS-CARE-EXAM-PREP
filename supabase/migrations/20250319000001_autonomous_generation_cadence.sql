-- =============================================================================
-- Migration: Autonomous Generation Cadence
-- =============================================================================
-- Adds autonomous_generation_cadence and autonomous_run_log to autonomous_settings.
-- Cadence: per-track, per-content-type caps, priority, enable switches.
-- Run log: last run time, summary, next window, paused state.
-- =============================================================================

-- Cadence config: upsert so we can update schema
INSERT INTO autonomous_settings (key, value_json, description) VALUES
  (
    'autonomous_generation_cadence',
    '{
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
    }'::jsonb,
    'Autonomous generation: per-track caps, per-content-type caps, priority order, enable switches'
  )
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = now();

-- Run log: insert only if missing (preserve existing run history)
INSERT INTO autonomous_settings (key, value_json, description) VALUES
  ('autonomous_run_log', '{"lastRunAt": null, "lastRunSummary": null, "nextRunWindow": null, "lastRunMode": null}'::jsonb, 'Last autonomous run: timestamp, summary, next window, mode (dry-run/real)')
ON CONFLICT (key) DO NOTHING;
