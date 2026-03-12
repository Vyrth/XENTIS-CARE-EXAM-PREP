# Evidence Source Governance for AI Factory

## Overview

Ensures AI-generated exam-prep content uses only approved evidence sources aligned with exam blueprints. Governs RN, LVN/LPN, FNP, and PMHNP tracks.

## Deliverables

### 1. Schema Updates

**Migration:** `supabase/migrations/20250315000001_evidence_source_governance.sql`

- **approved_evidence_sources** — Approved textbooks, guidelines, test plans
  - `slug`, `name`, `source_type` (test_plan, textbook, guideline, handbook)
  - `evidence_tier` (1=primary, 2=secondary, 3=supporting)
- **approved_evidence_sources_track** — Many-to-many: which sources apply to which track
- **content_evidence_metadata** — Per-content evidence provenance
  - `source_framework_id`, `primary_reference_id`, `guideline_reference_id`
  - `evidence_tier`, `source_slugs` (JSONB)
- **auto_publish_config.require_source_mapping** — New column (default true)

### 2. Approved Sources by Track

| Track | Tier 1 (Test Plans) | Tier 2 (Textbooks/Handbooks) | Tier 3 (Guidelines) |
|-------|---------------------|------------------------------|---------------------|
| RN/LVN | NCSBN NCLEX | Lippincott Manual, Saunders, Lippincott Drug, Davis Drug, Brunner & Suddarth | CDC, USPSTF, AHA, ADA |
| FNP | ANCC FNP, AANP FNP Blueprint | Current Medical Dx, Bates, Fitzgerald NP, Primary Care | USPSTF, CDC, ADA, ACC/AHA, ACOG, AAP |
| PMHNP | ANCC PMHNP, DSM-5-TR | Stahl, Kaplan & Sadock, Carlat | APA, VA/DoD, SAMHSA |

### 3. Source Governance Logic

**File:** `src/lib/admin/source-governance.ts`

- `getApprovedSourceSlugsForTrack(trackSlug)` — Slugs approved for track
- `getApprovedSourcesForTrack(trackSlug)` — Full source list for prompts
- `validateSourceSlugsForTrack(trackSlug, slugs)` — Validates slugs are approved
- `hasValidSourceMapping(entityType, entityId, trackSlug)` — Checks content has valid evidence metadata
- `upsertContentEvidenceMetadata(...)` — Persists evidence metadata
- `getContentEvidenceMetadata(...)` — For admin UI

### 4. AI Prompt Updates

**File:** `src/lib/ai/prompts/question-prompts.ts`

- Added `APPROVED_SOURCES_BY_TRACK` — Static mapping per track
- Added `EVIDENCE_SOURCE_REQUIREMENTS` — Instructs AI to include `primary_reference`, `guideline_reference`, `evidence_tier`
- JSON schema examples updated with evidence fields

**Parser:** `src/lib/ai/question-factory/parser.ts`

- Parses `primary_reference`, `guideline_reference`, `evidence_tier` from AI output

### 5. Publish Validation Rules

**File:** `src/lib/admin/auto-publish.ts`

- `checkAutoPublishEligibility` now requires `content_evidence_metadata` with valid source mapping when `require_source_mapping` is true
- Uses `hasValidSourceMapping` from source-governance

### 6. Persistence

**File:** `src/lib/admin/ai-factory-persistence.ts`

- `saveAIQuestion` persists `content_evidence_metadata` after save
- Validates source slugs; stores metadata only when valid
- Links `content_source_framework` (existing) and `content_evidence_metadata` (new)

### 7. Admin UI

**Component:** `src/components/admin/EvidenceSourceGovernancePanel.tsx`

- Displays source framework, primary reference, guideline reference, evidence tier
- Shows "No source mapping" when missing (blocks auto-publish)
- Used on question detail page: `src/app/(app)/admin/questions/[id]/page.tsx`

**Loader:** `src/lib/admin/evidence-metadata-loaders.ts`

- `loadContentEvidenceMetadataWithNames` — Resolves source names for display

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20250315000001_evidence_source_governance.sql` | New migration |
| `src/lib/admin/source-governance.ts` | New |
| `src/lib/admin/source-governance-helpers.ts` | New |
| `src/lib/admin/evidence-metadata-loaders.ts` | New |
| `src/lib/admin/auto-publish.ts` | Added require_source_mapping check |
| `src/lib/admin/ai-factory-persistence.ts` | Persist content_evidence_metadata |
| `src/lib/ai/prompts/question-prompts.ts` | Approved sources + evidence fields |
| `src/lib/ai/question-factory/parser.ts` | Parse evidence fields |
| `src/lib/ai/question-factory/types.ts` | primaryReference, guidelineReference, evidenceTier |
| `src/lib/ai/content-factory/parsers.ts` | Pass-through evidence fields |
| `src/components/admin/EvidenceSourceGovernancePanel.tsx` | New |
| `src/app/(app)/admin/questions/[id]/page.tsx` | Added EvidenceSourceGovernancePanel |
| `src/lib/ai/factory/bulk-persistence.ts` | Persist content_source_framework + content_evidence_metadata in bulk flow |

## Rejection Logic

- **Missing sources:** Content is saved but `content_evidence_metadata` is not populated (or has empty source_slugs). Auto-publish will fail.
- **Unsupported sources:** When AI returns slugs not in approved list, validation fails; metadata is stored with empty/invalid refs. Auto-publish blocked.
- **Strict rejection:** Not implemented. All content is saved; only auto-publish is gated. Admin can manually add source mapping later.

## Remaining Blockers / Future Work

1. **Study guides, flashcards, high-yield** — Evidence metadata persistence and prompts not yet updated. Same pattern can be applied.
2. **Manual source mapping** — Admin cannot yet edit `content_evidence_metadata` from the UI (read-only panel). Add form to assign primary/guideline reference.
3. **Manual publish gate** — `transitionContentStatus` (manual publish) does not check `content_evidence_metadata`. Only auto-publish is gated. Consider adding for AI-generated content.
4. **Bulk persistence** — `bulkPersistQuestions` now persists `content_source_framework` and `content_evidence_metadata` via `applyQualityAndAutoPublish`.
