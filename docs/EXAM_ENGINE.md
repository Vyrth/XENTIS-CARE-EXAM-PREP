# Exam Engine Architecture

## Overview

The exam engine supports Pre-Practice (150q), System (50+ per system), Custom Quiz, and Readiness exams. It includes board-like tools, session persistence for resume, and a scoring pipeline.

## Item Types (13)

| Type | Renderer | Response Format |
|------|----------|-----------------|
| single_best_answer | SingleBestAnswerRenderer | `{ type: "single", value: string }` |
| multiple_response | MultipleResponseRenderer | `{ type: "multiple", value: string[] }` |
| select_n | SelectNRenderer | `{ type: "multiple", value: string[] }` |
| image_based | ImageBasedRenderer | `{ type: "single", value: string }` |
| chart_table_exhibit | ChartTableRenderer | `{ type: "single", value: string }` |
| matrix | MatrixRenderer | `{ type: "matrix", value: Record<string,string> }` |
| dropdown_cloze | DropdownClozeRenderer | `{ type: "dropdown", value: Record<string,string> }` |
| ordered_response | OrderedResponseRenderer | `{ type: "ordered", value: string[] }` |
| hotspot | HotspotRenderer | `{ type: "hotspot", value: string[] }` |
| highlight_text_table | HighlightTextRenderer | `{ type: "highlight", value: string[] }` |
| case_study | CaseStudyRenderer | `{ type: "single", value: string }` |
| dosage_calc | DosageCalcRenderer | `{ type: "numeric", value: number }` |
| bow_tie_analog | BowTieRenderer | `{ type: "single", value: string }` |

## Board-like Tools

- **Timer** — Countdown, persists with session
- **Progress counter** — Answered / total
- **Flag** — Per-question flag for review
- **Review screen** — Grid navigator, submit
- **Calculator** — Side drawer
- **Labs drawer** — Lab reference ranges (CBC, BMP, Coag)
- **Whiteboard** — Canvas scratchpad
- **Highlight** — (In content; not in MCQ)
- **Strikeout** — Per-option strikeout (SingleBestAnswer)
- **Image zoom** — ImageBasedRenderer
- **Case tabs** — CaseStudyRenderer

## Session Model

```ts
ExamSession {
  id: string;           // examId for storage key
  userId: string;
  config: ExamConfig;
  questionIds: string[]; // Stable order (seeded shuffle)
  responses: Record<string, ExamResponse>;
  flags: Set<string>;
  timeRemainingSeconds: number;
  startedAt: string;
  lastSavedAt: string;
  completedAt?: string;
}
```

## Persistence Design

1. **localStorage** — `xentis_exam_{sessionId}` — Auto-save every 30s
2. **Resume** — Load by examId; same questionIds if same seed
3. **Server** — `saveExamSession`, `loadExamSession`, `submitExamAndScore` (server actions)
4. **Stable ordering** — `seededShuffle(questions, seed)` — same seed = same order

## Scoring Pipeline

1. `computeScore(session, getCorrectAnswer, getSystemId, getDomainId, getItemType)`
2. Returns `ExamScoreResult`: rawScore, maxScore, percentCorrect, bySystem, byDomain, timeSpentSeconds
3. Server action `submitExamAndScore` computes and (TODO) saves to DB

## Exam Modes

| Mode | Route | Questions | Time |
|------|-------|-----------|------|
| Pre-Practice | `/exam/pre_practice-{track}-{seed}` | 150 | 180 min |
| System | `/exam/system-{systemId}-{seed}` | 50+ | 120 min |
| Readiness | `/exam/readiness-{track}-{seed}` | 30 | 45 min |
| Custom | `/exam/custom-{seed}` | User-selected | Configurable |

## File Structure

```
src/
├── types/exam.ts              # ItemType, ExamSession, ExamResponse, ExamConfig
├── lib/exam/
│   ├── session.ts             # createSession, load/save storage, isResponseValid
│   ├── scoring.ts             # computeScore, ExamScoreResult
│   └── question-bank.ts       # getQuestionIdsForExam, seededShuffle
├── components/exam/
│   ├── question-renderers/    # Factory + 13 renderers
│   ├── ExamShell.tsx          # Timer, tools, navigation
│   ├── ExamReviewNavigator.tsx
│   ├── ExamResultSummary.tsx
│   ├── LabReferenceDrawer.tsx
│   ├── CalculatorDrawer.tsx
│   └── WhiteboardDrawer.tsx
├── app/(app)/
│   ├── exam/[examId]/page.tsx # Main exam UI
│   ├── exam/system/[systemId]/page.tsx
│   ├── exam/readiness/page.tsx
│   └── actions/exam.ts        # Server actions
```

## Session Recovery Strategy

1. **examId** = `{mode}-{params}-{seed}` — Deterministic for same session
2. **localStorage** — Key = `xentis_exam_{examId}`; load on mount
3. **Same seed** — Question order stable; resume shows same questions in same order
4. **Server sync** — When DB ready: save on interval, load on mount if no local
