/**
 * AI Content Factory loaders - taxonomy for generation config
 */

import { loadExamTracks } from "./loaders";
import {
  loadAllSystemsForAdmin,
  loadAllTopicsForAdmin,
  loadDomainsAdmin,
  loadQuestionTypesAdmin,
} from "./question-studio-loaders";

export interface AIFactoryPageData {
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId: string }[];
  topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  domains: { id: string; slug: string; name: string }[];
  questionTypes: { id: string; slug: string; name: string }[];
}

export async function loadAIFactoryPageData(): Promise<AIFactoryPageData> {
  const [tracks, systems, topics, domains, questionTypes] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadDomainsAdmin(),
    loadQuestionTypesAdmin(),
  ]);

  return {
    tracks: tracks.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
    systems: systems.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      examTrackId: s.examTrackId,
    })),
    topics: topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      domainId: t.domainId,
      systemIds: t.systemIds,
    })),
    domains: domains.map((d) => ({ id: d.id, slug: d.slug, name: d.name })),
    questionTypes: questionTypes.map((qt) => ({ id: qt.id, slug: qt.slug, name: qt.name })),
  };
}
