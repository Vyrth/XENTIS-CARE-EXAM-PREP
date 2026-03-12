# Jade Tutor Persistence Layer

Saves AI-generated content into Supabase production tables with track-safe relationships, draft status, and auditability.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/ai/jade-persistence-mappings.ts` | Helper mappings: `mapQuestionTypeToExistingSlug`, `mapHighYieldTypeToExistingEnum`, `resolveDraftStatusForGeneratedContent` |
| `src/lib/ai/jade-persistence.ts` | Main persistence services: `saveGeneratedQuestionDraft`, `saveGeneratedStudyGuideDraft`, `saveGeneratedFlashcardDeckDraft`, `saveGeneratedHighYieldDraft` |
| `docs/JADE_PERSISTENCE_LAYER.md` | This documentation |

## Insert Flow per Content Type

### 1. Questions (`saveGeneratedQuestionDraft`)

1. Map AI `itemType` → valid `question_type_slug` via `mapQuestionTypeToExistingSlug`
2. Resolve `question_type_id` from `question_types` table (DB lookup)
3. Build `GenerationConfig` with `saveStatus` from `resolveDraftStatusForGeneratedContent`
4. Call `persistQuestion` (factory):
   - Insert `questions` (stem, stem_metadata, stem_normalized_hash, status, exam_track_id, system_id, topic_id, domain_id)
   - Insert `question_options` (one per option)
   - **Rollback**: If options insert fails → delete question
   - Insert `question_adaptive_profiles` (difficulty_tier) if extended output
   - Insert `question_skill_tags` if tags present
5. Insert `question_calibration` (default IRT params) via upsert on `question_id`
6. Register in `content_dedupe_registry`

### 2. Study Guides (`saveGeneratedStudyGuideDraft`)

1. Build `GenerationConfig` with `saveStatus`
2. Call `persistFullStudyGuide` (factory):
   - Insert `study_guides` (title, slug, description, status, exam_track_id, system_id, topic_id)
   - Insert `study_material_sections` (one per section: title, content_markdown, section_metadata)
   - **Rollback**: If any section insert fails → delete study guide
3. Register in `content_dedupe_registry`

### 3. Flashcards (`saveGeneratedFlashcardDeckDraft`)

1. Build `GenerationConfig` with `saveStatus`
2. Call `persistFullFlashcardDeck` (factory):
   - Insert `flashcard_decks` (name, description, source: "ai", deck_type, difficulty, status, exam_track_id, system_id, topic_id)
   - Insert `flashcards` in chunks (front_text, back_text, metadata, display_order)
   - **Rollback**: If any card insert fails → delete deck
3. Register in `content_dedupe_registry`

### 4. High-Yield (`saveGeneratedHighYieldDraft`)

1. Resolve `content_type` via `mapHighYieldTypeToExistingEnum` (or infer from draft shape)
2. Build `GenerationConfig` with `saveStatus`
3. Call `persistHighYieldContent` (factory):
   - Insert `high_yield_content` (title, explanation, content_type, status, exam_track_id, system_id, topic_id, type-specific fields)
4. Register in `content_dedupe_registry`

## Dedupe Registration Flow

After each successful save:

1. Compute `normalized_hash`:
   - **Question**: `simpleHash(normalizeForHash(stem))`
   - **Study guide**: `simpleHash(normalizeForHash(title))`
   - **Flashcard deck**: `simpleHash(normalizeForHash(name))`
   - **High-yield**: `simpleHash(normalizeForHash(title))`
2. Insert into `content_dedupe_registry`:
   - `content_type`, `exam_track_id`, `system_id`, `topic_id`
   - `source_table`, `source_id`, `normalized_hash`, `secondary_hash` (optional)
3. On unique constraint violation (content_type, normalized_hash): treat as success (already registered)
4. `dedupeRegistered` boolean returned in `JadePersistResult`

## Transaction Safety

- **Questions**: Factory deletes question if options insert fails
- **Study guides**: Factory deletes guide if any section insert fails
- **Flashcards**: Factory deletes deck if any card insert fails
- **High-yield**: Single insert, no child tables
- **Dedupe registration**: Non-throwing; runs after successful save; content is already persisted

## Helper Mappings

| Function | Purpose |
|----------|---------|
| `mapQuestionTypeToExistingSlug(aiItemType)` | Maps AI output (e.g. "sba", "multiple_choice") to valid `question_type_slug` |
| `mapHighYieldTypeToExistingEnum(aiType)` | Maps to `high_yield_content_type` enum values |
| `resolveDraftStatusForGeneratedContent(preferred)` | Returns `draft` or `editor_review`; never auto-publish |

## Usage

```ts
import {
  saveGeneratedQuestionDraft,
  saveGeneratedStudyGuideDraft,
  saveGeneratedFlashcardDeckDraft,
  saveGeneratedHighYieldDraft,
} from "@/lib/ai/jade-persistence";

const config: GenerationConfig = {
  trackId: "...",
  trackSlug: "lvn",
  systemId: "...",
  topicId: "...",
};

const result = await saveGeneratedQuestionDraft(config, draft, {
  preferredStatus: "editor_review",
});
if (result.success) {
  console.log(result.contentId, result.dedupeRegistered);
}
```
