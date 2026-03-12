/**
 * GET /api/questions/[id] - Fetch single question by ID (track-scoped)
 * Returns question with options, exhibits, interactions. Verifies question belongs to user's primary track.
 * Query params: revealAnswers=true|false - when false (exam mode), don't send correctAnswer, isCorrect, rationale
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing question ID" }, { status: 400 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const primary = await getPrimaryTrack(user.id);
  const trackId = primary?.trackId ?? null;
  if (!trackId) return NextResponse.json({ error: "No track selected" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const revealAnswers = searchParams.get("revealAnswers") !== "false";

  const supabase = await createClient();
  const { data: q, error } = await supabase
    .from("questions")
    .select(`
      id,
      stem,
      stem_metadata,
      exam_track_id,
      question_type_id,
      system_id,
      domain_id,
      topic_id,
      subtopic_id,
      question_types(slug),
      systems(slug, name),
      domains(slug, name),
      topics(slug, name)
    `)
    .eq("id", id)
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .single();

  if (error || !q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { data: options } = await supabase
    .from("question_options")
    .select("option_key, option_text, is_correct, option_metadata, display_order")
    .eq("question_id", id)
    .order("display_order", { ascending: true });

  const qt = Array.isArray(q.question_types) ? q.question_types[0] : q.question_types;
  const typeSlug = (qt as { slug?: string })?.slug ?? "single_best_answer";

  const correctKeys = (options ?? [])
    .filter((o) => o.is_correct)
    .map((o) => o.option_key);
  const correctAnswer =
    correctKeys.length === 1 ? correctKeys[0] : correctKeys.length > 1 ? correctKeys : undefined;

  const stemMeta = (q.stem_metadata as Record<string, unknown>) ?? {};
  const rationale = (stemMeta.rationale as string) ?? "";

  const { data: exhibits } = await supabase
    .from("question_exhibits")
    .select("exhibit_type, content_url, exhibit_data")
    .eq("question_id", id)
    .order("display_order", { ascending: true });

  const firstImage = (exhibits ?? []).find((e) => e.exhibit_type === "image");
  const imageUrl = firstImage?.content_url ?? (stemMeta.imageUrl as string) ?? undefined;

  const chartExhibit = (exhibits ?? []).find((e) => e.exhibit_type === "chart" || e.exhibit_type === "table");
  const chartTableData = (chartExhibit?.exhibit_data as Record<string, unknown>) ?? (stemMeta.chartTableData as Record<string, unknown>);

  const { data: interactions } = await supabase
    .from("question_interactions")
    .select("id, stem, interaction_key, display_order")
    .eq("question_id", id)
    .order("display_order", { ascending: true });

  const caseStudyTabs =
    typeSlug === "case_study" && interactions && interactions.length > 0
      ? interactions.map((i, idx) => ({
          id: i.id,
          title: (i.interaction_key as string) ?? `Tab ${idx + 1}`,
          content: (i.stem as string) ?? "",
        }))
      : undefined;

  const leadIn = stemMeta.leadIn as string | undefined;
  const instructions = stemMeta.instructions as string | undefined;
  const matrixRows = stemMeta.matrixRows as string[] | undefined;
  const matrixCols = stemMeta.matrixCols as string[] | undefined;
  const clozeBlanks = stemMeta.clozeBlanks as { id: string; options: string[] }[] | undefined;
  const hotspotRegions = stemMeta.hotspotRegions as { id: string; label: string }[] | undefined;
  const highlightTargets = stemMeta.highlightTargets as { id: string; text: string }[] | undefined;
  const bowTieLeft = stemMeta.bowTieLeft as string[] | undefined;
  const bowTieRight = stemMeta.bowTieRight as string[] | undefined;
  const selectN = stemMeta.selectN as number | undefined;

  const { data: profile } = await supabase
    .from("question_adaptive_profiles")
    .select("difficulty_tier")
    .eq("question_id", id)
    .single();
  const difficulty = profile?.difficulty_tier ?? undefined;

  const sys = Array.isArray(q.systems) ? q.systems[0] : q.systems;
  const dom = Array.isArray(q.domains) ? q.domains[0] : q.domains;
  const top = Array.isArray(q.topics) ? q.topics[0] : q.topics;
  const systemName = (sys as { name?: string })?.name;
  const systemSlug = (sys as { slug?: string })?.slug;
  const domainName = (dom as { name?: string })?.name;
  const topicName = (top as { name?: string })?.name;

  const base: Record<string, unknown> = {
    id: q.id,
    stem: q.stem,
    type: typeSlug,
    systemId: q.system_id,
    domainId: q.domain_id,
    systemName: systemName ?? undefined,
    systemSlug: systemSlug ?? undefined,
    domainName: domainName ?? undefined,
    topicName: topicName ?? undefined,
    options: (options ?? []).map((o) =>
      revealAnswers
        ? { key: o.option_key, text: o.option_text, isCorrect: o.is_correct }
        : { key: o.option_key, text: o.option_text }
    ),
    imageUrl: imageUrl ?? undefined,
    caseStudyTabs,
    leadIn: leadIn ?? undefined,
    instructions: instructions ?? undefined,
    chartTableData: chartTableData ?? undefined,
    matrixRows: matrixRows ?? undefined,
    matrixCols: matrixCols ?? undefined,
    clozeBlanks: clozeBlanks ?? undefined,
    hotspotRegions: hotspotRegions ?? undefined,
    highlightTargets: highlightTargets ?? undefined,
    bowTieLeft: bowTieLeft ?? undefined,
    bowTieRight: bowTieRight ?? undefined,
    selectN: selectN ?? undefined,
    difficulty: difficulty ?? undefined,
  };

  if (revealAnswers) {
    (base as Record<string, unknown>).correctAnswer = correctAnswer;
    (base as Record<string, unknown>).rationale = rationale || undefined;
  }

  return NextResponse.json(base);
}
