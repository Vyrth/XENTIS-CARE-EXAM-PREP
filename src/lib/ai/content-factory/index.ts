/**
 * Jade Tutor Content Factory - unified server-side generation service.
 *
 * Usage:
 *   import { generateContent } from "@/lib/ai/content-factory";
 *   const result = await generateContent({
 *     track: "rn",
 *     contentMode: "question",
 *     system: "Cardiovascular",
 *     topic: "Heart Failure",
 *     difficulty: 3,
 *   });
 */

export * from "./types";
export * from "./prompts";
export * from "./parsers";
export * from "./adapter";
export { generateContent } from "./orchestrator";
