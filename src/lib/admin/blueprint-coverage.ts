/**
 * Blueprint Coverage Map - domain/system/topic coverage by track
 * Ensures each board track is systematically covered and gaps are visible.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type CoverageLevel = "none" | "low" | "adequate" | "strong";

export interface TopicCoverage {
  topicId: string;
  topicName: string;
  domainId?: string;
  domainName: string;
  questionCount: number;
  hasGuide: boolean;
  hasVideo: boolean;
  hasDeck: boolean;
  hasExamInclusion: boolean;
  coverageLevel: CoverageLevel;
}

export interface SystemCoverage {
  systemId: string;
  systemName: string;
  domainName: string;
  domainId: string;
  weightPct: number;
  questionCount: number;
  guideCount: number;
  videoCount: number;
  deckCount: number;
  hasSystemExam: boolean;
  topics: TopicCoverage[];
  coverageLevel: CoverageLevel;
}

export interface DomainCoverage {
  domainId: string;
  domainName: string;
  weightPct: number;
  systems: SystemCoverage[];
  questionCount: number;
  coverageLevel: CoverageLevel;
}

export interface TrackBlueprintCoverage {
  trackId: string;
  trackSlug: string;
  trackName: string;
  domains: DomainCoverage[];
  /** Systems not in any blueprint domain (orphaned by domain) */
  unassignedSystems: SystemCoverage[];
}

const QUESTION_THRESHOLDS = {
  none: 0,
  low: 5,
  adequate: 20,
  strong: 50,
} as const;

function getQuestionCoverageLevel(count: number): CoverageLevel {
  if (count >= QUESTION_THRESHOLDS.strong) return "strong";
  if (count >= QUESTION_THRESHOLDS.adequate) return "adequate";
  if (count >= QUESTION_THRESHOLDS.low) return "low";
  return "none";
}

function getSystemCoverageLevel(sys: {
  questionCount: number;
  guideCount: number;
  videoCount: number;
  deckCount: number;
  hasSystemExam: boolean;
}): CoverageLevel {
  const qLevel = getQuestionCoverageLevel(sys.questionCount);
  const hasContent = sys.guideCount > 0 || sys.videoCount > 0 || sys.deckCount > 0;
  const hasExam = sys.hasSystemExam;

  if (sys.questionCount === 0 && !hasContent) return "none";
  if (qLevel === "strong" && hasContent && hasExam) return "strong";
  if (qLevel === "adequate" && (hasContent || hasExam)) return "adequate";
  if (qLevel === "low" || hasContent) return "low";
  return "none";
}

function getTopicCoverageLevel(t: TopicCoverage): CoverageLevel {
  const hasAny = t.questionCount > 0 || t.hasGuide || t.hasVideo || t.hasDeck || t.hasExamInclusion;
  if (!hasAny) return "none";
  if (t.questionCount >= QUESTION_THRESHOLDS.strong && t.hasGuide) return "strong";
  if (t.questionCount >= QUESTION_THRESHOLDS.adequate || (t.hasGuide && t.questionCount > 0)) return "adequate";
  return "low";
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load blueprint coverage map for all tracks, or a single track */
export async function loadBlueprintCoverage(trackId?: string | null): Promise<TrackBlueprintCoverage[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();

    const trackQuery = supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    if (trackId) {
      trackQuery.eq("id", trackId);
    }
    const { data: tracks } = await trackQuery;
    if (!tracks?.length) return [];

    const results: TrackBlueprintCoverage[] = [];

    for (const track of tracks) {
      const { data: systems } = await supabase
        .from("systems")
        .select("id, name, slug")
        .eq("exam_track_id", track.id)
        .order("display_order", { ascending: true });

      if (!systems?.length) {
        results.push({
          trackId: track.id,
          trackSlug: track.slug,
          trackName: track.name,
          domains: [],
          unassignedSystems: [],
        });
        continue;
      }

      const systemIds = systems.map((s) => s.id);

      const { data: links } = await supabase
        .from("topic_system_links")
        .select("topic_id, system_id")
        .in("system_id", systemIds);

      const topicIds = [...new Set((links ?? []).map((l) => l.topic_id).filter(Boolean))];

      const [
        blueprintDomainRes,
        blueprintSystemRes,
        topicsRes,
        domainsRes,
        qCountBySystem,
        qCountByTopic,
        sgCountBySystem,
        vCountBySystem,
        vCountByTopic,
        deckCountBySystem,
        deckCountByTopic,
        systemExamsRes,
      ] = await Promise.all([
        supabase.from("exam_blueprints").select("domain_id, weight_pct").eq("exam_track_id", track.id).not("domain_id", "is", null),
        supabase.from("exam_blueprints").select("system_id, weight_pct").eq("exam_track_id", track.id).not("system_id", "is", null),
        topicIds.length > 0 ? supabase.from("topics").select("id, name, domain_id").in("id", topicIds) : Promise.resolve({ data: [] }),
        supabase.from("domains").select("id, name, slug"),
        supabase.from("questions").select("system_id").eq("exam_track_id", track.id).eq("status", "approved"),
        supabase.from("questions").select("topic_id, system_id").eq("exam_track_id", track.id).eq("status", "approved"),
        supabase.from("study_guides").select("system_id").eq("exam_track_id", track.id).eq("status", "approved"),
        supabase.from("video_lessons").select("system_id").eq("exam_track_id", track.id).eq("status", "approved"),
        supabase.from("video_lessons").select("topic_id, system_id").eq("exam_track_id", track.id).eq("status", "approved"),
        supabase.from("flashcard_decks").select("system_id").eq("exam_track_id", track.id),
        supabase.from("flashcard_decks").select("topic_id, system_id").eq("exam_track_id", track.id),
        supabase.from("system_exams").select("system_id").eq("exam_track_id", track.id),
      ]);

      const linksList = links ?? [];
      const topics = topicsRes.data ?? [];
      const domains = domainsRes.data ?? [];
      const domainMap = new Map(domains.map((d) => [d.id, d]));

      const qBySystem = new Map<string, number>();
      for (const q of qCountBySystem.data ?? []) {
        if (q.system_id) qBySystem.set(q.system_id, (qBySystem.get(q.system_id) ?? 0) + 1);
      }

      const qByTopic = new Map<string, number>();
      for (const q of qCountByTopic.data ?? []) {
        if (q.topic_id) qByTopic.set(q.topic_id, (qByTopic.get(q.topic_id) ?? 0) + 1);
      }

      const sgBySystem = new Map<string, number>();
      for (const sg of sgCountBySystem.data ?? []) {
        if (sg.system_id) sgBySystem.set(sg.system_id, (sgBySystem.get(sg.system_id) ?? 0) + 1);
      }

      const vBySystem = new Map<string, number>();
      for (const v of vCountBySystem.data ?? []) {
        if (v.system_id) vBySystem.set(v.system_id, (vBySystem.get(v.system_id) ?? 0) + 1);
      }

      const vByTopic = new Map<string, number>();
      for (const v of vCountByTopic.data ?? []) {
        if (v.topic_id) vByTopic.set(v.topic_id, (vByTopic.get(v.topic_id) ?? 0) + 1);
      }

      const deckBySystem = new Map<string, number>();
      for (const d of deckCountBySystem.data ?? []) {
        if (d.system_id) deckBySystem.set(d.system_id, (deckBySystem.get(d.system_id) ?? 0) + 1);
      }

      const deckByTopic = new Map<string, number>();
      for (const d of deckCountByTopic.data ?? []) {
        if (d.topic_id) deckByTopic.set(d.topic_id, (deckByTopic.get(d.topic_id) ?? 0) + 1);
      }

      const systemExamIds = new Set((systemExamsRes.data ?? []).map((e) => e.system_id));

      const blueprintDomainMap = new Map<string, number>();
      for (const b of blueprintDomainRes.data ?? []) {
        if (b.domain_id) {
          const current = blueprintDomainMap.get(b.domain_id) ?? 0;
          blueprintDomainMap.set(b.domain_id, current + Number(b.weight_pct ?? 0));
        }
      }

      const blueprintSystemMap = new Map<string, number>();
      for (const b of blueprintSystemRes.data ?? []) {
        if (b.system_id) blueprintSystemMap.set(b.system_id, Number(b.weight_pct ?? 0));
      }

      const topicMap = new Map(topics.map((t) => [t.id, t]));

      type SysTopicPair = { system: (typeof systems)[0]; weightPct: number; topicIdsInDomain: string[] };
      const systemsByDomain = new Map<string, SysTopicPair[]>();
      const systemsWithTopics = new Set<string>();

      for (const link of linksList) {
        const topic = topicMap.get(link.topic_id);
        const domainId = topic?.domain_id;
        if (!domainId) continue;

        systemsWithTopics.add(link.system_id);
        const sys = systems.find((s) => s.id === link.system_id);
        if (!sys) continue;

        let list = systemsByDomain.get(domainId);
        if (!list) {
          list = [];
          systemsByDomain.set(domainId, list);
        }
        let pair = list.find((p) => p.system.id === sys.id);
        if (!pair) {
          pair = { system: sys, weightPct: blueprintSystemMap.get(sys.id) ?? 0, topicIdsInDomain: [] };
          list.push(pair);
        }
        if (!pair.topicIdsInDomain.includes(link.topic_id)) {
          pair.topicIdsInDomain.push(link.topic_id);
        }
      }

      function buildTopicCoverage(topicIds: string[], sysId: string): TopicCoverage[] {
        return topicIds.map((tid) => {
          const t = topicMap.get(tid);
          const domain = t?.domain_id ? domainMap.get(t.domain_id) : null;
          const qCount = qByTopic.get(tid) ?? 0;
          const hasGuide = (sgBySystem.get(sysId) ?? 0) > 0;
          const hasVideo = (vByTopic.get(tid) ?? 0) > 0 || (vBySystem.get(sysId) ?? 0) > 0;
          const hasDeck = (deckByTopic.get(tid) ?? 0) > 0 || (deckBySystem.get(sysId) ?? 0) > 0;
          const hasExamInclusion = systemExamIds.has(sysId);

          const tc: TopicCoverage = {
            topicId: tid,
            topicName: t?.name ?? "—",
            domainId: t?.domain_id,
            domainName: domain?.name ?? "—",
            questionCount: qCount,
            hasGuide,
            hasVideo,
            hasDeck,
            hasExamInclusion,
            coverageLevel: "none",
          };
          tc.coverageLevel = getTopicCoverageLevel(tc);
          return tc;
        });
      }

      const domainCoverageList: DomainCoverage[] = [];
      const domainIdsFromBlueprint = [...new Set(blueprintDomainMap.keys())];
      const domainIdsFromMap = [...systemsByDomain.keys()];
      const allDomainIds = [...new Set([...domainIdsFromBlueprint, ...domainIdsFromMap])];

      for (const domainId of allDomainIds) {
        const domain = domainMap.get(domainId);
        if (!domain) continue;

        const sysList = systemsByDomain.get(domainId) ?? [];
        const systemCoverageList: SystemCoverage[] = sysList.map(({ system, weightPct, topicIdsInDomain }) => {
          const topicCoverageList = buildTopicCoverage(topicIdsInDomain, system.id);
          const sysCov: SystemCoverage = {
            systemId: system.id,
            systemName: system.name,
            domainName: domain.name,
            domainId,
            weightPct,
            questionCount: qBySystem.get(system.id) ?? 0,
            guideCount: sgBySystem.get(system.id) ?? 0,
            videoCount: vBySystem.get(system.id) ?? 0,
            deckCount: deckBySystem.get(system.id) ?? 0,
            hasSystemExam: systemExamIds.has(system.id),
            topics: topicCoverageList,
            coverageLevel: "none",
          };
          sysCov.coverageLevel = getSystemCoverageLevel(sysCov);
          return sysCov;
        });

        const domainQuestionCount = systemCoverageList.reduce((s, sys) => s + sys.questionCount, 0);
        const domainLevel = getQuestionCoverageLevel(domainQuestionCount);

        domainCoverageList.push({
          domainId,
          domainName: domain.name,
          weightPct: blueprintDomainMap.get(domainId) ?? 0,
          systems: systemCoverageList.sort((a, b) => b.weightPct - a.weightPct),
          questionCount: domainQuestionCount,
          coverageLevel: domainLevel,
        });
      }

      domainCoverageList.sort((a, b) => b.weightPct - a.weightPct);

      const unassignedSystems: SystemCoverage[] = systems
        .filter((sys) => !systemsWithTopics.has(sys.id))
        .map((sys) => {
          const sysCov: SystemCoverage = {
            systemId: sys.id,
            systemName: sys.name,
            domainName: "Unassigned",
            domainId: "",
            weightPct: blueprintSystemMap.get(sys.id) ?? 0,
            questionCount: qBySystem.get(sys.id) ?? 0,
            guideCount: sgBySystem.get(sys.id) ?? 0,
            videoCount: vBySystem.get(sys.id) ?? 0,
            deckCount: deckBySystem.get(sys.id) ?? 0,
            hasSystemExam: systemExamIds.has(sys.id),
            topics: [],
            coverageLevel: "none",
          };
          sysCov.coverageLevel = getSystemCoverageLevel(sysCov);
          return sysCov;
        });

      results.push({
        trackId: track.id,
        trackSlug: track.slug,
        trackName: track.name,
        domains: domainCoverageList,
        unassignedSystems,
      });
    }

    return results;
  });
}
