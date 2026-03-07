/**
 * AI interaction logging - audit trail for compliance and rate limiting
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AILogEntry } from "@/types/ai-tutor";

/** Log AI interaction. Pass supabase to persist to ai_interaction_logs. */
export async function logAIInteraction(
  entry: AILogEntry,
  supabase?: SupabaseClient
): Promise<void> {
  if (supabase) {
    try {
      await supabase.from("ai_interaction_logs").insert({
        user_id: entry.userId ?? null,
        interaction_type: entry.action,
        prompt_tokens: entry.promptTokens ?? null,
        completion_tokens: entry.completionTokens ?? null,
        model: entry.model ?? null,
        content_refs: entry.contentRefs ?? [],
      });
    } catch (err) {
      console.warn("[AI Log] Insert failed:", err instanceof Error ? err.message : err);
    }
  }
  if (process.env.NODE_ENV === "development" && !supabase) {
    console.log("[AI Log]", JSON.stringify(entry, null, 2));
  }
}
