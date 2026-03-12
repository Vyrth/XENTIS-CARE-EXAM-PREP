import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface LabSet {
  id: string;
  name: string;
}

export interface LabValue {
  id: string;
  name: string;
  abbreviation?: string;
  unit?: string;
  low?: number;
  high?: number;
  set: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: sets } = await supabase
    .from("lab_reference_sets")
    .select("id, slug, name")
    .order("display_order", { ascending: true });

  if (!sets || sets.length === 0) {
    return NextResponse.json({ sets: [], values: [] });
  }

  const setIds = sets.map((s) => s.id);
  const { data: values } = await supabase
    .from("lab_reference_values")
    .select("id, lab_reference_set_id, name, abbreviation, unit, reference_range_low, reference_range_high")
    .in("lab_reference_set_id", setIds)
    .order("display_order", { ascending: true });

  const slugById = new Map(sets.map((s) => [s.id, s.slug]));
  const labSets: LabSet[] = sets.map((s) => ({ id: s.slug, name: s.name }));
  const labValues: LabValue[] = (values ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    abbreviation: v.abbreviation ?? undefined,
    unit: v.unit ?? undefined,
    low: v.reference_range_low != null ? Number(v.reference_range_low) : undefined,
    high: v.reference_range_high != null ? Number(v.reference_range_high) : undefined,
    set: slugById.get(v.lab_reference_set_id) ?? "",
  }));

  return NextResponse.json({ sets: labSets, values: labValues });
}
