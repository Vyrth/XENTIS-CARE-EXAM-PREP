/**
 * Prompt templates with {{placeholders}}
 */

export const PROMPT_TEMPLATES = {
  explain_question: `Explain this practice question to help the student understand why the correct answer is right and why distractors are wrong.

Question stem:
{{questionStem}}

Correct answer: {{correctAnswer}}
Rationale: {{rationale}}

Platform context (use to enrich your explanation):
{{retrievedContext}}

Provide a clear, educational explanation. If the student is preparing for {{track}}, tailor your explanation to that exam.`,

  explain_highlight: `The student highlighted this text and wants an explanation:

"{{highlightedText}}"

Context: {{contentRef}}

Platform context (prioritize this):
{{retrievedContext}}

Explain the highlighted concept clearly. Use the platform content first. If the context doesn't fully cover it, you may add general nursing knowledge but note when you're supplementing.`,

  compare_concepts: `Compare and contrast these concepts for board exam prep:

Concepts: {{concepts}}

Platform context:
{{retrievedContext}}

Provide a clear comparison table or structured breakdown. Highlight key differences that commonly appear on exams.`,

  generate_flashcards: `Create {{count}} flashcards from this content. Format as JSON array: [{"front": "...", "back": "..."}]

Content:
{{content}}

Platform context for accuracy:
{{retrievedContext}}

Make flashcards concise, exam-relevant, and accurate. Base on platform content when possible.`,

  summarize_to_notebook: `Summarize this notebook content into a concise study note. The student will save it to their notebook.

Content:
{{notebookContent}}

Platform context:
{{retrievedContext}}

Produce a clear, organized summary suitable for quick review. Use bullet points where helpful.`,

  weak_area_coaching: `The student needs coaching on these weak areas for {{track}} exam prep:

Weak systems: {{weakSystems}}
Weak domains: {{weakDomains}}

Platform context:
{{retrievedContext}}

Provide:
1. A brief assessment of what to focus on
2. 3-5 specific study recommendations
3. Suggested practice approach

Be encouraging and actionable.`,

  quiz_followup: `Generate 5 follow-up practice questions based on this content. Format as JSON array:
[{"stem": "...", "options": ["A...", "B...", "C...", "D..."], "correctKey": "A"}]

Content:
{{content}}

Platform context for accuracy:
{{retrievedContext}}

Make questions NCLEX-style: single best answer, clinical scenario. Ensure correct answers align with platform content.`,

  generate_mnemonic: `Create a {{mnemonicType}} mnemonic for: {{topic}}

Platform context:
{{retrievedContext}}

Mnemonic types:
- simple: Short phrase or rhyme
- acronym: Letters that spell a word (e.g., MONA for MI)
- visual_hook: Describe a vivid mental image
- story: Short narrative to remember
- compare_contrast: Memory cue that contrasts with similar concept

Provide one clear mnemonic. Make it memorable and accurate.`,
} as const;

export function fillTemplate(
  templateKey: keyof typeof PROMPT_TEMPLATES,
  vars: Record<string, string>
): string {
  let t: string = PROMPT_TEMPLATES[templateKey];
  for (const [k, v] of Object.entries(vars)) {
    t = t.replace(new RegExp(`{{${k}}}`, "g"), v ?? "");
  }
  return t;
}
