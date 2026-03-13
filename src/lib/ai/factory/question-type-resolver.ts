/**
 * Question type resolution for AI Factory.
 * Resolves slug -> id from DB; provides canonical fallback when DB is empty.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/** Canonical question types for AI generation (matches question_type_slug enum).
 * Used when question_types table is empty or loader fails. */
export const CANONICAL_QUESTION_TYPES = [
  { id: "", slug: "single_best_answer", name: "Single Best Answer" },
  { id: "", slug: "multiple_response", name: "Multiple Response" },
  { id: "", slug: "select_n", name: "Select N" },
  { id: "", slug: "image_based", name: "Image-Based" },
  { id: "", slug: "chart_table_exhibit", name: "Chart/Table Exhibit" },
  { id: "", slug: "ordered_response", name: "Ordered Response" },
  { id: "", slug: "hotspot", name: "Hotspot" },
  { id: "", slug: "case_study", name: "Case Study" },
  { id: "", slug: "dosage_calc", name: "Dosage Calculation" },
] as const;

export const CANONICAL_SLUGS = new Set(CANONICAL_QUESTION_TYPES.map((t) => t.slug));

/** Resolve question_type slug to id. Returns null if not found. */
export async function resolveQuestionTypeId(slug: string | null | undefined): Promise<string | null> {
  const s = (slug ?? "single_best_answer").trim().toLowerCase();
  if (!s) return null;
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("question_types")
      .select("id")
      .eq("slug", s)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
