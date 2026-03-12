# Study Workflow Recommendation Sources

The study workflow orchestration layer (`src/lib/readiness/study-workflow.ts`) powers personalized, track-specific recommendations across the app.

## Recommendation Sources (in priority order)

| Source | When Used | Output |
|--------|-----------|--------|
| **weak_system** | System accuracy < 65%, min 5 questions | Practice `/questions/system/{slug}` |
| **weak_domain** | Domain accuracy < 65%, min 5 questions | Practice `/questions?domain={slug}` |
| **weak_item_type** | Item type accuracy < 60%, min 5 questions | Practice `/questions?itemType={slug}` |
| **pre_practice_due** | No pre-practice in last 7 days | `/pre-practice/{track}` |
| **high_yield** | Top high-yield topic (blueprint weight) | Practice system or `/questions` |
| **study_guides** | Incomplete guides (<50%) or first guide | `/study-guides` or `/study-guides/{id}` |
| **recommended_content** | Items in `recommended_content_queue` | Study guide, video, or flashcard links |
| **onboarding** | No track set | `/onboarding` |
| **practice_questions** | No activity yet | `/questions` |
| **study_guides_generic** | Fallback when few recs | `/study-guides` |

## Data Sources

- **Mastery**: `user_system_mastery`, `user_domain_mastery`, `user_skill_mastery`, `user_item_type_performance` (or derived from `user_question_attempts` + `exam_session_questions`)
- **Pre-practice**: `exam_sessions` where `session_type = 'pre_practice'`
- **High-yield**: Blueprint weights + `getHighYieldTopics()`
- **Study guides**: `loadStudyGuides(trackId)`
- **Recommended content**: `recommended_content_queue`

## Consumers

| Component | Usage |
|-----------|-------|
| **Continue Learning** (dashboard) | `loadStudyWorkflowRecommendations()` → `ActionTile` cards |
| **Recommended for You** (dashboard) | `generateRecommendations()` + `useRecommendations()` → `AdaptiveRecommendationWidget` |
| **Weak area cards** | `WeakAreaOverlay`, `WeakAreaCards` — use same mastery + slug maps |
| **High-yield feed** | `HighYieldStudyFeed` — links to practice by system |
| **Jade Tutor** | `nextStepSuggestions` from workflow → suggested next steps in chat |

## Empty States

- **No track**: Single card → "Complete onboarding" → `/onboarding`
- **No activity**: Cards for "Start practicing", "Pre-Practice Exam", "Study guides"
- **Few recommendations**: Fallback to practice questions + study guides

## Track-Specific Behavior

- Pre-practice href: `/pre-practice/{track}` (e.g. `/pre-practice/rn`)
- All mastery and high-yield data is track-filtered via `exam_track_id`
- Study guides and recommended content are track-scoped
