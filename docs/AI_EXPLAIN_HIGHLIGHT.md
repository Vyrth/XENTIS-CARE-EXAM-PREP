# Explain Highlighted Text - API

Board-prep tutor for selected text. Returns structured explanation, board tip, mnemonic, and suggested next step.

## Endpoint

**POST** `/api/ai/explain-highlight`

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selectedText | string | Yes | The highlighted text to explain (max 2000 chars) |
| examTrack | string | Yes | `lvn` \| `rn` \| `fnp` \| `pmhnp` |
| topicId | string | No | Topic ID for context (future RAG) |
| systemId | string | No | System ID for context (future RAG) |
| sourceType | string | No | e.g. `study_section`, `topic_summary` |
| sourceId | string | No | Source content ID |
| mode | string | No | `explain_simple` \| `board_focus` \| `deep_dive` \| `mnemonic` (default: `explain_simple`) |

## Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "simpleExplanation": "CO2 narcosis occurs when...",
    "boardTip": "Common exam question: patient on high-flow O2 becomes drowsy...",
    "memoryTrick": "High O2 + COPD = Hypoxic drive suppressed → CO2 narcosis",
    "suggestedNextStep": "Practice 5 questions on oxygen therapy in COPD."
  },
  "usage": {
    "prompt_tokens": 180,
    "completion_tokens": 220
  }
}
```

**Errors:**
- 400: Validation error (missing/invalid selectedText, examTrack, mode)
- 500: AI request failed
- 503: AI service not configured

## Test Examples

### 1. Basic request (curl)

```bash
curl -X POST http://localhost:3000/api/ai/explain-highlight \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{
    "selectedText": "In COPD patients with chronic hypercapnia, high-flow oxygen can suppress the hypoxic drive to breathe.",
    "examTrack": "rn"
  }'
```

### 2. With mode and context

```bash
curl -X POST http://localhost:3000/api/ai/explain-highlight \
  -H "Content-Type: application/json" \
  -d '{
    "selectedText": "BNP level greater than 100 pg/mL suggests heart failure.",
    "examTrack": "rn",
    "mode": "mnemonic",
    "sourceType": "study_section",
    "sourceId": "sec-123"
  }'
```

### 3. Validation error (missing selectedText)

```bash
curl -X POST http://localhost:3000/api/ai/explain-highlight \
  -H "Content-Type: application/json" \
  -d '{"examTrack": "rn"}'
# Expect: 400, "selectedText is required and must be a string"
```

### 4. Invalid track

```bash
curl -X POST http://localhost:3000/api/ai/explain-highlight \
  -H "Content-Type: application/json" \
  -d '{"selectedText": "Test", "examTrack": "invalid"}'
# Expect: 400, "examTrack must be one of: lvn, rn, fnp, pmhnp"
```

## Modes

| Mode | Focus |
|------|-------|
| explain_simple | Concise, accessible explanation |
| board_focus | Exam patterns, common distractors |
| deep_dive | Pathophysiology, clinical relevance |
| mnemonic | Lead with mnemonic, then brief explanation |

## Logging

All requests are logged to `ai_interaction_logs` with:
- user_id (if authenticated)
- interaction_type: `explain_highlight`
- prompt_tokens, completion_tokens, model
- content_refs (sourceId when provided)

## Retrieval (Future)

When RAG is integrated, inject `retrievedContext` in the orchestrator:

```ts
const chunks = await retrieveChunks(selectedText, { limit: 8 });
const retrievedContext = chunks.map(c => c.chunkText).join("\n\n---\n\n");
const result = await runExplainHighlight(request, { retrievedContext });
```
