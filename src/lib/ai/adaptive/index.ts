/**
 * Adaptive AI module - prompt injection and response formatting.
 * Personalizes AI behavior based on learner readiness analytics.
 */

export {
  injectAdaptiveSystemPrompt,
  injectAdaptiveUserContext,
  appendAdaptiveNextStepInstruction,
} from "./prompt-injection";
export {
  formatResponseWithRemediation,
  type FormattedResponseWithRemediation,
} from "./response-formatter";
export type { AdaptiveContextInput, AdaptiveContextOutput, AnalyticsPayload } from "@/lib/readiness/adaptive-context";
export { buildAdaptiveContext, analyticsToAdaptiveInput } from "@/lib/readiness/adaptive-context";
