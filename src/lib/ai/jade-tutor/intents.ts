/**
 * Jade Tutor Intent Detection
 *
 * Classifies user messages into actionable intents.
 * Used to route to appropriate handler (tutoring vs content generation).
 */

export type JadeIntent =
  | "explain_concept"
  | "generate_questions"
  | "generate_flashcards"
  | "create_mnemonic"
  | "quiz_followup"
  | "high_yield_review"
  | "remediation"
  | "compare_concepts"
  | "general";

/** Keywords that strongly indicate each intent */
const INTENT_PATTERNS: Record<JadeIntent, RegExp[]> = {
  explain_concept: [
    /\b(explain|what is|how does|why does|tell me about|describe|clarify|elaborate)\b/i,
    /\b(meaning of|definition of|understand)\b/i,
  ],
  generate_questions: [
    /\b(generate|create|make|give me|write)\s+(me\s+)?(\d+\s+)?(practice\s+)?(exam\s+)?questions?\b/i,
    /\b(\d+)\s+(practice\s+)?(exam\s+)?questions?\b/i,
    /\bquestions?\s+(on|about|for)\b/i,
    /\bquiz\s+me\s+(on|about)\b/i,
    /\b(questions?|practice)\s+(on|about)\s+/i,
    /\b(give me|I need)\s+(\d+)\s+exam\s+questions?\b/i,
    /\b(\d+)\s+exam\s+questions?\b/i,
  ],
  generate_flashcards: [
    /\b(flashcards?|flash cards?)\b/i,
    /\b(make|create|generate)\s+(me\s+)?(\d+\s+)?(flashcards?|cards?)\b/i,
    /\b(\d+)\s+flashcards?\b/i,
  ],
  create_mnemonic: [
    /\b(mnemonic|memory trick|acronym|remember)\b/i,
    /\b(help me remember|how to remember)\b/i,
  ],
  quiz_followup: [
    /\b(quiz me|test me|practice questions)\b/i,
    /\b(5|five)\s+questions?\b/i,
    /\b(follow[- ]?up\s+questions?)\b/i,
  ],
  high_yield_review: [
    /\b(high[- ]?yield|high yield|key points|must know|essential)\b/i,
    /\b(review|summary)\s+(of|for)\b/i,
  ],
  remediation: [
    /\b(weak|struggling|help with|improve|remediation)\b/i,
    /\b(don't understand|confused about)\b/i,
  ],
  compare_concepts: [
    /\b(compare|contrast|difference between|vs\.?|versus)\b/i,
    /\b(similarities|differences)\s+(between|of)\b/i,
  ],
  general: [],
};

/** Extract topic/system from message (simple heuristic) */
export function extractTopicFromMessage(msg: string): string | null {
  const m = msg.match(/\b(?:on|about|for)\s+([^.?!]+?)(?:\s+please|\s+thanks|$|\?)/i);
  if (m) return m[1].trim().slice(0, 100) || null;
  const m2 = msg.match(/\b(heart failure|cardiovascular|diabetes|hypertension|pharmacology|mental health|pediatrics|maternity|geriatrics|infection control|safety|delegation|prioritization|nephrotic syndrome|ACE inhibitors)\b/i);
  return m2 ? m2[1] : null;
}

/** Extract track from message when user specifies (e.g. "FNP exam questions") - returns null if not specified */
export function extractTrackFromMessage(msg: string): "lvn" | "rn" | "fnp" | "pmhnp" | null {
  const lower = msg.toLowerCase();
  if (/\b(fnp|fnp\s+exam)\b/i.test(lower)) return "fnp";
  if (/\b(pmhnp|pmhnp\s+exam)\b/i.test(lower)) return "pmhnp";
  if (/\b(lvn|lpn)\b/i.test(lower)) return "lvn";
  if (/\b(rn|nclex)\b/i.test(lower)) return "rn";
  return null;
}

/** Extract question count from message (default 5) */
export function extractQuestionCount(msg: string): number {
  const m = msg.match(/\b(\d+)\s+(questions?|practice|quiz)\b/i) ?? msg.match(/\b(give me|generate)\s+(\d+)\b/i);
  if (m) {
    const n = parseInt(m[1] ?? m[2], 10);
    if (n >= 1 && n <= 10) return n;
  }
  return 5;
}

/** Detect intent from user message */
export function detectIntent(message: string): JadeIntent {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return "general";

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [JadeIntent, RegExp[]][]) {
    if (intent === "general") continue;
    for (const p of patterns) {
      if (p.test(message)) return intent;
    }
  }

  return "general";
}
