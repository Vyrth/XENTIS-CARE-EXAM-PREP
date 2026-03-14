/**
 * Scenario Diversification - Negative Constraints
 *
 * Builds prompt text to avoid repeating:
 * - same presenting complaint pattern
 * - nearly identical stem openings
 * - overused archetypes (e.g. middle-aged female abdominal pain)
 */

import type { GenerationMemory } from "./generation-memory";
import type { ScenarioArchetype } from "./archetypes";

const BASE_NEGATIVE_CONSTRAINTS = `NEGATIVE CONSTRAINTS — Do NOT:
- Repeat the same presenting complaint pattern (e.g. "presents with abdominal pain") across questions
- Reuse nearly identical stem openings (e.g. "A 54-year-old female presents with...")
- Generate only middle-aged female abdominal pain cases — vary demographics and chief complaints
- Default to "clinic" or "ED" — use telehealth, follow-up, inpatient, home health when appropriate
- Use the same clinical phase (e.g. all diagnosis) — mix assessment, management, prevention, patient education
- Focus only on pharmacology — include non-pharmacology and mixed-angle questions`;

/**
 * Build negative constraints block from generation memory.
 */
export function buildNegativeConstraints(memory: GenerationMemory): string {
  const parts: string[] = [BASE_NEGATIVE_CONSTRAINTS];

  if (memory.recentStemOpenings.length > 0) {
    const samples = memory.recentStemOpenings.slice(0, 5);
    parts.push(
      `\nAVOID these stem openings (already used recently):\n${samples.map((s) => `- "${s}..."`).join("\n")}`
    );
  }

  if (memory.recentComplaintPatterns.length > 0) {
    const samples = memory.recentComplaintPatterns.slice(0, 5);
    parts.push(
      `\nAVOID repeating these presenting complaint patterns:\n${samples.map((c) => `- "${c}"`).join("\n")}`
    );
  }

  const overusedArchetypes = detectOverusedArchetypes(memory.recentArchetypes);
  if (overusedArchetypes.length > 0) {
    parts.push(
      `\nThese archetypes are OVERUSED — use different combinations:\n${overusedArchetypes.map((a) => `- ${a}`).join("\n")}`
    );
  }

  return parts.join("\n\n");
}

/** Detect overused archetype combinations (e.g. >30% middle-aged female) */
function detectOverusedArchetypes(archetypes: ScenarioArchetype[]): string[] {
  if (archetypes.length < 5) return [];

  const counts: Record<string, number> = {};
  for (const a of archetypes) {
    const key = [a.age_band ?? "?", a.sex ?? "?", a.care_setting ?? "?"].join("|");
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const threshold = archetypes.length * 0.3;
  const overused: string[] = [];
  for (const [key, count] of Object.entries(counts)) {
    if (count >= threshold) {
      const [age, sex, setting] = key.split("|");
      overused.push(`${age} ${sex} in ${setting} (used ${count}x)`);
    }
  }
  return overused;
}
