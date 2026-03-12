# Generate Flashcards API

Generates high-quality, board-focused flashcards from selected content, notebook entries, study guides, rationales, and AI summaries.

## Endpoint

```
POST /api/ai/generate-flashcards
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceText` | string | Yes | Content to generate flashcards from (max 10000 chars) |
| `examTrack` | string | Yes | One of: `lvn`, `rn`, `fnp`, `pmhnp` |
| `topicId` | string | No | Topic ID for context |
| `systemId` | string | No | System ID for context |
| `sourceType` | string | No | e.g. `study_guide`, `rationale`, `notebook`, `ai_summary`, `highlight` |
| `sourceId` | string | No | Source content ID |
| `numberOfCards` | number | No | 1-20, default 5 |
| `flashcardMode` | string | No | One of: `standard`, `high_yield`, `rapid_recall`, `compare_contrast`, `pharm_focus`. Default: `standard` |

## Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `data` | object | `{ flashcards: GeneratedFlashcard[] }` |
| `savePayload` | object | Save-ready payload for ai_saved_outputs |
| `usage` | object | Token usage if available |

### GeneratedFlashcard

```ts
{
  front_text: string;
  back_text: string;
  hint_text?: string;
  memory_trick?: string;
  difficulty_level?: "easy" | "medium" | "hard";
}
```

## Example Request

```json
{
  "sourceText": "MONA for acute MI: Morphine (pain), Oxygen (hypoxia), Nitroglycerin (vasodilation), Aspirin (antiplatelet). Nitro contraindicated in right-sided MI. Aspirin given first in field.",
  "examTrack": "rn",
  "numberOfCards": 5,
  "flashcardMode": "high_yield",
  "sourceType": "study_guide",
  "sourceId": "sec-cardiac"
}
```

## Example Response

```json
{
  "success": true,
  "data": {
    "flashcards": [
      {
        "front_text": "What does MONA stand for in MI management?",
        "back_text": "Morphine, Oxygen, Nitroglycerin, Aspirin",
        "hint_text": "First-line MI drugs",
        "memory_trick": "My Old Nurse Always",
        "difficulty_level": "medium"
      },
      {
        "front_text": "Nitroglycerin is contraindicated in which type of MI?",
        "back_text": "Right-sided (inferior) MI - risk of profound hypotension",
        "difficulty_level": "hard"
      }
    ]
  },
  "savePayload": {
    "outputType": "flashcard_set",
    "flashcards": [...],
    "flashcardMode": "high_yield",
    "examTrack": "rn",
    "sourceType": "study_guide",
    "sourceId": "sec-cardiac"
  },
  "usage": {
    "prompt_tokens": 320,
    "completion_tokens": 450
  }
}
```

## Saving to ai_saved_outputs

```ts
await supabase.from("ai_saved_outputs").insert({
  user_id: userId,
  output_type: "flashcard_set",
  source_content_type: savePayload.sourceType,
  source_content_id: savePayload.sourceId,
  source_highlight_text: null,
  output_data: savePayload,
});
```

## Persisting to flashcard_decks / flashcards (Later)

When implementing full persistence:

1. **Create deck** in `flashcard_decks`:
   - `exam_track_id`: resolve from `examTrack` slug
   - `system_id`: from `savePayload.systemId` if present
   - `topic_id`: from `savePayload.topicId` if present
   - `name`: e.g. "AI Generated - [source type]"
   - `source`: `'ai'`
   - `user_id`: current user (for user-owned decks)

2. **Insert cards** into `flashcards`:
   - `flashcard_deck_id`: from step 1
   - `front_text`: card.front_text
   - `back_text`: card.back_text
   - `metadata`: `{ hint_text?, memory_trick?, difficulty_level? }`
   - `display_order`: index

3. **Link** `ai_saved_outputs` to the deck (e.g. store `flashcard_deck_id` in output_data or a separate link table) for audit.

## Flashcard Modes

| Mode | Description |
|------|-------------|
| `standard` | Balanced mix of definition, application, recall |
| `high_yield` | Only high-yield facts for board exams |
| `rapid_recall` | Short, punchy cards for quick review |
| `compare_contrast` | Cards contrasting similar concepts |
| `pharm_focus` | Pharmacology: drugs, indications, contraindications |

## Validation Rules

- One fact or one distinction per card
- No vague or multi-part cards
- Include compare/contrast when content warrants
- Front: concise question. Back: clear answer
