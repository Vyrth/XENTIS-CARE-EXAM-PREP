# Phase 6: Mock/Demo Removal Summary

## Removed Runtime Mock Sources

| Source | Location | Action |
|--------|----------|--------|
| **Readiness Demo Page** | `src/app/(app)/readiness-demo/page.tsx` | Replaced with redirect to `/dashboard`. Previously used MOCK_READINESS_INPUTS, MOCK_RAW_*_PERFORMANCE, MOCK_DAILY_PERFORMANCE, MOCK_SYSTEM_PROGRESS, MOCK_CONTENT_ITEMS, MOCK_QUESTION_CANDIDATES, MOCK_CONFIDENCE_DATA, MOCK_SYSTEMS, MOCK_DOMAINS from `@/data/mock/*`. |
| **AI Retrieval mock fallback** | `src/lib/ai/retrieval/` | README updated. Code already returned `[]` when no chunks (no mock fallback in runtime). |

## Preserved (Not Removed)

- **Seed SQL** – All seed migrations and SQL fixtures remain for database setup.
- **Test fixtures** – `data/mock/*` files remain for isolated tests and type definitions.
- **Type imports** – `TrackSlug`, `Question`, `AdaptiveRecommendation`, etc. from `@/data/mock/types` are type-only; no runtime mock data.
- **data/mock/** – Mock data files (admin, questions, readiness, etc.) are kept for tests and development; they are not imported by any runtime app/admin route after this phase.

## New Additions

- **TruthfulEmptyState** – `src/components/ui/TruthfulEmptyState.tsx`
  - `TruthfulEmptyState` – Generic empty state (no mock values)
  - `NoContentEmptyState` – Preset for "no content yet"
  - `NoActivityEmptyState` – Preset for "no activity / zero metrics"

## Final Runtime Behavior

- **Dashboard** – Uses `loadDashboardStats`, `loadReadinessScore`, `loadMasteryData`, etc. All DB-backed. Zero-state when no data.
- **Questions** – Uses `/api/questions/ids` (DB). Returns `[]` when empty.
- **AI Retrieval** – Uses `ai_chunks` table. Returns empty when no matches; no mock fallback.
- **High-yield, Study guides, Flashcards, Videos** – All use DB loaders. Empty when no content.
- **Readiness** – Computed from mastery/activity or `user_readiness_snapshots`. No mock inputs.
