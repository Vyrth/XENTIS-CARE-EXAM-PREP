# Admin CMS: Track-First Content Production

All content production in the admin CMS is now track-first. Every content object must belong to a track unless explicitly marked shared.

## Supported Tracks

| Slug | Name |
|------|------|
| lvn | LVN/LPN |
| rn | RN |
| fnp | FNP |
| pmhnp | PMHNP |

## Content Types with Required Track

- **Questions** — `exam_track_id` NOT NULL
- **Study guides** — `exam_track_id` NOT NULL
- **Flashcard decks** — `exam_track_id` NOT NULL
- **Videos** — `exam_track_id` NOT NULL
- **System bundles** — `exam_track_id` NOT NULL
- **Exam templates** — `exam_track_id` NOT NULL
- **System exams** — `exam_track_id` NOT NULL
- **Topic summaries** — `exam_track_id` nullable (supports shared)

## Components

### AdminTrackSelect

Required track selector for create/edit forms. First field in metadata.

- `tracks` — from `loadExamTracks()`
- `value` / `onChange` — controlled
- `required` — blocks create when empty
- `allowShared` — optional, for content types that support shared (e.g. topic summaries)

### TrackBadge

Visual track label for cards, rows, and edit headers.

- `slug` — lvn | rn | fnp | pmhnp | null
- `isShared` — shows "Shared" when true
- Shows "—" (red) when no track assigned

### StatusTransitionButton

- `blockPublishReason` — when set, disables Approve and Publish transitions
- Used when track is missing: "Assign a track before publishing"

## Admin Pages Updated

| Page | Track filter | Track labels | Track selector in form |
|------|--------------|--------------|------------------------|
| Questions | ✓ | ✓ (table) | ✓ (new, edit) |
| Study guides | ✓ | ✓ (table) | ✓ (new, edit) |
| Videos | ✓ | ✓ (cards) | ✓ (new, edit) |
| Flashcards | ✓ | ✓ (cards) | — (deck inherits) |
| System bundles | ✓ | ✓ (cards) | — |
| Publish queue | ✓ | ✓ (table) | — |
| Review queue | ✓ | ✓ (table) | — |

## Create Flow

1. Track selector is **first field** and **required**
2. "Create as Draft" is **disabled** until track is selected
3. System selector loads systems for the selected track (when wired to real data)

## Edit Flow

1. Track badge shown in header next to status
2. Track selector in metadata tab (required)
3. Publish/Approve **blocked** with tooltip if track is missing

## Layout Banner

Admin layout shows: *"Track-first CMS: Every content object must be assigned to a track (LVN, RN, FNP, PMHNP). Publish is blocked until track is set."*

## Shared Support

For content types that support shared (e.g. `topic_summaries` with nullable `exam_track_id`):

- Use `AdminTrackSelect` with `allowShared={true}`
- "Shared (all tracks)" option maps to `exam_track_id = NULL`
- `TrackBadge` with `isShared` shows "Shared"
