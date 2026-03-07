# Xentis Care Exam Prep — Student-Facing Screens File Tree

## App Routes (Pages)

```
src/app/(app)/
├── dashboard/page.tsx                    # 1. Dashboard (adaptive recommendations)
├── study-plan/page.tsx                  # 2. Study Plan
├── questions/page.tsx                   # 3. Question Bank Library
├── topics/page.tsx                     # 4. Topic Hub
├── pre-practice/
│   ├── page.tsx                        # 5. Pre-Practice Exam Lobby
│   └── [track]/
│       ├── page.tsx                    # Lobby by track
│       └── tutorial/page.tsx           # 6. Pre-Practice Tutorial
├── exam/[examId]/
│   ├── page.tsx                       # 7–9. Exam Interface (standard, image, case-study)
│   ├── review/page.tsx                 # 13. Exam Review Navigator
│   └── results/page.tsx                # 14. Exam Results Summary
├── results/[resultId]/
│   ├── breakdown/page.tsx              # 15. Domain/System Performance Breakdown
│   └── rationale/[questionId]/page.tsx # 16. Rationale / Answer Explanation
├── ai-tutor/page.tsx                   # 17. AI Tutor page
├── flashcards/
│   ├── page.tsx                        # 19. Flashcards page (deck list)
│   └── [deckId]/page.tsx               # Flip-card study UI
├── videos/
│   ├── page.tsx                        # Video list
│   └── [videoId]/page.tsx              # 20. Video Lesson page
├── study-guides/
│   ├── page.tsx                        # Study guide list
│   └── [guideId]/page.tsx               # 21. Study Guide Reader (highlightable)
├── notebook/page.tsx                   # 22. Notebook page
├── weak-areas/page.tsx                 # 23. Weak Area Center
├── strength-report/page.tsx            # 24. Strength Report
├── confidence-calibration/page.tsx     # 25. Confidence Calibration Report
├── profile/page.tsx                    # 26. Profile / Preferences
└── billing/page.tsx                   # 27. Billing page
```

## Shared Components

```
src/components/
├── dashboard/
│   └── AdaptiveRecommendationWidget.tsx   # Adaptive recommendations on dashboard
├── study/
│   ├── HighlightableText.tsx              # Highlight → Ask AI / Save to Notebook
│   ├── HighlightableMarkdown.tsx           # Markdown with same actions
│   └── AIPopover.tsx                      # 18. Highlight-to-AI popover
├── exam/
│   ├── LabReferenceDrawer.tsx             # 10. Lab Reference Drawer
│   ├── CalculatorDrawer.tsx                # 11. Calculator / dosage workspace
│   └── WhiteboardDrawer.tsx               # 12. Whiteboard / scratchpad
├── profile/
│   └── ProfilePreferences.tsx             # Preferences toggles
└── ui/
    ├── Card.tsx, Badge.tsx, ProgressBar.tsx, StatBlock.tsx, ActionTile.tsx
    ├── Tabs.tsx, EmptyState.tsx, ExamToolButton.tsx
    └── ThemeToggle.tsx, icons.tsx
```

## Hooks

```
src/hooks/
├── useExam.ts          # Exam state (questions, responses, flags, time, navigation)
├── useHighlight.ts     # Highlight ranges
├── useNotebook.ts      # Notes (add, delete, update) — ready for Supabase
└── useAIPopover.ts     # AI popover state (open, close, selectedText, position)
```

## Mock Data

```
src/data/mock/
├── types.ts            # Shared types (Question, System, Domain, Topic, etc.)
├── systems.ts          # MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS
├── questions.ts        # MOCK_QUESTIONS, MOCK_IMAGE_QUESTION, MOCK_CASE_STUDY_QUESTION
├── lab-refs.ts         # MOCK_LAB_REFERENCES, LAB_SETS (CBC, BMP, Coagulation)
├── study-guides.ts     # MOCK_STUDY_GUIDES (4 guides)
├── flashcards.ts       # MOCK_FLASHCARD_DECKS, MOCK_FLASHCARDS
├── videos.ts           # MOCK_VIDEOS
├── recommendations.ts  # MOCK_RECOMMENDATIONS (adaptive)
├── performance.ts      # MOCK_PERFORMANCE_BY_SYSTEM, MOCK_PERFORMANCE_BY_DOMAIN, MOCK_CONFIDENCE_DATA
├── notes.ts            # MOCK_NOTES
└── index.ts            # Re-exports
```

## Integration Notes

- **Supabase**: Types and mock data align with schema concepts. Swap mock imports for Supabase queries in data-fetching layers.
- **Highlight-to-AI**: `HighlightableText` and `HighlightableMarkdown` trigger `onHighlight` → `useAIPopover.open` → `AIPopover` with Explain / Mnemonic / Flashcard actions.
- **Save-to-Notebook**: `onSaveToNotebook` → `useNotebook.addNote`. Replace with Supabase mutation when backend is ready.
- **Exam flow**: Pre-Practice Lobby → Tutorial → `/exam/pre-practice-{track}` → Review → Results → Rationale / Breakdown.
