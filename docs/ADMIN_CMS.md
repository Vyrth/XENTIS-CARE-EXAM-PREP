# Admin CMS & Content Workflow

## Overview

The admin CMS supports original content creation, editorial workflow, copyright/source tracking, media licensing, curriculum planning, and AI chunk eligibility management.

## Workflow Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial state, editable |
| `editor_review` | With editor for copy/structure |
| `sme_review` | Subject matter expert review |
| `legal_review` | Legal/compliance review |
| `qa_review` | Quality assurance |
| `approved` | Ready to publish |
| `published` | Live to students |
| `retired` | Archived, can be reverted to draft |

## Status Transitions

Valid transitions (from → to):

- `draft` → `editor_review`
- `editor_review` → `draft` | `sme_review`
- `sme_review` → `editor_review` | `legal_review`
- `legal_review` → `sme_review` | `qa_review`
- `qa_review` → `legal_review` | `approved`
- `approved` → `qa_review` | `published`
- `published` → `retired`
- `retired` → `draft`

## Admin Sections

| Section | Route | Description |
|---------|-------|-------------|
| Curriculum Manager | `/admin/curriculum` | Track/system/topic planning |
| System Bundle Manager | `/admin/system-bundles` | Content grouped by system |
| Question Manager | `/admin/questions` | List, filter, create questions |
| Question Editor | `/admin/questions/[id]` | Full editor with 9 tabs |
| Study Guide Editor | `/admin/study-guides`, `[id]` | Create/edit guides |
| Flashcard Studio | `/admin/flashcards`, `[deckId]` | Manage decks and cards |
| Video Manager | `/admin/videos`, `[id]` | Manage videos, link media rights |
| Media Rights Library | `/admin/media-rights` | Licensing, attribution, expiry |
| Review Queue | `/admin/review-queue` | Items awaiting review |
| Publish Queue | `/admin/publish-queue` | Approved items ready to publish |
| AI Prompt Manager | `/admin/ai-prompts` | Configure AI prompts, chunk eligibility |
| Mastery Rule Manager | `/admin/mastery-rules` | Thresholds by system/domain |
| Adaptive Recommendation Manager | `/admin/recommendations` | Recommendation rules |
| User Issue Reports | `/admin/issue-reports` | User-reported content issues |
| Analytics Review Console | `/admin/analytics` | Usage and performance metrics |

## Question Editor Tabs

1. **Metadata** — System, domain, type
2. **Stem** — Question text
3. **Options** — Answer choices, correct flag
4. **Rationales** — Explanation
5. **Exhibits** — Images/media, link to Media Rights
6. **Interaction Config** — JSON for scoring/behavior
7. **Sources** — Copyright/source attribution
8. **Review Notes** — Editorial/SME/legal/QA notes
9. **Preview** — Student-facing preview

## Role Guards

- Admin layout (`/admin/*`) requires `isAdmin(userId)` — checks `user_admin_roles` table
- Non-admins are redirected to `/dashboard`

## File Structure

```
src/
├── types/admin.ts              # WorkflowStatus, ContentSource, MediaRightsRecord, etc.
├── data/mock/admin.ts          # Mock data for all admin entities
├── lib/admin/workflow.ts       # canTransition, getAllowedTransitions
├── components/admin/
│   ├── StatusBadge.tsx
│   ├── StatusTransitionButton.tsx
│   └── SourceCopyrightForm.tsx
└── app/(app)/admin/
    ├── layout.tsx             # Auth + role guard
    ├── page.tsx               # Overview
    ├── curriculum/
    ├── system-bundles/
    ├── questions/
    │   ├── page.tsx
    │   ├── new/
    │   └── [id]/
    ├── study-guides/
    ├── flashcards/
    ├── videos/
    ├── media-rights/
    ├── review-queue/
    ├── publish-queue/
    ├── ai-prompts/
    ├── mastery-rules/
    ├── recommendations/
    ├── issue-reports/
    └── analytics/
```

## Integration Notes

- Types align with Supabase schema concepts
- Replace mock imports with Supabase queries in server actions or API routes
- Status transitions should call Supabase `update` with new status
- Media Rights and Content Sources map to `content_sources` and `media_rights` tables
