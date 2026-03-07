# AI Tutor v1 Architecture

## Overview

The AI Tutor is a **board-prep tutor** (not a generic chatbot) for nursing licensing exams. It supports LVN/LPN, RN, FNP, and PMHNP tracks.

## AI Actions

| Action | Description |
|--------|-------------|
| `explain_question` | Explain a practice question (stem, rationale, correct answer) |
| `explain_highlight` | Explain highlighted text from study guides/rationales |
| `compare_concepts` | Compare and contrast similar conditions/concepts |
| `generate_flashcards` | Generate flashcards from content |
| `summarize_to_notebook` | Summarize content for notebook |
| `weak_area_coaching` | Coaching based on weak systems/domains |
| `quiz_followup` | Generate 5 follow-up practice questions |
| `generate_mnemonic` | Create mnemonic (simple, acronym, visual, story, compare/contrast) |

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (no API keys)                          │
├─────────────────────────────────────────────────────────────────┤
│  AITutorChat, AIPopover, HighlightableText                        │
│  → Server Actions (app/actions/ai.ts)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER                                        │
├─────────────────────────────────────────────────────────────────┤
│  runAIAction (orchestrator)                                       │
│  ├── validateInput (guardrails)                                   │
│  ├── checkUsageLimit (free vs paid)                               │
│  ├── retrieveChunks (retrieval service)                           │
│  ├── fillTemplate + getSystemPrompt                               │
│  └── OpenAI API (server-side only)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Retrieval: question rationales, study guides, flashcards,        │
│  topic summaries. Excludes draft/rejected/internal.               │
├─────────────────────────────────────────────────────────────────┤
│  Logging: ai_interaction_logs (audit trail)                       │
│  Saved outputs: ai_saved_outputs (notebook, flashcards)            │
└─────────────────────────────────────────────────────────────────┘
```

## API Design

### POST /api/ai

Request body (AIRequest):

```json
{
  "action": "explain_highlight",
  "track": "rn",
  "highlightedText": "CO2 narcosis in COPD",
  "contentRef": "study-guide-sec-1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "content": "CO2 narcosis occurs when...",
    "contentRefs": ["sg-1", "q-2"]
  }
}
```

### POST /api/ai/save

Save AI output to notebook or flashcards.

```json
{
  "type": "notebook",
  "content": "Summary text..."
}
```

or

```json
{
  "type": "flashcards",
  "flashcards": [{"front": "...", "back": "..."}]
}
```

## Retrieval Design

- **Sources**: question rationales, distractor explanations, study guides, topic summaries, flashcards, video transcripts
- **Filter**: Only `approved` or `published` status. Exclude draft, rejected, internal_review, legal_notes
- **Method**: Keyword retrieval (mock). Production: pgvector similarity search with embeddings

## Prompt Templates

Templates use `{{placeholders}}`:

- `{{track}}` - LVN/LPN, RN, FNP, PMHNP
- `{{retrievedContext}}` - RAG chunks
- `{{highlightedText}}`, `{{questionStem}}`, `{{rationale}}`, etc.

Location: `src/lib/ai/prompts/templates.ts`

## Mnemonic Engine

Five types:

1. **simple** - Short phrase or rhyme
2. **acronym** - Letters spell a word (e.g., MONA for MI)
3. **visual_hook** - Vivid mental image
4. **story** - Narrative to encode facts
5. **compare_contrast** - Contrast with similar concept

## Guardrails

- Max input length (10k general, 2k highlight)
- Block patterns: "prescribe me", "diagnose my patient", "medical advice"
- Fallback messages when AI fails

## Usage Controls

| Plan | Explain/day | Mnemonic/day | Flashcards/day | Coaching/day |
|------|-------------|--------------|----------------|--------------|
| Free | 5 | 3 | 2 | 1 |
| Paid | 50 | 20 | 15 | 5 |

## Logging Strategy

Every AI interaction logged to `ai_interaction_logs`:

- user_id, action, track
- prompt_tokens, completion_tokens, model
- content_refs (RAG sources)
- error (if failed)

## Saved Output Strategy

- **Notebook**: Insert into notes with `contentRef: "ai-tutor"`
- **Flashcards**: Insert into flashcards table, optionally link to `ai_saved_outputs` for audit

## Environment Variables

```bash
OPENAI_API_KEY=sk-...   # Server-only, never exposed to client
```

## Example Prompt Payloads

### Explain highlight

```
System: You are an expert nursing board-prep tutor...
User: The student highlighted: "CO2 narcosis in COPD"
Context: study-guide-sec-1
Platform context: [retrieved chunks]
Explain the highlighted concept...
```

### Generate mnemonic

```
User: Create a simple mnemonic for: Heart failure signs
Platform context: [retrieved chunks]
Mnemonic types: simple, acronym, visual_hook, story, compare_contrast
Provide one clear mnemonic...
```
