/**
 * Question Factory - board-style question generation for AI Content Factory.
 *
 * Usage:
 *   import { generateQuestion } from "@/lib/ai/question-factory";
 *   const result = await generateQuestion({ track: "rn", itemType: "single_best_answer", ... });
 */

export * from "./types";
export * from "./validation";
export * from "./normalizer";
export * from "./parser";
export * from "./completion";
export { buildQuestionPrompt } from "../prompts/question-prompts";
