/**
 * Scenario Diversification - Build context for content factory
 *
 * Loads generation memory and builds diversificationContext for prompts.
 */

import { loadGenerationMemory, buildScopeKey } from "./generation-memory";
import { buildNegativeConstraints } from "./negative-constraints";
import { DIVERSITY_DIMENSIONS } from "@/lib/ai/prompts/question-prompts";

export interface DiversificationScope {
  trackId: string;
  systemId?: string | null;
  topicId?: string | null;
}

/**
 * Build diversification context for content factory request.
 * Includes diversity dimensions + negative constraints from memory.
 */
export async function buildDiversificationContext(
  scope: DiversificationScope
): Promise<string> {
  const scopeKey = buildScopeKey(scope.trackId, scope.systemId, scope.topicId);
  const memory = await loadGenerationMemory(scopeKey);
  const negativeConstraints = buildNegativeConstraints(memory);
  return `${DIVERSITY_DIMENSIONS}\n\n${negativeConstraints}`;
}
