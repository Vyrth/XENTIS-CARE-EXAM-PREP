/**
 * Pilot Generation - load sample topics per track for first live production test.
 * Prioritizes track-appropriate systems: PMHNP→psychiatric, RN→NCLEX core, FNP→primary care, LVN→fundamentals.
 */

import { loadAllSystemsForAdmin, loadAllTopicsForAdmin } from "./question-studio-loaders";

/** System slugs to prioritize per track for pilot */
const TRACK_SYSTEM_PRIORITY: Record<string, string[]> = {
  rn: ["cardiovascular", "respiratory", "renal", "psychiatric"],
  fnp: ["cardiovascular", "respiratory", "psychiatric"],
  pmhnp: ["psychiatric", "neurological"],
  lvn: ["cardiovascular", "respiratory", "renal"],
};

export interface PilotTopicOption {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  systemSlug: string;
}

export interface PilotTrackOptions {
  trackId: string;
  trackSlug: string;
  trackName: string;
  topics: PilotTopicOption[];
}

export async function loadPilotTopicOptions(): Promise<PilotTrackOptions[]> {
  const [allTopics, allSystems] = await Promise.all([
    loadAllTopicsForAdmin(),
    loadAllSystemsForAdmin(),
  ]);

  if (!allSystems.length) {
    const { loadExamTracks } = await import("./loaders");
    const tracks = await loadExamTracks();
    return tracks.map((t) => ({
      trackId: t.id,
      trackSlug: t.slug,
      trackName: t.name,
      topics: [],
    }));
  }

  const systemsByTrack = new Map<string, { id: string; slug: string; name: string }[]>();
  for (const s of allSystems) {
    const list = systemsByTrack.get(s.examTrackId) ?? [];
    list.push({ id: s.id, slug: s.slug, name: s.name });
    systemsByTrack.set(s.examTrackId, list);
  }

  const { loadExamTracks } = await import("./loaders");
  const tracks = await loadExamTracks();

  return tracks.map((track) => {
    const trackSystems = systemsByTrack.get(track.id) ?? [];
    const prioritySlugs = TRACK_SYSTEM_PRIORITY[track.slug] ?? ["cardiovascular", "respiratory"];
    const orderedSystems = [
      ...prioritySlugs
        .map((slug) => trackSystems.find((s) => s.slug === slug))
        .filter(Boolean) as { id: string; slug: string; name: string }[],
      ...trackSystems.filter((s) => !prioritySlugs.includes(s.slug)),
    ];
    const systemIds = new Set(orderedSystems.map((s) => s.id));
    const systemMap = new Map(orderedSystems.map((s) => [s.id, s]));

    const filteredTopics = allTopics
      .filter((t) => t.systemIds?.some((sid) => systemIds.has(sid)))
      .map((t) => {
        const systemId = t.systemIds?.find((sid) => systemIds.has(sid)) ?? t.systemIds?.[0];
        const sys = systemId ? systemMap.get(systemId) : undefined;
        return {
          id: t.id,
          name: t.name,
          systemId: systemId ?? "",
          systemName: sys?.name ?? "",
          systemSlug: sys?.slug ?? "",
        };
      })
      .filter((t) => t.systemId);

    return {
      trackId: track.id,
      trackSlug: track.slug,
      trackName: track.name,
      topics: filteredTopics,
    };
  });
}
