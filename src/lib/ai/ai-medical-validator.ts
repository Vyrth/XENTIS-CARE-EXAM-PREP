/**
 * AI Medical Validator
 *
 * Validates AI-generated questions before auto-publish:
 * - Answer correctness
 * - Guideline reference validity
 * - Plausible distractors
 * - Reject unsafe medical advice
 *
 * Returns pass/fail + confidence. Low confidence or failures route to human review.
 */

import { getOpenAIClient } from "@/lib/ai/openai-client";

export interface MedicalValidationInput {
  stem: string;
  options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
  rationale: string;
  primaryReference?: string;
  guidelineReference?: string;
  system?: string;
  topic?: string;
}

export interface MedicalValidationResult {
  passed: boolean;
  confidence: number; // 0-1
  errors: string[];
  warnings: string[];
  /** When true, question must go to human review */
  requiresHumanReview: boolean;
}

const VALIDATION_SYSTEM = `You are a medical education quality validator. Your job is to validate nursing/board exam questions for:
1. **Answer correctness** - The correct option must be medically accurate per current guidelines.
2. **Guideline references** - primary_reference and guideline_reference should be real, established sources (e.g. ncsbn_nclex, aha_guidelines, dsm5tr).
3. **Plausible distractors** - Wrong options must be clinically plausible (common mistakes) but clearly incorrect.
4. **Unsafe advice** - REJECT any question that could lead to harmful clinical decisions, outdated practices, or dangerous recommendations.

Respond with ONLY valid JSON in this exact format:
{
  "passed": true|false,
  "confidence": 0.0-1.0,
  "errors": ["error1", "error2"],
  "warnings": ["warning1"],
  "requiresHumanReview": true|false
}

Rules:
- passed=false if: wrong answer, unsafe advice, fake references, or distractors that are obviously wrong (not plausible).
- requiresHumanReview=true if: confidence < 0.85, borderline correctness, or any warning about guideline currency.
- Be strict on safety. When in doubt, requiresHumanReview=true.`;

function buildValidationPrompt(input: MedicalValidationInput): string {
  const optionsStr = input.options
    .map((o) => `  ${o.key}: ${o.text}${o.isCorrect ? " [CORRECT]" : ""}${o.distractorRationale ? ` (why wrong: ${o.distractorRationale})` : ""}`)
    .join("\n");
  return `Validate this question:

**Stem:** ${input.stem}

**Options:**
${optionsStr}

**Rationale:** ${input.rationale}

**References:** primary=${input.primaryReference ?? "none"}, guideline=${input.guidelineReference ?? "none"}
**Context:** system=${input.system ?? "—"}, topic=${input.topic ?? "—"}

Respond with ONLY the JSON object (no other text).`;
}

function parseValidationResponse(raw: string): MedicalValidationResult | null {
  try {
    const trimmed = raw.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const passed = Boolean(obj.passed);
    const confidence = Math.max(0, Math.min(1, Number(obj.confidence ?? 0.5)));
    const errors = Array.isArray(obj.errors) ? obj.errors.map(String) : [];
    const warnings = Array.isArray(obj.warnings) ? obj.warnings.map(String) : [];
    const requiresHumanReview = Boolean(obj.requiresHumanReview ?? (!passed || confidence < 0.85));
    return {
      passed,
      confidence,
      errors,
      warnings,
      requiresHumanReview: requiresHumanReview || !passed || confidence < 0.85,
    };
  } catch {
    return null;
  }
}

/**
 * Run AI medical validation on a question draft.
 * Returns validation result; when API unavailable, returns requiresHumanReview=true.
 */
export async function validateQuestionMedically(
  input: MedicalValidationInput
): Promise<MedicalValidationResult> {
  const client = getOpenAIClient();
  if (!client) {
    return {
      passed: false,
      confidence: 0,
      errors: ["OpenAI not configured"],
      warnings: [],
      requiresHumanReview: true,
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: VALIDATION_SYSTEM },
        { role: "user", content: buildValidationPrompt(input) },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return {
        passed: false,
        confidence: 0,
        errors: ["Empty validation response"],
        warnings: [],
        requiresHumanReview: true,
      };
    }
    const result = parseValidationResponse(content);
    if (result) return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai-medical-validator] validation failed:", msg);
    }
    return {
      passed: false,
      confidence: 0,
      errors: [`Validation failed: ${msg}`],
      warnings: [],
      requiresHumanReview: true,
    };
  }

  return {
    passed: false,
    confidence: 0,
    errors: ["Invalid validation response"],
    warnings: [],
    requiresHumanReview: true,
  };
}
