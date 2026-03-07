# AI API Test

Minimal integration for testing the AI backend. Uses `OPENAI_API_KEY` server-side only.

## Endpoints

### 1. Health Check

**GET** `/api/ai/health`

Verifies OpenAI is configured and reachable.

**Response (200 OK):**
```json
{
  "status": "ok",
  "configured": true,
  "message": "OpenAI API reachable"
}
```

**Response (503 Unconfigured):**
```json
{
  "status": "unconfigured",
  "message": "OPENAI_API_KEY is not set",
  "configured": false
}
```

### 2. Test Endpoint

**POST** `/api/ai/test`

Accepts a prompt and returns a short AI-generated response.

**Request:**
```json
{
  "prompt": "What is the normal ejection fraction for the heart?"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "response": "The normal ejection fraction is typically 55-70%. Values below 40% indicate systolic heart failure.",
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 42
  }
}
```

**Error responses:**

| Status | Code | Body |
|--------|------|------|
| 400 | BAD_REQUEST | `{ "error": "Missing or empty prompt", "code": "BAD_REQUEST" }` |
| 400 | BAD_REQUEST | `{ "error": "Invalid JSON", "code": "BAD_REQUEST" }` |
| 503 | MISSING_API_KEY | `{ "error": "AI service not configured", "code": "MISSING_API_KEY" }` |
| 500 | OPENAI_ERROR | `{ "error": "AI request failed", "code": "OPENAI_ERROR", "details": "..." }` |

## Local Testing

1. **Set the API key** in `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Test health**:
   ```bash
   curl http://localhost:3000/api/ai/health
   ```

4. **Test prompt**:
   ```bash
   curl -X POST http://localhost:3000/api/ai/test \
     -H "Content-Type: application/json" \
     -d '{"prompt": "What is BNP in heart failure?"}'
   ```

5. **Without API key** (expect 503):
   ```bash
   # Temporarily remove OPENAI_API_KEY from .env.local
   curl http://localhost:3000/api/ai/health
   ```

## Architecture

- **`lib/ai/openai-client.ts`** — Shared client; singleton, server-side only
- **`lib/ai/types.ts`** — Request/response interfaces, TutorMode, TutorParams
- **`lib/ai/prompt-builder.ts`** — Builds prompts per tutor mode; RAG-ready
- **`lib/ai/ai-orchestrator.ts`** — `sendPrompt()` (generic), `runTutorMode()` (tutor flows)
- **`api/ai/health`** — Health check
- **`api/ai/test`** — Uses `sendPrompt()` from ai-orchestrator

### Example: Tutor mode from server code

```ts
import { runTutorMode } from "@/lib/ai/ai-orchestrator";

const result = await runTutorMode("explain_highlight", {
  track: "rn",
  highlightedText: "CO2 narcosis in COPD",
  contentRef: "study-guide-sec-1",
  // retrievedContext: "..." — inject when RAG is integrated
});

if (result.success) {
  console.log(result.data.content);
}
```

## Security

- API key is read from `process.env.OPENAI_API_KEY` only
- Never logged or sent to the client
- All AI logic runs server-side
