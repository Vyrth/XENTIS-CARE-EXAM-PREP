"use server";

import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { AutonomousSettings } from "@/lib/admin/autonomous-operations";

export async function loadAutonomousSettingsAction(): Promise<AutonomousSettings | null> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return null;
  if (!isSupabaseServiceRoleConfigured()) return null;

  const { getSettings } = await import("@/lib/admin/autonomous-operations");
  return getSettings();
}

export async function saveAutonomousSettingsAction(
  key: string,
  valueJson: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };

  const validKeys = ["cadence", "auto_publish", "source_governance", "blueprint_targets", "pre_practice"];
  if (!validKeys.includes(key)) return { success: false, error: `Invalid key: ${key}` };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("autonomous_settings")
      .upsert(
        { key, value_json: valueJson, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    return { success: !error, error: error?.message };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function loadSourceFrameworksAction(): Promise<
  { id: string; slug: string; name: string; description: string | null }[]
> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("source_frameworks")
      .select("id, slug, name, description")
      .order("slug", { ascending: true });
    return (data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description ?? null,
    }));
  } catch {
    return [];
  }
}

export async function loadBlueprintGapsAction(
  trackId?: string | null
): Promise<{ trackSlug: string; systemId?: string; topicId?: string; current: number; target: number; gap: number }[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];

  const { computeBlueprintGaps } = await import("@/lib/admin/autonomous-operations");
  const gaps = await computeBlueprintGaps(trackId);
  return gaps.map((g) => ({
    trackSlug: g.trackSlug,
    systemId: g.systemId,
    topicId: g.topicId,
    current: g.currentQuestions,
    target: g.targetQuestions,
    gap: g.gap,
  }));
}
