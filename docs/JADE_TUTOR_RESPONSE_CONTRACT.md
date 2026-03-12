# Jade Tutor Response Contract (Phase 2A)

## Overview

Jade Tutor now returns strict structured payloads for all three primary intents. Server-side validation ensures malformed AI output never reaches the UI. Each response includes a `mode` for deterministic rendering.

---

## Exact Schemas Used

### 1. `question_set` — Generate Exam Questions

```json
{
  "mode": "question_set",
  "track": "fnp",
  "topic": "hypertension",
  "system": "cardiovascular",
  "questions": [
    {
      "stem": "Clinical scenario or question stem (2-4 sentences)",
      "choices": [
        {"key": "A", "text": "Option text"},
        {"key": "B", "text": "Option text"},
        {"key": "C", "text": "Option text"},
        {"key": "D", "text": "Option text"}
      ],
      "correct_answer": "B",
      "rationale": "Why the correct answer is right. 2-4 sentences.",
      "difficulty": "medium",
      "exam_track": "fnp"
    }
  ]
}
```

- **mode**: `"question_set"`
- **track**: `"lvn" | "rn" | "fnp" | "pmhnp"` (required; uses learner's current track if not provided)
- **topic**: optional string
- **system**: optional string (e.g. cardiovascular, renal)
- **questions**: array of 1–20 items, each with `stem`, `choices`, `correct_answer`, `rationale`, optional `difficulty`, optional `exam_track`

### 2. `flashcard_set` — Generate Flashcards

```json
{
  "mode": "flashcard_set",
  "cards": [
    {"front": "question or term", "back": "answer or definition"},
    ...
  ]
}
```

- **mode**: `"flashcard_set"`
- **cards**: array of 1–50 items, each with `front` and `back`

### 3. `concept_explanation` — Explain Concept

```json
{
  "mode": "concept_explanation",
  "title": "Short title of the concept",
  "summary": "2-5 sentence clear explanation.",
  "high_yield_points": ["Key point 1", "Key point 2", "Key point 3"],
  "common_traps": ["Common mistake 1", "Common mistake 2"]
}
```

- **mode**: `"concept_explanation"`
- **title**: required string
- **summary**: required string
- **high_yield_points**: array of 1–10 strings
- **common_traps**: array of 0–5 strings (optional, defaults to `[]`)

---

## Files Changed

| File | Changes |
|------|---------|
| `src/lib/ai/jade-tutor/response-contract.ts` | **NEW** — Zod schemas, `parseQuestionSet`, `parseFlashcardSet`, `parseConceptExplanation`, normalizers |
| `src/lib/ai/jade-tutor/schemas.ts` | Unchanged (legacy types; response-contract is source of truth) |
| `src/lib/ai/jade-tutor/parsers.ts` | Unused by Jade Tutor (handlers use response-contract) |
| `src/lib/ai/jade-tutor/prompts.ts` | `buildQuestionGenerationPrompt` updated for new schema; added `buildConceptExplanationPrompt` |
| `src/lib/ai/jade-tutor/intents.ts` | Added `extractTrackFromMessage`; extended topic patterns |
| `src/lib/ai/jade-tutor/handlers.ts` | Switched to response-contract parsers; return `mode`, structured payloads; track-aware; graceful errors |
| `src/lib/ai/jade-tutor/index.ts` | `JadeChatResult` extended with `mode`, `conceptExplanation`, `track`, `topic` |
| `src/app/actions/ai.ts` | `chatWithJade` return type and passthrough updated |
| `src/components/ai/AITutorChat.tsx` | Added `lastConceptExplanation` state; render concept block (title, summary, high_yield_points, common_traps) |

---

## Test Examples

### 1. "Give me 5 FNP exam questions on hypertension"

- **Intent**: `generate_questions`
- **Track**: `fnp` (from message)
- **Topic**: `hypertension`
- **Expected response**: `mode: "question_set"`, 5 questions with `stem`, `choices`, `correct_answer`, `rationale`, `difficulty`, `exam_track`

### 2. "Make flashcards on ACE inhibitors"

- **Intent**: `generate_flashcards`
- **Topic**: ACE inhibitors (from message)
- **Expected response**: `mode: "flashcard_set"`, `cards: [{front, back}, ...]`

### 3. "Explain nephrotic syndrome"

- **Intent**: `explain_concept`
- **Topic**: nephrotic syndrome
- **Expected response**: `mode: "concept_explanation"`, `title`, `summary`, `high_yield_points`, `common_traps`

---

## Validation & Error Handling

- **Server-side**: All AI output is parsed and validated via Zod before being returned.
- **Graceful errors**: On parse/validation failure, a user-friendly error message is returned; raw AI output is never exposed.
- **Track-awareness**: `extractTrackFromMessage` detects track from the message (e.g. "FNP exam"); otherwise the learner's current track from onboarding is used.
- **Normalizers**: `normalizeQuestionRaw` and `normalizeFlashcardRaw` handle common AI variations (e.g. `options` vs `choices`, `correctKey` vs `correct_answer`, `cards` vs `flashcards`).
