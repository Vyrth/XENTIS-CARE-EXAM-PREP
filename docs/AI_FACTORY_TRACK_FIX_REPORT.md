# AI Content Factory Track Selection Fix – Implementation Report

## Root Cause

The "Select a track" validation error occurred because **config.trackId sometimes held a slug (rn/fnp/etc) or was empty** while the dropdown displayed the track label. The canonical value must be `exam_tracks.id` (UUID). Causes:

1. **Sync gap**: When `config.trackId` was empty or a slug, the sync effect did not always normalize to UUID before the user clicked Generate.
2. **Preset apply**: Preset handlers could set `trackId` from `applyPresetToConfig` without re-resolving via `resolveSelectedTrack`, risking stale/wrong values.
3. **URL param**: `?trackId=rn` (slug) was resolved in prefill, but any path that bypassed prefill left slug in state.
4. **Validation**: Checked `config.trackId?.trim()` but did not use `resolveConfigTrack` for slug→UUID resolution.

## Canonical Rule

**selectedTrackId = exam_tracks.id (UUID)**. All API payloads must send `examTrackId` / `trackId` as UUID. Labels (RN, FNP, etc.) are display-only.

## Files Changed

### Phase 1 (original)
| File | Change |
|------|--------|
| `src/app/(app)/admin/ai-factory/page.tsx` | Set `initialPrefill` when `trackId` exists |
| `src/components/admin/ai-factory/AIFactoryLayout.tsx` | URL sync; prefill by ID or slug |
| `src/components/admin/ai-factory/BatchJobsTab.tsx` | Auto-set `config.trackId` for track-specific presets |
| `src/lib/ai/factory/resolve-track.ts` | `resolveSelectedTrack()` helper |
| `src/components/admin/ai-factory/TrackGuard.tsx` | Reusable guard |
| `src/components/admin/ai-factory/TrackDebugPanel.tsx` | Dev debug panel |

### Phase 2 (permanent UUID fix)
| File | Change |
|------|--------|
| `src/lib/ai/factory/resolve-track.ts` | Added `isTrackIdUuid()`; canonical UUID rule |
| `src/components/admin/ai-factory/AIFactoryLayout.tsx` | Sync effect: normalize when trackId is non-UUID or stale; preset handler uses `resolveSelectedTrack` for UUID |
| `src/lib/ai/factory/validation.ts` | Validation only checks selectedTrackId via `resolveConfigTrack`; optional `tracks` param |
| `src/components/admin/ai-factory/BatchJobsTab.tsx` | Use `resolveConfigTrack` for trackSlug derivation (no slug in state) |

## Payload Shape

### Before (bug)
```json
{
  "trackId": "rn",
  "trackSlug": "rn"
}
```
or `trackId: ""` when dropdown showed RN.

### After (fixed)
```json
{
  "trackId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "trackSlug": "rn"
}
```
`trackId` is always `exam_tracks.id` (UUID). `trackSlug` is derived for prompts/display.

## Dropdown & Preset Rules

- **Dropdown option values**: `value={t.id}` (UUID). Labels: `{t.name}` (RN, FNP, etc.).
- **Preset clicks**: Set `trackId: resolved.id`, `trackSlug: resolved.slug` via `resolveSelectedTrack`.
- **API requests**: Always send `examTrackId: selectedTrackId` (UUID).
- **Validation**: Only check `selectedTrackId` via `resolveConfigTrack`; if null → "Select a track".

## Flows to Test

1. Open `/admin/ai-factory` → select RN from dropdown → Generate → no "Select a track".
2. Click preset "RN Question Pack" → Generate → no error.
3. Batch tab → select "RN Wave 1" preset → Start → no error.
4. URL `?trackId=rn` → track resolves to UUID; Generate works.
5. URL `?trackId=<uuid>` → track restored; Generate works.
