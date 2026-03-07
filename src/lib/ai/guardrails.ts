/**
 * Guardrails and safe failure modes
 */

const MAX_INPUT_CHARS = 10000;
const MAX_HIGHLIGHT_CHARS = 2000;
const BLOCKED_PATTERNS = [
  /prescribe\s+(me|patient)/i,
  /what\s+(medication|drug|dose)\s+should\s+i\s+give/i,
  /diagnose\s+(my|this)\s+patient/i,
  /medical\s+advice/i,
  /treat\s+(my|this)\s+patient/i,
];

/** Validate input length and block medical advice requests */
export function validateInput(
  input: string,
  context: "general" | "highlight" | "notebook"
): { valid: boolean; error?: string } {
  const max = context === "highlight" ? MAX_HIGHLIGHT_CHARS : MAX_INPUT_CHARS;
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Empty input" };
  }
  if (input.length > max) {
    return { valid: false, error: `Input too long (max ${max} chars)` };
  }
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(input)) {
      return {
        valid: false,
        error: "I can't provide specific medical advice, diagnoses, or treatment recommendations. This tool is for exam prep education only.",
      };
    }
  }
  return { valid: true };
}

/** Safe fallback when AI fails */
export const FALLBACK_MESSAGES: Record<string, string> = {
  explain_question: "I couldn't generate an explanation right now. Please try again or review the rationale provided with the question.",
  explain_highlight: "I couldn't explain that text right now. Please try again.",
  compare_concepts: "I couldn't compare those concepts right now. Please try again.",
  generate_flashcards: "I couldn't generate flashcards right now. Please try again.",
  summarize_to_notebook: "I couldn't summarize that content right now. Please try again.",
  weak_area_coaching: "I couldn't generate coaching right now. Please try again or check your weak areas in the dashboard.",
  quiz_followup: "I couldn't generate quiz questions right now. Please try again.",
  generate_mnemonic: "I couldn't create a mnemonic right now. Please try again.",
};
