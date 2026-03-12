# Phase 2D — Safe Dead-Code and Mock Cleanup

## Summary

Removed 12 mock data files and 1 dead retrieval module that had no runtime or test imports. Retained `data/mock/types.ts` (type-only; used across app). No learner or admin routes import from removed files.

---

## Removed Files

| File | Reason |
|------|--------|
| `src/data/mock/admin.ts` | No runtime/test imports. MOCK_* constants unused. |
| `src/data/mock/questions.ts` | No runtime/test imports. |
| `src/data/mock/readiness.ts` | No runtime/test imports. Readiness demo redirects to dashboard. |
| `src/data/mock/performance.ts` | No runtime/test imports. |
| `src/data/mock/notes.ts` | No runtime/test imports. |
| `src/data/mock/recommendations.ts` | No runtime/test imports. |
| `src/data/mock/study-guides.ts` | No runtime/test imports. |
| `src/data/mock/flashcards.ts` | No runtime/test imports. |
| `src/data/mock/videos.ts` | No runtime/test imports. |
| `src/data/mock/systems.ts` | No runtime/test imports. |
| `src/data/mock/high-yield.ts` | No runtime/test imports. loadHighYieldTopics uses DB + empty telemetry/studentSignal. |
| `src/data/mock/lab-refs.ts` | No runtime/test imports. Lab API uses lab_reference_sets/values. |
| `src/lib/ai/retrieval/mock-retrieval.ts` | Dead code. retrieveChunks uses ai_chunks only; retrieveChunksMock never imported. |

---

## Retained (Type-Only)

| File | Usage |
|------|-------|
| `src/data/mock/types.ts` | Type-only imports: TrackSlug, Question, Note, AdaptiveRecommendation, QuestionType, etc. Used by ~20 files. |
| `src/data/mock/index.ts` | Re-exports types only. Header comment clarifies no runtime mock data. |

---

## Retained Test Fixtures

None. No test files import from `data/mock`. Tests use inline fixtures or DB.

---

## Proof: No Runtime Imports from Removed Code

**Learner routes** (app/(app)/*): Import only `@/data/mock/types` for types (TrackSlug, etc.). No mock data.

**Admin routes** (app/(app)/admin/*): Same. No mock data.

**Verification**:
```bash
grep -r "@/data/mock" src/app src/components src/lib --include="*.ts" --include="*.tsx"
```
Result: All matches are `@/data/mock/types` (type-only).

---

## Intentional Fallback Comment

In `src/lib/dashboard/loaders.ts` → `loadHighYieldTopics`:
```ts
// Intentional empty arrays when no telemetry/student signal data exists (DB-backed in future)
telemetry: [],
studentSignal: [],
```
These are not mock runtime behavior; they are empty inputs when no learner telemetry exists.

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/mock/index.ts` | Export types only; remove exports of deleted files |
| `src/data/mock/types.ts` | Header comment: type-only, no runtime mock |
| `src/lib/dashboard/loaders.ts` | Comment for intentional telemetry/studentSignal fallback |
| `src/data/mock/admin.ts` | **DELETED** |
| `src/data/mock/questions.ts` | **DELETED** |
| `src/data/mock/readiness.ts` | **DELETED** |
| `src/data/mock/performance.ts` | **DELETED** |
| `src/data/mock/notes.ts` | **DELETED** |
| `src/data/mock/recommendations.ts` | **DELETED** |
| `src/data/mock/study-guides.ts` | **DELETED** |
| `src/data/mock/flashcards.ts` | **DELETED** |
| `src/data/mock/videos.ts` | **DELETED** |
| `src/data/mock/systems.ts` | **DELETED** |
| `src/data/mock/high-yield.ts` | **DELETED** |
| `src/data/mock/lab-refs.ts` | **DELETED** |
| `src/lib/ai/retrieval/mock-retrieval.ts` | **DELETED** |
