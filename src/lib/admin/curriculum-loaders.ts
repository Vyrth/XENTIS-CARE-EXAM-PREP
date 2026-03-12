/**
 * Curriculum loaders - systems, domains, topics from Supabase.
 * Replaces MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface CurriculumSystem {
  id: string;
  slug: string;
  name: string;
  examTrackId: string;
  examTrackSlug: string;
}

export interface CurriculumDomain {
  id: string;
  slug: string;
  name: string;
}

export interface CurriculumTopic {
  id: string;
  slug: string;
  name: string;
  systemIds: string[];
  domainId: string | null;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

export async function loadCurriculumForAdmin(): Promise<{
  systems: CurriculumSystem[];
  domains: CurriculumDomain[];
  topics: CurriculumTopic[];
}> {
  return safeQuery(async () => {
    const supabase = createServiceClient();

    const [systemsRes, domainsRes, topicsRes] = await Promise.all([
      supabase
        .from("systems")
        .select("id, slug, name, exam_track_id, exam_tracks(slug)")
        .order("display_order", { ascending: true }),
      supabase.from("domains").select("id, slug, name").order("name", { ascending: true }),
      supabase
        .from("topics")
        .select("id, slug, name, domain_id")
        .order("name", { ascending: true }),
    ]);

    const systems: CurriculumSystem[] = (systemsRes.data ?? []).map((s) => {
      const track = Array.isArray(s.exam_tracks) ? s.exam_tracks[0] : s.exam_tracks;
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        examTrackId: s.exam_track_id,
        examTrackSlug: (track as { slug?: string })?.slug ?? "",
      };
    });

    const domains: CurriculumDomain[] = (domainsRes.data ?? []).map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
    }));

    const systemIds = new Set(systems.map((s) => s.id));
    const { data: links } = await supabase
      .from("topic_system_links")
      .select("topic_id, system_id");

    const topicToSystems = new Map<string, string[]>();
    for (const l of links ?? []) {
      if (systemIds.has(l.system_id)) {
        const arr = topicToSystems.get(l.topic_id) ?? [];
        if (!arr.includes(l.system_id)) arr.push(l.system_id);
        topicToSystems.set(l.topic_id, arr);
      }
    }

    const topics: CurriculumTopic[] = (topicsRes.data ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      systemIds: topicToSystems.get(t.id) ?? [],
      domainId: t.domain_id ?? null,
    }));

    return { systems, domains, topics };
  });
}
