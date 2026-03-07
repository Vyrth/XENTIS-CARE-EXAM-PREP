# AI Tutor Example Prompt Payloads

## 1. Explain Question

**Request:**
```json
{
  "action": "explain_question",
  "track": "rn",
  "questionStem": "A 65-year-old patient with hypertension presents with chest pain...",
  "rationale": "ECG within 10 min drives STEMI identification...",
  "correctAnswer": "B"
}
```

**System prompt:** Board-prep tutor for RN exam. Base answers on platform content...

**User prompt:** Explain this practice question... Question stem: [stem]. Correct answer: B. Rationale: [rationale]. Platform context: [retrieved chunks].

---

## 2. Explain Highlighted Text

**Request:**
```json
{
  "action": "explain_highlight",
  "track": "rn",
  "highlightedText": "CO2 narcosis in COPD patients",
  "contentRef": "study-guide-sec-1"
}
```

**User prompt:** The student highlighted: "CO2 narcosis in COPD patients". Context: study-guide-sec-1. Platform context: [retrieved chunks]. Explain the highlighted concept...

---

## 3. Compare Concepts

**Request:**
```json
{
  "action": "compare_concepts",
  "track": "rn",
  "concepts": ["Heart failure", "Cardiogenic shock"]
}
```

**User prompt:** Compare and contrast: Heart failure, Cardiogenic shock. Platform context: [retrieved chunks]. Provide a clear comparison table...

---

## 4. Generate Flashcards

**Request:**
```json
{
  "action": "generate_flashcards",
  "track": "rn",
  "notebookContent": "Heart failure: S3 gallop = volume overload. BNP elevated. GDMT: ACE-I, beta-blocker, MRA, SGLT2i."
}
```

**User prompt:** Create 5 flashcards from this content. Format as JSON: [{"front":"...","back":"..."}]. Content: [content]. Platform context: [retrieved chunks].

---

## 5. Summarize to Notebook

**Request:**
```json
{
  "action": "summarize_to_notebook",
  "track": "rn",
  "notebookContent": "Long note about heart failure pharmacology..."
}
```

**User prompt:** Summarize this notebook content into a concise study note...

---

## 6. Weak-Area Coaching

**Request:**
```json
{
  "action": "weak_area_coaching",
  "track": "rn",
  "weakSystems": ["Cardiovascular", "Renal"],
  "weakDomains": ["Safe and Effective Care"]
}
```

**User prompt:** The student needs coaching on: Weak systems: Cardiovascular, Renal. Weak domains: Safe and Effective Care. Provide: 1) Brief assessment, 2) 3-5 study recommendations, 3) Suggested practice approach.

---

## 7. Quiz Follow-up (5 Questions)

**Request:**
```json
{
  "action": "quiz_followup",
  "track": "rn",
  "notebookContent": "Heart failure signs and management..."
}
```

**User prompt:** Generate 5 follow-up practice questions. Format as JSON: [{"stem":"...","options":["A...","B...","C...","D..."],"correctKey":"A"}]...

---

## 8. Generate Mnemonic

**Request:**
```json
{
  "action": "generate_mnemonic",
  "track": "rn",
  "topic": "Heart failure signs",
  "mnemonicType": "acronym"
}
```

**Mnemonic types:** simple, acronym, visual_hook, story, compare_contrast

**User prompt:** Create an acronym mnemonic for: Heart failure signs. Platform context: [retrieved chunks]. Provide one clear mnemonic.
