# Study Guide Auto-Publish Flow

**Date:** March 2025  
**Status:** Implemented

---

## 1. Root Cause

Study guides were the only content type without quality scoring and auto-publish:

- **Questions, flashcards, high-yield** – Already had `computeQuestionQualityScore` / `computeFlashcardDeckQualityScore` / `computeHighYieldQualityScore` + `runAutoPublishFlow` in their create/update/save actions.
- **Study guides** – `createStudyGuide`, `updateStudyGuide`, and `saveStudyGuideSections` only persisted data and did not:
  - Compute quality score
  - Upsert `content_quality_metadata`
  - Call `runAutoPublishFlow`
  - Revalidate learner routes

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/app/(app)/actions/study-guides.ts` | Add `runStudyGuideQualityAndAutoPublish()` helper; call it from `createStudyGuide`, `updateStudyGuide`, `saveStudyGuideSections`, `deleteStudyGuideSection`; add `revalidatePath("/study-guides", "layout")` |
| `docs/STUDY_GUIDE_AUTO_PUBLISH.md` | This document |

---

## 3. Parent Guide Quality Scoring Flow

```
runStudyGuideQualityAndAutoPublish(guideId)
  1. Load study_guides (id, title, description, status) for guideId
  2. Load study_material_sections (title, content_markdown) for guideId, parent_section_id IS NULL, ordered by display_order
  3. Build draft = { title, description, sections: [{ title, contentMarkdown }] }
  4. mode = sections.length > 1 ? "full" : "section_pack"
  5. quality = computeStudyGuideQualityScore(draft, mode)
  6. upsertContentQualityMetadata("study_guide", guideId, { qualityScore, autoPublishEligible, validationStatus, validationErrors })
  7. runAutoPublishFlow("study_guide", guideId, "study_guide", fromStatus, null)
     - If eligible → transitionContentStatus(..., "published") → revalidate learner routes (in content-review)
     - If not eligible → transitionContentStatus(..., "editor_review") + record routedToReviewReason in content_quality_metadata
  8. Caller revalidates /admin/study-guides, /admin/study-guides/[id], /study-guides (layout)
```

---

## 4. How Section Saves Affect Publish Status

| Action | When quality/auto-publish runs | Effect |
|--------|------------------------------|--------|
| `createStudyGuide` | After insert | Guide has no sections → validation fails → routed to editor_review |
| `updateStudyGuide` | After update | Loads sections from DB → recomputes quality → may auto-publish if eligible |
| `saveStudyGuideSections` | After sections saved | Loads guide + sections from DB → recomputes quality → may auto-publish if eligible |
| `deleteStudyGuideSection` | After section deleted | Loads remaining sections → recomputes quality → may auto-publish or route to editor_review |

**Typical flow (new guide):**

1. `createStudyGuide` → shell created → `runStudyGuideQualityAndAutoPublish` with empty sections → routed to editor_review
2. `saveStudyGuideSections` → sections saved → `runStudyGuideQualityAndAutoPublish` with full sections → may auto-publish if eligible

**Typical flow (edit existing guide):**

1. `updateStudyGuide` → metadata updated → `runStudyGuideQualityAndAutoPublish` → may auto-publish
2. `saveStudyGuideSections` → sections updated → `runStudyGuideQualityAndAutoPublish` → may auto-publish

---

## 5. Learner Visibility

- **Filter:** `loadStudyGuides` and `loadStudyGuideById` use `LEARNER_VISIBLE_STATUSES` (includes `published`).
- **Revalidation:** When `runAutoPublishFlow` publishes, `transitionContentStatus` in content-review revalidates `/study-guides` (layout). Study guide actions also call `revalidatePath("/study-guides", "layout")` after each save.
- **Result:** Published study guides appear on `/study-guides` and `/study-guides/[guideId]` for the correct track.

---

## 6. Manual Test Steps (Generation → Learner Visibility)

### Prerequisites

- `OPENAI_API_KEY` set
- Supabase configured
- `auto_publish_config`: `UPDATE auto_publish_config SET enabled = true WHERE content_type = 'study_guide';`

### Steps

1. **Create study guide (admin)**  
   - Go to Admin → Study Guides → New  
   - Select track (e.g. RN), system, topic  
   - Enter title and description  
   - Add at least one section with content (≥20 chars per section)  
   - Click Save  

2. **Verify quality and status**  
   - Check `content_quality_metadata` for the guide: `quality_score`, `auto_publish_eligible`, `validation_status`  
   - Check `study_guides.status`: `published` if eligible, else `editor_review`  
   - If `editor_review`, check `content_quality_metadata.generation_metadata->routedToReviewReason`  

3. **Verify learner visibility**  
   - Log in as learner  
   - Select the same track (RN)  
   - Go to Study Guides  
   - Confirm the new guide appears in the list  
   - Open the guide and confirm sections render  

4. **Edit and re-save**  
   - Admin → Study Guides → Edit the guide  
   - Change a section’s content  
   - Save  
   - Confirm quality is recomputed and status may change (e.g. editor_review → published)  

5. **Delete section**  
   - Admin → Study Guides → Edit  
   - Delete a section  
   - Save  
   - Confirm quality is recomputed and status may change  

6. **AI draft flow**  
   - Admin → Study Guides → New  
   - Click “AI draft” → AIDraftGeneratorPanel (draftType=study_section)  
   - Generate → Use draft  
   - Add more sections if needed  
   - Save  
   - Confirm quality scoring and auto-publish run as above  
