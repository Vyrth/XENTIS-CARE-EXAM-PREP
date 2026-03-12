/**
 * Load content sources for admin source evidence panel.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { ContentSource } from "@/types/admin";

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load all content sources for source evidence panel */
export async function loadContentSourcesForAdmin(): Promise<ContentSource[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_sources")
      .select("id, slug, name, source_type, citation_text, url, metadata")
      .order("name", { ascending: true });

    return (data ?? []).map((r) => {
      const meta = (r.metadata as Record<string, unknown>) ?? {};
      return {
        id: r.id,
        title: r.name,
        author: (meta.author as string) || undefined,
        publisher: (meta.publisher as string) || undefined,
        year: typeof meta.year === "number" ? meta.year : undefined,
        url: r.url ?? undefined,
        license: (meta.license as string) ?? undefined,
        notes: r.citation_text ?? undefined,
      };
    });
  });
}

/** Load selected source IDs for content (from content_source_links) */
export async function loadContentSourceIdsForEntity(
  contentType: string,
  contentId: string
): Promise<string[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_source_links")
      .select("content_source_id")
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    return (data ?? []).map((r) => r.content_source_id);
  });
}
