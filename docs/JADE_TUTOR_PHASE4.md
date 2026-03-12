# Phase 4: Jade Tutor Reliability & Production-Safety

**Date:** 2025-03-11

## Summary

Jade Tutor now uses intent detection, strict response schemas, and separate tutoring prompts. It reliably generates exam questions, flashcards, and explanations when asked.

## Architecture

### Intent Router

**`src/lib/ai/jade-tutor/intents.ts`**

Detects user intent from free-form message:
- `explain_concept` – explain, what is, how does, etc.
- `generate_questions` – generate/create N questions, quiz me
- `generate_flashcards` – flashcards, flash cards
- `create_mnemonic` – mnemonic, memory trick
- `quiz_followup` – quiz me, 5 questions
- `high_yield_review` – high-yield, key points
- `remediation` – weak areas, help with
- `compare_concepts` – compare, contrast, vs.
- `general` – fallback

### System Prompts

**`src/lib/ai/jade-tutor/prompts.ts`**

- **Separate from admin content-factory** – tutoring prompts only
- **Learner-safe rules**: no copyrighted copying, no fabricated citations, no pretending content was saved
- **Track-specific** – RN, FNP, PMHNP, LVN behavior

### Response Schemas

**`src/lib/ai/jade-tutor/schemas.ts`**

- `LearnerQuestion` – stem, options, rationale, correctKey
- `QuestionSetResponse` – questions[], topic?, track?
- `LearnerFlashcard` – front, back
- `FlashcardSetResponse` – flashcards[], topic?
- `ExplanationResponse`, `MnemonicResponse`, `RemediationResponse`

### Handlers

**`src/lib/ai/jade-tutor/handlers.ts`**

- `handleGenerateQuestions` – track-aware, strict JSON output, validated
- `handleExplainConcept` – RAG retrieval, educational explanation
- `handleGenerateFlashcards` – JSON array, validated

### Parsers

**`src/lib/ai/jade-tutor/parsers.ts`**

- `parseQuestionSet` – extract and validate question array
- `parseFlashcardSet` – extract and validate flashcard array

## Flow

1. User sends message → `chatWithJade` server action
2. `processJadeChat` detects intent
3. Route to handler (generate_questions, explain_concept, or orchestrator for mnemonic/quiz/etc.)
4. Handler returns validated output
5. UI renders questions, flashcards, or text

## Sample Prompts (for testing)

**Generate questions:**
- "Generate 5 practice questions on heart failure"
- "Give me 3 questions about diabetes"
- "Quiz me on cardiovascular"

**Explain:**
- "Explain heart failure pathophysiology"
- "What is the difference between HFrEF and HFpEF?"

**Flashcards:**
- "Make flashcards from this: [text]"
- "Create 5 flashcards on pharmacology"

## Logging

All Jade chat interactions logged to `ai_interaction_logs` with `interaction_type: "explain_highlight"` (unified for usage counting).
