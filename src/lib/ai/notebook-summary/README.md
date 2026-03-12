# Notebook Summary API

Converts messy notes or highlighted study content into clean, board-focused summaries. Reusable for manual notebook entries, highlighted text, AI explanations, and video transcript clips.

## Endpoint

```
POST /api/ai/notebook-summary
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `noteText` | string | Yes | The notes or content to summarize (max 10000 chars) |
| `examTrack` | string | Yes | One of: `lvn`, `rn`, `fnp`, `pmhnp` |
| `topicId` | string | No | Topic ID for context |
| `systemId` | string | No | System ID for context |
| `sourceType` | string | No | e.g. `manual_note`, `highlight`, `ai_explanation`, `video_transcript` |
| `sourceId` | string | No | Source content ID |
| `summaryMode` | string | No | One of: `clean_summary`, `high_yield`, `study_outline`, `plain_language`, `board_focus`. Default: `clean_summary` |

## Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `data` | object | NotebookSummaryResponse (see below) |
| `savePayload` | object | Save-ready payload for user_notes or ai_saved_outputs |
| `usage` | object | Token usage if available |

### NotebookSummaryResponse

```ts
{
  cleanedSummary: string;      // Main organized summary
  keyTakeaways: string;        // 3-5 bullet points
  highYieldFacts: string;      // Board-relevant facts
  commonConfusion: string;     // Confusion points / distractors
  boardTip: string;            // Exam-focused tip
  mnemonicSuggestion?: string; // Optional memory aid
}
```

## Example Request

```json
{
  "noteText": "MI drugs - morphine pain, O2 for hypoxia, nitro vasodilate, aspirin antiplatelet. MONA. Give aspirin first sometimes in field. Watch for hypotension with nitro.",
  "examTrack": "rn",
  "summaryMode": "board_focus",
  "sourceType": "manual_note",
  "sourceId": "note-abc123"
}
```

## Example Response

```json
{
  "success": true,
  "data": {
    "cleanedSummary": "MONA is the standard first-line approach for acute MI: Morphine (pain), Oxygen (hypoxia), Nitroglycerin (vasodilation), Aspirin (antiplatelet). Aspirin may be given first in the field; in-hospital order varies by protocol.",
    "keyTakeaways": "• MONA = Morphine, O2, Nitro, Aspirin\n• Each addresses a key MI management goal\n• Aspirin often first in prehospital setting\n• Monitor for hypotension with nitroglycerin",
    "highYieldFacts": "• Nitroglycerin is contraindicated in right-sided MI (risk of profound hypotension)\n• Aspirin reduces mortality and should be given ASAP\n• Morphine can mask symptoms—use judiciously",
    "commonConfusion": "Students often confuse the order of interventions. Know facility vs. field protocols. Nitro is avoided in inferior/right MI.",
    "boardTip": "Board questions test intervention order, contraindications (nitro in right MI), and delegation. Know RN scope for each drug.",
    "mnemonicSuggestion": "MONA: My Old Nurse Always (Morphine, Oxygen, Nitro, Aspirin) helps with MI."
  },
  "savePayload": {
    "outputType": "summary",
    "cleanedSummary": "...",
    "keyTakeaways": "...",
    "highYieldFacts": "...",
    "commonConfusion": "...",
    "boardTip": "...",
    "mnemonicSuggestion": "...",
    "summaryMode": "board_focus",
    "examTrack": "rn",
    "sourceType": "manual_note",
    "sourceId": "note-abc123"
  },
  "usage": {
    "prompt_tokens": 180,
    "completion_tokens": 220
  }
}
```

## Save-Ready Structure

### ai_saved_outputs

```ts
await supabase.from("ai_saved_outputs").insert({
  user_id: userId,
  output_type: "summary",
  source_content_type: savePayload.sourceType,
  source_content_id: savePayload.sourceId,
  source_highlight_text: null, // or original note text
  output_data: savePayload,
});
```

### user_notes (plain text)

Use `toPlainTextNote()` from `summary-formatter.ts` to convert the response to a single string for `note_text`:

```ts
import { toPlainTextNote } from "@/lib/ai/notebook-summary/summary-formatter";

const noteText = toPlainTextNote(response.data);
// Insert into user_notes with content_type, content_id
```

## Structured Note Sections Helper

```ts
import { toStructuredNoteSections } from "@/lib/ai/notebook-summary/summary-formatter";

const sections = toStructuredNoteSections(response.data);
// [{ type: "summary", title: "Summary", content: "..." }, ...]
```

Use for rendering sections in the UI or building custom save formats.

## Integrating with Notebook Page

The Notebook page uses `useNotebookSummary` and `NotebookSummaryPanel` when "Summarize (AI)" is clicked on a note.

### Flow

1. User clicks "Summarize (AI)" on a note → `handleSummarize(note.content)` calls `summarize(content, { sourceType: "manual_note" })`
2. `useNotebookSummary` fetches `/api/ai/notebook-summary`
3. `NotebookSummaryPanel` displays sections via `toStructuredNoteSections(data)`
4. User clicks "Save to notebook" → `toPlainTextNote(data)` is passed to `addNote()`

### Manual integration

```ts
import { useNotebookSummary } from "@/hooks/useNotebookSummary";
import { NotebookSummaryPanel } from "@/components/study/NotebookSummaryPanel";
import { toStructuredNoteSections, toPlainTextNote } from "@/lib/ai/notebook-summary/summary-formatter";

const { state, summarize, reset } = useNotebookSummary(track);

// On Summarize click:
summarize(noteText, { sourceType: "manual_note", sourceId: noteId });

// Display in panel; on save:
addNote(toPlainTextNote(state.data));
```

### Direct API call

```ts
const res = await fetch("/api/ai/notebook-summary", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    noteText: entry.noteText ?? highlightedText,
    examTrack: track,
    summaryMode: "clean_summary",
    sourceType: "manual_note", // or "highlight", "ai_explanation", "video_transcript"
    sourceId: entry.id,
  }),
});
const json = await res.json();
```

### Save options

- **user_notes**: Use `toPlainTextNote(json.data)` for `note_text`
- **ai_saved_outputs**: Insert `savePayload` as `output_data`

## Summary Modes

| Mode | Description |
|------|-------------|
| `clean_summary` | Clean up and organize; preserve key facts |
| `high_yield` | Extract high-yield facts for board exams |
| `study_outline` | Structured outline with headings/bullets |
| `plain_language` | Simplify jargon; accessible language |
| `board_focus` | Exam question types, traps, distractors |
