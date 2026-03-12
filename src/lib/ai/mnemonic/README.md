# Mnemonic Generator API

Creates memorable mnemonics for board-focused nursing concepts. Supports LVN/LPN, RN, FNP, and PMHNP tracks with five mnemonic styles.

## Endpoint

```
POST /api/ai/mnemonic
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selectedText` | string | Yes | The concept text to create a mnemonic for (max 2000 chars) |
| `conceptTitle` | string | No | Optional title for the concept |
| `examTrack` | string | Yes | One of: `lvn`, `rn`, `fnp`, `pmhnp` |
| `topicId` | string | No | Topic ID for context |
| `systemId` | string | No | System ID for context |
| `sourceType` | string | No | e.g. `study_guide`, `rationale` |
| `sourceId` | string | No | Source content ID |
| `mnemonicStyle` | string | No | One of: `acronym`, `phrase`, `story`, `visual_hook`, `compare_contrast`. Default: `phrase` |

## Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `data` | object | Mnemonic response (see below) |
| `savePayload` | object | Structured payload for future notebook/flashcard save |
| `usage` | object | Token usage if available |

### MnemonicResponse

```ts
{
  conceptSummary: string;   // 2-3 sentence summary
  mnemonic: string;         // The mnemonic itself
  whyItWorks: string;      // Why this helps memory
  rapidRecallVersion: string;  // 1-2 phrases for last-minute review
  boardTip: string;        // Exam-focused tip
}
```

## Example Request

```json
{
  "selectedText": "MONA: Morphine, Oxygen, Nitroglycerin, Aspirin - first-line treatment for acute MI",
  "conceptTitle": "MONA for MI",
  "examTrack": "rn",
  "mnemonicStyle": "acronym",
  "sourceType": "study_guide",
  "sourceId": "sec-cardiac"
}
```

## Example Response

```json
{
  "success": true,
  "data": {
    "conceptSummary": "MONA is the standard first-line approach for acute myocardial infarction. Each component addresses a key aspect of MI management: pain relief, oxygenation, vasodilation, and antiplatelet therapy.",
    "mnemonic": "MONA: Morphine (pain), Oxygen (hypoxia), Nitroglycerin (vasodilation), Aspirin (antiplatelet). Remember: 'My Old Nurse Always' helps with MI.",
    "whyItWorks": "The acronym is universally taught and each letter maps to a specific intervention. The phrase 'My Old Nurse Always' reinforces the order.",
    "rapidRecallVersion": "MONA = Morphine, O2, Nitro, Aspirin. Pain, hypoxia, vasodilation, antiplatelet.",
    "boardTip": "Board questions often test the order of interventions or ask which drug to give first. Know that aspirin is often given first in the field; in-hospital MONA order may vary by protocol."
  },
  "savePayload": {
    "conceptSummary": "...",
    "mnemonic": "...",
    "whyItWorks": "...",
    "rapidRecallVersion": "...",
    "boardTip": "...",
    "conceptTitle": "MONA for MI",
    "mnemonicStyle": "acronym",
    "examTrack": "rn",
    "sourceType": "study_guide",
    "sourceId": "sec-cardiac"
  },
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 180
  }
}
```

## Frontend Integration (AIPopover)

To call this from the AIPopover "Make mnemonic" action:

1. **Option A: Replace explain-highlight mnemonic mode**  
   The existing "Make mnemonic" button in AIPopover currently calls `useExplainHighlight` with `mode: "mnemonic"`. You can instead call `/api/ai/mnemonic` for a richer, style-specific mnemonic.

2. **Option B: Add dedicated mnemonic flow**

```ts
// In your page/hook
const handleMnemonic = async () => {
  if (!selectedText) return;
  setLoading(true);
  try {
    const res = await fetch("/api/ai/mnemonic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedText,
        examTrack: track,  // from useTrack()
        mnemonicStyle: "phrase",  // or let user pick: acronym, story, etc.
        conceptTitle: optionalTitle,
        sourceType: "study_guide",  // or "rationale"
        sourceId: sectionId,        // or questionId
      }),
    });
    const json = await res.json();
    if (json.success) {
      setMnemonicData(json.data);
      setSavePayload(json.savePayload);  // for future notebook save
      openMnemonicPanel();
    }
  } finally {
    setLoading(false);
  }
};
```

3. **Display in panel**  
   Show `conceptSummary`, `mnemonic`, `whyItWorks`, `rapidRecallVersion`, and `boardTip` in a side panel or modal (similar to ExplainHighlightPanel).

4. **Save to notebook (future)**  
   Use `savePayload` when implementing notebook/flashcard save. The payload includes all fields needed to create a notebook entry or flashcard.

## Mnemonic Styles

| Style | Description |
|-------|-------------|
| `phrase` | Short phrase, rhyme, or catchy saying |
| `acronym` | Letters stand for key terms (e.g., MONA) |
| `story` | Brief narrative encoding key facts |
| `visual_hook` | Vivid mental image to recall |
| `compare_contrast` | Cue contrasting with similar concept |

## Track-Specific Behavior

- **LVN/LPN**: Very simple, foundational concepts
- **RN**: Safety, priorities, delegation, board traps
- **FNP**: Diagnosis, management, red flags, first-line thinking
- **PMHNP**: DSM distinctions, psychopharm, safety, therapeutic communication

## AIPopover Integration

The study guide and rationale pages use `useMnemonic` and `MnemonicPanel` when "Make mnemonic" is clicked. Flow:

1. User highlights text → AIPopover opens
2. User clicks "Make mnemonic" → `runMnemonic()` calls `generateMnemonic(selectedText, context)`
3. `useMnemonic` fetches `/api/ai/mnemonic` with `mnemonicStyle: "phrase"` (default)
4. `MnemonicPanel` displays conceptSummary, mnemonic, whyItWorks, rapidRecallVersion, boardTip

To add a style picker, pass `mnemonicStyle` to `generateMnemonic()` using `MNEMONIC_STYLES` from `@/lib/ai/mnemonic-engine`.
