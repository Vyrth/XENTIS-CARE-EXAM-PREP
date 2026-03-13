# AI Content Factory End-to-End Audit

## 1. Root Causes Table

| Issue | Root Cause |
|-------|------------|
| "Configure eligibility rules" button not clickable | Button had no `href` or `onClick`; it was a dead `<button>`. |
| "Human review required before publish" | Hardcoded banner text in AIFactoryLayout and AIDraftGeneratorPanel. |
| "Question type is required" error | `config.itemTypeSlug` could be undefined; `questionTypeId` resolution didn't fall back to `data.questionTypes` when `generatableTypes` was empty. |
| Auto-publish not occurring | (1) `STATUS_TRANSITIONS` did not allow `draft`/`editor_review` → `published`. (2) `transitionContentStatus` always ran `checkPublishGate` and `checkSourceEvidenceGate`, blocking auto-publish even when quality gate passed. |
| Page description "draft or editor_review only" | Hardcoded in ai-factory page and types. |
| DEFAULT_CONFIG missing itemTypeSlug | Questions tab could start with undefined `itemTypeSlug`, causing validation to fail. |

## 2. Files Changed

| File | Change |
|------|--------|
| `src/types/admin.ts` | Added `draft`→`published` and `editor_review`→`published` to `STATUS_TRANSITIONS`. |
| `src/app/(app)/actions/content-review.ts` | Added `bypassPublishGate` param; when true, skip review/source gates. Added `revalidatePath(ADMIN_ROUTES.AI_FACTORY)` on publish. |
| `src/lib/admin/auto-publish.ts` | Pass `bypassPublishGate: true` when calling `transitionContentStatus` for auto-publish. |
| `src/components/admin/ai-factory/AIFactoryLayout.tsx` | Updated banner text; added `itemTypeSlug: "single_best_answer"` to `DEFAULT_CONFIG`. |
| `src/app/(app)/admin/ai-factory/page.tsx` | Updated page description to mention auto-publish. |
| `src/app/(app)/admin/ai-prompts/page.tsx` | Replaced dead button with `Link` to `/admin/content-inventory`. |
| `src/components/admin/ai-factory/QuestionsTab.tsx` | Improved `questionTypeId` resolution: fall back to `data.questionTypes` when `generatableTypes` lacks slug. |
| `src/lib/ai/factory/types.ts` | Updated comment to reflect auto-publish capability. |
| `src/components/admin/AIDraftGeneratorPanel.tsx` | Updated badge and description text. |

## 3. What Was Fixed

- **Configure eligibility rules**: Button is now a `Link` to `/admin/content-inventory`.
- **Banner text**: Replaced "Human review required" with "When quality gate passes and auto-publish is enabled... can be published automatically."
- **Question type**: `DEFAULT_CONFIG` includes `itemTypeSlug: "single_best_answer"`; `questionTypeId` resolution uses `data.questionTypes` as fallback.
- **Auto-publish flow**: `draft`/`editor_review` can transition to `published`; `transitionContentStatus` accepts `bypassPublishGate` to skip review/source gates when quality gate has passed.
- **Revalidation**: Publishing content now revalidates `/admin/ai-factory` so Campaign/History tabs update.

## 4. What Remains Blocked / Optional

- **Enable auto-publish**: `auto_publish_config.question.enabled` defaults to `false`. To enable:
  ```sql
  UPDATE auto_publish_config SET enabled = true WHERE content_type = 'question';
  ```
- **Source mapping**: Auto-publish requires valid source mapping when `require_source_mapping` is true. AI Factory persists source metadata when the draft includes `primaryReference`/`guidelineReference`; otherwise source gate may block.
- **Quality threshold**: `min_quality_score` is 75 for questions. Content must score ≥75 and pass rationale/answer checks to be eligible.

## 5. Routes and Actions Tested

| Route/Action | Status |
|--------------|--------|
| `/admin/ai-factory` | Page loads; banner updated |
| `/admin/ai-prompts` | "Configure eligibility rules" links to content-inventory |
| `generateQuestionDraft` | Uses `questionTypeId` from config; default `single_best_answer` |
| `saveQuestionDraft` → `saveAIQuestion` | Persists; calls `tryAutoPublish` when eligible |
| `transitionContentStatus` with `bypassPublishGate` | Skips gates; allows draft→published |
| Learner `/questions`, `/study-guides`, etc. | Only show `approved`/`published`; revalidate on publish |

## 6. Migration or Seed Required

- **None** for the code changes.
- **Optional**: Enable auto-publish for questions:
  ```sql
  UPDATE auto_publish_config SET enabled = true WHERE content_type = 'question';
  ```
- **Verify**: `question_types` must be seeded (e.g. `supabase db reset` or `seed.sql`). If empty, question generation will fail with "Question type is required." The seed inserts `single_best_answer` and other types.
