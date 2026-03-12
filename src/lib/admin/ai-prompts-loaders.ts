/**
 * AI prompt templates loader - from ai_prompt_templates table.
 * Replaces MOCK_AI_PROMPTS.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface AIPromptTemplate {
  id: string;
  slug: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  purpose?: string;
  enabled?: boolean;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

export async function loadAIPromptTemplates(): Promise<AIPromptTemplate[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_prompt_templates")
      .select("id, slug, name, system_prompt, user_prompt_template, metadata")
      .order("slug", { ascending: true });

    return (data ?? []).map((r) => {
      const meta = (r.metadata as Record<string, unknown>) ?? {};
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        systemPrompt: r.system_prompt ?? "",
        userPromptTemplate: r.user_prompt_template ?? "",
        purpose: (meta.purpose as string) ?? undefined,
        enabled: meta.enabled !== false,
      };
    });
  });
}
