# Source Evidence Metadata Flow

This document describes how source/evidence metadata is attached to AI-generated and admin-created content so auto-publish is not blocked when `require_source_mapping` is true.

## Overview

- **`content_source_evidence`** – Legal/copyright metadata (e.g., fair use, licensed).
- **`content_evidence_metadata`** – Source mapping (primary_reference, source_slugs). Auto-publish eligibility uses this.

`hasValidSourceMapping` (and thus `evaluateAutoPublishEligibility`) only checks `content_evidence_metadata`. Every AI-generated and admin-created item must have a valid row there.

## Flow

1. On every content persist (AI factory or admin), call `ensureContentEvidenceMetadata(entityType, entityId, trackSlug, options?)`.
2. If AI provides valid slugs → validate against track → use them.
3. If not → use `getDefaultApprovedSourceForTrack(trackSlug)` and assign that as primary.
4. Upsert `content_evidence_metadata` with `primary_reference_id` and `source_slugs`.
5. If no approved sources for the track → return `{ ok: false }`, do not upsert; `hasValidSourceMapping` will fail with "No evidence metadata" and the item goes to editor_review.

## Content Types

| Entity Type         | Persistence Location(s) |
|---------------------|-------------------------|
| question            | AI factory, bulk persistence, admin questions actions |
| study_guide         | AI factory, admin study-guides actions |
| flashcard_deck      | AI factory, admin flashcards actions |
| high_yield_content  | AI factory, admin high-yield actions |

## Example Published Item Metadata

```json
{
  "entity_type": "question",
  "entity_id": "<uuid>",
  "source_framework_id": "<framework-uuid>",
  "primary_reference_id": "<approved-source-id>",
  "guideline_reference_id": "<approved-source-id-or-null>",
  "evidence_tier": 2,
  "source_slugs": ["ncsbn_nclex"]
}
```

## Failure Reasons

When `hasValidSourceMapping` or `evaluateAutoPublishEligibility` fails, the reason is logged and the item routes to editor_review:

| Reason | Meaning |
|--------|---------|
| `"No evidence metadata"` | No `content_evidence_metadata` row exists. |
| `"Missing primary_reference or source_slugs"` | Row exists but both are empty. |
| `"Unapproved sources: <slugs>"` | Slugs not in `approved_evidence_sources_track` for the track. |
| `"No approved evidence sources for track <slug>"` | Track has no approved sources (from `ensureContentEvidenceMetadata`). |

## Key Functions

- **`getDefaultApprovedSourceForTrack(trackSlug)`** – Returns the first test_plan (or first source) for the track from `approved_evidence_sources_track`.
- **`ensureContentEvidenceMetadata(entityType, entityId, trackSlug, options?)`** – Ensures `content_evidence_metadata` exists. Uses AI slugs if valid; otherwise uses the default approved source. Always upserts a valid row when possible.

## Files

| File | Role |
|------|------|
| `src/lib/admin/source-governance.ts` | `getDefaultApprovedSourceForTrack`, `ensureContentEvidenceMetadata`, `hasValidSourceMapping` (with failure logging) |
| `src/lib/admin/ai-factory-persistence.ts` | AI factory persistence for all content types |
| `src/lib/ai/factory/bulk-persistence.ts` | Bulk persistence with quality/auto-publish |
| `src/app/(app)/actions/questions.ts` | Admin create/update questions |
| `src/app/(app)/actions/flashcards.ts` | Admin create/save flashcards |
| `src/app/(app)/actions/high-yield.ts` | Admin create/update high-yield |
| `src/app/(app)/actions/study-guides.ts` | Admin create/update study guides |
