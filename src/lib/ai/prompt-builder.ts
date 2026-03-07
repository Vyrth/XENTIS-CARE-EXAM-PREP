/**
 * Prompt builder - constructs system and user prompts for each tutor mode.
 * Server-only. Prepares for RAG: retrievedContext placeholder injected here.
 *
 * RAG integration: When retrieval is ready, call from ai-orchestrator like:
 *   const chunks = await retrieveChunks(query, { limit: 8 });
 *   const context = chunks.map(c => c.chunkText).join("\n\n---\n\n");
 *   params.retrievedContext = context;
 *   params.contentRefs = chunks.map(c => c.contentId);  // for response attribution
 */
import type {
  TutorMode,
  TutorParams,
  ExplainQuestionParams,
  ExplainHighlightParams,
  CompareConceptsParams,
  GenerateFlashcardsParams,
  SummarizeNoteParams,
  WeakAreaCoachParams,
  MnemonicGeneratorParams,
} from "./types";

const TRACK_NAMES: Record<string, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const DEFAULT_RETRIEVED_CONTEXT =
  "(No retrieval yet. RAG integration will inject relevant chunks from ai_chunks here.)";

function getBaseContext(params: { track: string; retrievedContext?: string }): string {
  return params.retrievedContext?.trim() || DEFAULT_RETRIEVED_CONTEXT;
}

/** Build system prompt for tutor mode */
const SYSTEM_PROMPTS: Record<TutorMode, string> = {
  explain_question: "You are a nursing board exam tutor. Explain concepts clearly for exam prep.",
  explain_highlight: "You are a nursing tutor. Explain highlighted text using platform content when available.",
  compare_concepts: "You are a nursing tutor. Compare concepts clearly for board exam prep.",
  generate_flashcards:
    "You are a nursing tutor. Create concise, exam-relevant flashcards. Output valid JSON when requested.",
  summarize_note: "You are a nursing tutor. Summarize content clearly for study notes.",
  weak_area_coach:
    "You are a nursing tutor. Provide actionable coaching for weak areas. Be encouraging.",
  mnemonic_generator:
    "You are a nursing tutor. Create memorable mnemonics for exam prep.",
};

/** Build user prompt for each mode */
export function buildPrompt(mode: TutorMode, params: TutorParams): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = SYSTEM_PROMPTS[mode];
  const ctx = getBaseContext(params);
  const trackName = TRACK_NAMES[params.track] ?? params.track;

  switch (mode) {
    case "explain_question": {
      const p = params as ExplainQuestionParams;
      const userPrompt = `Explain this practice question for {{track}} exam prep.

Question stem:
${p.questionStem}

Correct answer: ${p.correctAnswer}
Rationale: ${p.rationale}

Platform context (use to enrich your explanation):
${ctx}

Provide a clear, educational explanation.`.replace("{{track}}", trackName);
      return { systemPrompt, userPrompt };
    }

    case "explain_highlight": {
      const p = params as ExplainHighlightParams;
      const userPrompt = `The student highlighted this text and wants an explanation:

"${p.highlightedText}"

Context: ${p.contentRef ?? ""}

Platform context (prioritize this):
${ctx}

Explain the highlighted concept clearly. Use the platform content first.`;
      return { systemPrompt, userPrompt };
    }

    case "compare_concepts": {
      const p = params as CompareConceptsParams;
      const userPrompt = `Compare and contrast these concepts for board exam prep:

Concepts: ${p.concepts.join(", ")}

Platform context:
${ctx}

Provide a clear comparison table or structured breakdown.`;
      return { systemPrompt, userPrompt };
    }

    case "generate_flashcards": {
      const p = params as GenerateFlashcardsParams;
      const count = p.count ?? 5;
      const userPrompt = `Create ${count} flashcards from this content. Format as JSON array: [{"front": "...", "back": "..."}]

Content:
${p.content}

Platform context for accuracy:
${ctx}

Make flashcards concise, exam-relevant, and accurate.`;
      return { systemPrompt, userPrompt };
    }

    case "summarize_note": {
      const p = params as SummarizeNoteParams;
      const userPrompt = `Summarize this notebook content into a concise study note.

Content:
${p.notebookContent}

Platform context:
${ctx}

Produce a clear, organized summary suitable for quick review. Use bullet points where helpful.`;
      return { systemPrompt, userPrompt };
    }

    case "weak_area_coach": {
      const p = params as WeakAreaCoachParams;
      const userPrompt = `The student needs coaching on these weak areas for ${trackName} exam prep:

Weak systems: ${p.weakSystems.join(", ") || "None"}
Weak domains: ${p.weakDomains.join(", ") || "None"}

Platform context:
${ctx}

Provide:
1. A brief assessment of what to focus on
2. 3-5 specific study recommendations
3. Suggested practice approach

Be encouraging and actionable.`;
      return { systemPrompt, userPrompt };
    }

    case "mnemonic_generator": {
      const p = params as MnemonicGeneratorParams;
      const mnemonicType = p.mnemonicType ?? "simple";
      const userPrompt = `Create a ${mnemonicType} mnemonic for: ${p.topic}

Platform context:
${ctx}

Provide one clear mnemonic. Make it memorable and accurate.`;
      return { systemPrompt, userPrompt };
    }

    default:
      throw new Error(`Unknown tutor mode: ${mode}`);
  }
}
