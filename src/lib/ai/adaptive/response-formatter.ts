/**
 * Readiness-aware response formatter.
 * Can append remediation suggestions or format responses by learner profile.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";

export interface FormattedResponseWithRemediation<T> {
  data: T;
  remediationSuggestions?: string[];
  learnerProfile?: AdaptiveContextOutput["learnerProfile"];
}

/** Wrap AI response with saveable remediation suggestions */
export function formatResponseWithRemediation<T>(
  data: T,
  adaptive: AdaptiveContextOutput | null
): FormattedResponseWithRemediation<T> {
  if (!adaptive) return { data };

  return {
    data,
    ...(adaptive.remediationSuggestions?.length && {
      remediationSuggestions: adaptive.remediationSuggestions,
    }),
    learnerProfile: adaptive.learnerProfile,
  };
}
