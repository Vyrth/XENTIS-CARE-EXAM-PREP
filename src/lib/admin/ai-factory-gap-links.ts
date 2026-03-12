/**
 * AI Content Factory - gap-to-generation links.
 * Build URLs for one-click jump from coverage gaps to prefilled generation forms.
 */

export type AIFactoryTab = "questions" | "study-guides" | "flashcards" | "high-yield" | "batch";

export interface AIFactoryPrefillParams {
  tab: AIFactoryTab;
  trackId: string;
  systemId?: string;
  topicId?: string;
  domainId?: string;
}

/** Build AI factory URL with prefill params for gap-to-generation workflow */
export function buildAIFactoryUrl(params: AIFactoryPrefillParams): string {
  const search = new URLSearchParams();
  search.set("tab", params.tab);
  search.set("trackId", params.trackId);
  if (params.systemId) search.set("systemId", params.systemId);
  if (params.topicId) search.set("topicId", params.topicId);
  if (params.domainId) search.set("domainId", params.domainId);
  return `/admin/ai-factory?${search.toString()}`;
}

/** Generate links for a low-coverage system: Questions, Guide, Flashcards, High-Yield */
export function buildSystemGapLinks(trackId: string, systemId: string, topicId?: string, domainId?: string) {
  return {
    questions: buildAIFactoryUrl({ tab: "questions", trackId, systemId, topicId, domainId }),
    guide: buildAIFactoryUrl({ tab: "study-guides", trackId, systemId, topicId, domainId }),
    flashcards: buildAIFactoryUrl({ tab: "flashcards", trackId, systemId, topicId, domainId }),
    highYield: buildAIFactoryUrl({ tab: "high-yield", trackId, systemId, topicId, domainId }),
  };
}

/** Generate links for track-level only (e.g. blocked launch readiness) */
export function buildTrackGapLinks(trackId: string) {
  return {
    questions: buildAIFactoryUrl({ tab: "questions", trackId }),
    guide: buildAIFactoryUrl({ tab: "study-guides", trackId }),
    flashcards: buildAIFactoryUrl({ tab: "flashcards", trackId }),
    highYield: buildAIFactoryUrl({ tab: "high-yield", trackId }),
  };
}
