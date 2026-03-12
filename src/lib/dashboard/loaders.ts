/**
 * Dashboard data loaders - real Supabase queries for user- and track-specific content.
 * Replaces mock data with live database-backed data.
 */

import { createClient } from "@/lib/supabase/server";
import type { TrackSlug } from "@/data/mock/types";
import type { RawPerformanceRecord } from "@/lib/readiness/mastery-rollups";
import type { HighYieldTopic } from "@/types/high-yield";
import type { BlueprintWeight, TopicBlueprintWeight } from "@/types/high-yield";
import { getHighYieldTopics } from "@/lib/high-yield";
import { computeReadinessScore } from "@/lib/readiness/readiness-score";
import type { ReadinessInputs } from "@/types/readiness";

/** Dashboard stats: questions today, study minutes, streak */
export interface DashboardStats {
  questionsToday: number;
  questionsYesterday: number;
  studyMinutesToday: number;
  studyMinutesGoal: number;
  streakDays: number;
}

/** Continue learning card */
export interface ContinueLearningCard {
  href: string;
  title: string;
  description: string;
  iconKey: string;
  badge?: string;
  trackColor: "lvn" | "rn" | "fnp" | "pmhnp";
}

/** Get today's date in UTC (start of day) */
function todayUtc(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Get yesterday's date in UTC */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Load dashboard stats: questions today, study minutes, streak.
 * Returns zeros and empty values when no data exists.
 */
export async function loadDashboardStats(
  userId: string | null,
  trackId: string | null,
  studyMinutesGoal: number
): Promise<DashboardStats> {
  if (!userId) {
    return {
      questionsToday: 0,
      questionsYesterday: 0,
      studyMinutesToday: 0,
      studyMinutesGoal: studyMinutesGoal,
      streakDays: 0,
    };
  }

  const supabase = await createClient();
  const today = todayUtc();
  const yesterday = yesterdayUtc();

  // Questions today: exam_session_questions (from sessions started today) + user_question_attempts
  const { data: sessionsToday } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", `${today}T00:00:00Z`);

  let questionsToday = 0;
  if (sessionsToday && sessionsToday.length > 0) {
    const sessionIds = sessionsToday.map((s) => s.id);
    const { count } = await supabase
      .from("exam_session_questions")
      .select("id", { count: "exact", head: true })
      .in("exam_session_id", sessionIds);
    questionsToday = count ?? 0;
  }

  const { count: standaloneToday } = await supabase
    .from("user_question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`);
  questionsToday += standaloneToday ?? 0;

  // Questions yesterday
  let questionsYesterday = 0;
  const { data: sessionsYesterday } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", `${yesterday}T00:00:00Z`)
    .lt("started_at", `${today}T00:00:00Z`);
  if (sessionsYesterday && sessionsYesterday.length > 0) {
    const { count } = await supabase
      .from("exam_session_questions")
      .select("id", { count: "exact", head: true })
      .in("exam_session_id", sessionsYesterday.map((s) => s.id));
    questionsYesterday = count ?? 0;
  }
  const { count: standaloneYesterday } = await supabase
    .from("user_question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${yesterday}T00:00:00Z`)
    .lt("created_at", `${today}T00:00:00Z`);
  questionsYesterday += standaloneYesterday ?? 0;

  // Study minutes today - from user_streaks, fallback to derived from activity
  const { data: streakRows } = await supabase
    .from("user_streaks")
    .select("activity_count, activity_type")
    .eq("user_id", userId)
    .eq("activity_date", today);

  let studyMinutesToday = 0;
  if (streakRows) {
    const minutesRow = streakRows.find((r) => r.activity_type === "minutes_studied" || r.activity_type === "study");
    studyMinutesToday = minutesRow?.activity_count ?? 0;
  }

  // Fallback: derive study minutes from exam sessions + question attempts when user_streaks empty
  if (studyMinutesToday === 0 && (questionsToday > 0 || questionsYesterday > 0)) {
    const { data: sessionsForToday } = await supabase
      .from("exam_sessions")
      .select("started_at, completed_at")
      .eq("user_id", userId)
      .gte("started_at", `${today}T00:00:00Z`);
    for (const s of sessionsForToday ?? []) {
      const start = new Date(s.started_at).getTime();
      const end = s.completed_at ? new Date(s.completed_at).getTime() : Date.now();
      studyMinutesToday += Math.floor((end - start) / 60000);
    }
    const { data: attemptsToday } = await supabase
      .from("user_question_attempts")
      .select("time_spent_seconds")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`);
    for (const a of attemptsToday ?? []) {
      studyMinutesToday += Math.floor((a.time_spent_seconds ?? 90) / 60);
    }
  }

  // Streak: from user_streaks first, fallback to derived from activity dates
  let streakDays = 0;
  const { data: streakData } = await supabase
    .from("user_streaks")
    .select("activity_date")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(365);

  if (streakData && streakData.length > 0) {
    const dates = [...new Set(streakData.map((r) => r.activity_date))].sort().reverse();
    const todayStr = today;
    if (dates[0] === todayStr || dates[0] === yesterday) {
      streakDays = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streakDays++;
        else break;
      }
    }
  } else {
    // Derive streak from exam_sessions + user_question_attempts activity dates
    const activityDates = new Set<string>();
    const { data: sessionDates } = await supabase
      .from("exam_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
    for (const s of sessionDates ?? []) {
      activityDates.add(new Date(s.started_at).toISOString().slice(0, 10));
    }
    const { data: attemptDates } = await supabase
      .from("user_question_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
    for (const a of attemptDates ?? []) {
      activityDates.add(new Date(a.created_at).toISOString().slice(0, 10));
    }
    const sorted = [...activityDates].sort().reverse();
    if (sorted[0] === today || sorted[0] === yesterday) {
      streakDays = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]).getTime();
        const curr = new Date(sorted[i]).getTime();
        if (Math.round((prev - curr) / (1000 * 60 * 60 * 24)) === 1) streakDays++;
        else break;
      }
    }
  }

  return {
    questionsToday,
    questionsYesterday,
    studyMinutesToday,
    studyMinutesGoal: studyMinutesGoal,
    streakDays,
  };
}

/** Optional extras for readiness when no snapshot. All from real DB. */
interface ReadinessExtras {
  prePracticeExamPerformance?: number;
  systemExamPerformance?: number;
  studyGuideCompletion?: number;
  videoCompletion?: number;
  confidenceCalibration?: number;
  consistencyOverTime?: number;
}

/** Derive ReadinessInputs from mastery data when no snapshot exists.
 * Zero-state: all components 0 when no real data. No hardcoded baselines.
 * Extras (pre-practice score, system exams, study guides, etc.) from real DB when available. */
function deriveReadinessFromMastery(
  mastery: {
    systems: RawPerformanceRecord[];
    domains: RawPerformanceRecord[];
    skills: RawPerformanceRecord[];
    itemTypes: RawPerformanceRecord[];
  },
  extras?: ReadinessExtras | null
): ReadinessInputs {
  const avg = (recs: RawPerformanceRecord[]) =>
    recs.length === 0 ? 0 : recs.reduce((s, r) => s + (r.total > 0 ? (r.correct / r.total) * 100 : 0), 0) / recs.length;
  const sysAvg = avg(mastery.systems);
  const domAvg = avg(mastery.domains);
  const skillAvg = avg(mastery.skills);
  const totalCorrect = [...mastery.systems, ...mastery.domains].reduce((s, r) => s + r.correct, 0);
  const totalQuestions = [...mastery.systems, ...mastery.domains].reduce((s, r) => s + r.total, 0);
  const questionAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  return {
    questionAccuracy,
    domainPerformance: domAvg,
    systemPerformance: sysAvg,
    skillPerformance: skillAvg,
    systemExamPerformance: extras?.systemExamPerformance ?? 0,
    prePracticeExamPerformance: extras?.prePracticeExamPerformance ?? 0,
    studyGuideCompletion: extras?.studyGuideCompletion ?? 0,
    videoCompletion: extras?.videoCompletion ?? 0,
    confidenceCalibration: extras?.confidenceCalibration ?? 0,
    consistencyOverTime: extras?.consistencyOverTime ?? 0,
  };
}

/** Load pre-practice exam score from last completed session (scratchpad_data.results.percentCorrect). */
async function loadPrePracticeExamScore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string
): Promise<number | undefined> {
  const { data } = await supabase
    .from("exam_sessions")
    .select("scratchpad_data")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .eq("session_type", "pre_practice")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();
  const scratch = (data?.scratchpad_data as { results?: { percentCorrect?: number } })?.results;
  return scratch?.percentCorrect;
}

/** Load avg system exam score from last 3 completed sessions. */
async function loadSystemExamPerformance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string
): Promise<number | undefined> {
  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("scratchpad_data")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .eq("session_type", "system_exam")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(3);
  if (!sessions || sessions.length === 0) return undefined;
  const scores = sessions
    .map((s) => (s.scratchpad_data as { results?: { percentCorrect?: number } })?.results?.percentCorrect)
    .filter((n): n is number => typeof n === "number");
  if (scores.length === 0) return undefined;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Load study guide completion % for track. */
async function loadStudyGuideCompletionPercent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string
): Promise<number | undefined> {
  const { data: guides } = await supabase
    .from("study_guides")
    .select("id")
    .eq("exam_track_id", trackId)
    .eq("status", "published");
  const guideIds = (guides ?? []).map((g) => g.id);
  if (guideIds.length === 0) return undefined;
  const { data: sections } = await supabase
    .from("study_material_sections")
    .select("id")
    .in("study_guide_id", guideIds);
  const sectionIds = (sections ?? []).map((s) => s.id);
  if (sectionIds.length === 0) return undefined;
  const { count } = await supabase
    .from("study_material_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .in("study_material_section_id", sectionIds);
  return count != null ? Math.round((count / sectionIds.length) * 100) : undefined;
}

/** Load video completion % for track. */
async function loadVideoCompletionPercent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string
): Promise<number | undefined> {
  const { data: videos } = await supabase
    .from("video_lessons")
    .select("id")
    .eq("exam_track_id", trackId)
    .eq("status", "published");
  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) return undefined;
  const { count } = await supabase
    .from("video_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .in("video_lesson_id", videoIds);
  return count != null && videoIds.length > 0 ? Math.round((count / videoIds.length) * 100) : undefined;
}

/**
 * Load latest readiness score for user + track.
 * Falls back to computed from mastery + real exam/content data if no snapshot exists.
 * No synthetic baselines; zeros when insufficient data.
 */
export async function loadReadinessScore(
  userId: string | null,
  trackId: string | null,
  mastery: { systems: RawPerformanceRecord[]; domains: RawPerformanceRecord[]; skills: RawPerformanceRecord[]; itemTypes: RawPerformanceRecord[] } | null
): Promise<{ score: number; fromSnapshot: boolean }> {
  if (!userId || !trackId) {
    const inputs = mastery ? deriveReadinessFromMastery(mastery) : null;
    const score = inputs ? computeReadinessScore(inputs) : 0;
    return { score, fromSnapshot: false };
  }

  const supabase = await createClient();
  const { data: snapshot } = await supabase
    .from("user_readiness_snapshots")
    .select("overall_score_pct")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .single();

  if (snapshot?.overall_score_pct != null) {
    return { score: Math.round(Number(snapshot.overall_score_pct)), fromSnapshot: true };
  }

  const [prePractice, systemExam, studyGuide, video, confidenceData, trends] = await Promise.all([
    loadPrePracticeExamScore(supabase, userId, trackId),
    loadSystemExamPerformance(supabase, userId, trackId),
    loadStudyGuideCompletionPercent(supabase, userId, trackId),
    loadVideoCompletionPercent(supabase, userId, trackId),
    import("@/lib/analytics/loaders").then((m) => m.loadConfidenceData(userId, trackId)),
    loadPerformanceTrends(userId, trackId, 14),
  ]);

  const confidenceCalibration =
    confidenceData && confidenceData.length > 0
      ? (await import("@/lib/readiness/confidence-calibration")).computeCalibrationScore(
          (await import("@/lib/readiness/confidence-calibration")).buildConfidenceBuckets(
            confidenceData.map((r) => ({ range: r.range, correct: r.correct, total: r.total }))
          )
        )
      : undefined;

  const daysWithActivity = trends.filter((p) => p.questionsAnswered > 0).length;
  const consistencyOverTime = trends.length > 0 ? (daysWithActivity / trends.length) * 100 : undefined;

  const extras: ReadinessExtras = {};
  if (prePractice != null) extras.prePracticeExamPerformance = prePractice;
  if (systemExam != null) extras.systemExamPerformance = systemExam;
  if (studyGuide != null) extras.studyGuideCompletion = studyGuide;
  if (video != null) extras.videoCompletion = video;
  if (confidenceCalibration != null) extras.confidenceCalibration = confidenceCalibration;
  if (consistencyOverTime != null) extras.consistencyOverTime = consistencyOverTime;

  const baseMastery = mastery ?? { systems: [], domains: [], skills: [], itemTypes: [] };
  const inputs = deriveReadinessFromMastery(baseMastery, Object.keys(extras).length > 0 ? extras : undefined);
  const score = computeReadinessScore(inputs);
  return { score, fromSnapshot: false };
}

export interface MasteryLoadResult {
  systems: RawPerformanceRecord[];
  domains: RawPerformanceRecord[];
  skills: RawPerformanceRecord[];
  itemTypes: RawPerformanceRecord[];
  systemSlugMap: Record<string, string>;
  domainSlugMap: Record<string, string>;
  itemTypeSlugMap: Record<string, string>;
}

/**
 * Load mastery data (system, domain, skill, item type) for user + track.
 * Transforms DB rows to RawPerformanceRecord format.
 */
export async function loadMasteryData(
  userId: string | null,
  trackId: string | null
): Promise<MasteryLoadResult> {
  const empty = { systems: [], domains: [], skills: [], itemTypes: [], systemSlugMap: {} as Record<string, string>, domainSlugMap: {} as Record<string, string>, itemTypeSlugMap: {} as Record<string, string> };
  if (!userId || !trackId) return empty;

  const supabase = await createClient();

  const [sysRes, domRes, skillRes, itemRes] = await Promise.all([
    supabase
      .from("user_system_mastery")
      .select("system_id, questions_answered, questions_correct, systems(name, slug)")
      .eq("user_id", userId)
      .eq("exam_track_id", trackId),
    supabase
      .from("user_domain_mastery")
      .select("domain_id, questions_answered, questions_correct, domains(name, slug)")
      .eq("user_id", userId)
      .eq("exam_track_id", trackId),
    supabase
      .from("user_skill_mastery")
      .select("skill_slug, questions_answered, questions_correct")
      .eq("user_id", userId)
      .eq("exam_track_id", trackId),
    supabase
      .from("user_item_type_performance")
      .select("question_type_id, questions_answered, questions_correct, question_types(slug, name)")
      .eq("user_id", userId)
      .eq("exam_track_id", trackId),
  ]);

  const systemSlugMap: Record<string, string> = {};
  type SysRow = { system_id: string; questions_answered: number; questions_correct: number; systems: { name: string; slug: string } | { name: string; slug: string }[] | null };
  const systems: RawPerformanceRecord[] = (sysRes.data ?? []).map((r: SysRow) => {
    const sys = Array.isArray(r.systems) ? r.systems[0] : r.systems;
    if (sys?.slug) systemSlugMap[r.system_id] = sys.slug;
    return {
      entityId: r.system_id,
      entityName: sys?.name ?? r.system_id,
      correct: r.questions_correct ?? 0,
      total: r.questions_answered ?? 0,
    };
  });

  const domainSlugMap: Record<string, string> = {};
  type DomRow = { domain_id: string; questions_answered: number; questions_correct: number; domains: { name: string; slug: string } | { name: string; slug: string }[] | null };
  const domains: RawPerformanceRecord[] = (domRes.data ?? []).map((r: DomRow) => {
    const dom = Array.isArray(r.domains) ? r.domains[0] : r.domains;
    if (dom?.slug) domainSlugMap[r.domain_id] = dom.slug;
    return {
      entityId: r.domain_id,
      entityName: dom?.name ?? r.domain_id,
      correct: r.questions_correct ?? 0,
      total: r.questions_answered ?? 0,
    };
  });

  const skills: RawPerformanceRecord[] = (skillRes.data ?? []).map((r: { skill_slug: string; questions_answered: number; questions_correct: number }) => ({
    entityId: r.skill_slug,
    entityName: r.skill_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    correct: r.questions_correct ?? 0,
    total: r.questions_answered ?? 0,
  }));

  const itemTypeSlugMap: Record<string, string> = {};
  type ItemRow = { question_type_id: string; questions_answered: number; questions_correct: number; question_types: { name: string; slug: string } | { name: string; slug: string }[] | null };
  const itemTypes: RawPerformanceRecord[] = (itemRes.data ?? []).map((r: ItemRow) => {
    const qt = Array.isArray(r.question_types) ? r.question_types[0] : r.question_types;
    if (qt?.slug) itemTypeSlugMap[r.question_type_id] = qt.slug;
    return {
      entityId: r.question_type_id,
      entityName: qt?.name ?? qt?.slug ?? r.question_type_id,
      correct: r.questions_correct ?? 0,
      total: r.questions_answered ?? 0,
    };
  });

  const hasMaterialized =
    systems.length > 0 || domains.length > 0 || skills.length > 0 || itemTypes.length > 0;

  if (!hasMaterialized) {
    const derived = await computeMasteryFromActivity(supabase, userId, trackId);
    if (derived) {
      return derived;
    }
  }

  return { systems, domains, skills, itemTypes, systemSlugMap, domainSlugMap, itemTypeSlugMap };
}

/**
 * Compute mastery from user_question_attempts + exam_session_questions when materialized tables are empty.
 */
async function computeMasteryFromActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string
): Promise<MasteryLoadResult | null> {
  type AttemptRow = { question_id: string; is_correct: boolean };
  type EsqRow = { question_id: string; is_correct: boolean | null };
  type QRow = { id: string; system_id: string | null; domain_id: string | null; question_type_id: string };

  const { data: attempts } = await supabase
    .from("user_question_attempts")
    .select("question_id, is_correct")
    .eq("user_id", userId) as { data: AttemptRow[] | null };

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  let esqRows: EsqRow[] = [];
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("exam_session_questions")
      .select("question_id, is_correct")
      .in("exam_session_id", sessionIds);
    esqRows = (data ?? []) as EsqRow[];
  }

  const questionIds = [
    ...new Set([
      ...(attempts ?? []).map((a) => a.question_id),
      ...esqRows.map((e) => e.question_id),
    ]),
  ];
  if (questionIds.length === 0) return null;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, system_id, domain_id, question_type_id")
    .eq("exam_track_id", trackId)
    .in("id", questionIds) as { data: QRow[] | null };

  const qMap = new Map<string, QRow>();
  for (const q of questions ?? []) {
    qMap.set(q.id, q);
  }

  const { data: systemsData } = await supabase
    .from("systems")
    .select("id, name, slug")
    .eq("exam_track_id", trackId);
  const { data: domainsData } = await supabase
    .from("domains")
    .select("id, name, slug");

  const systemMap = new Map<string, { name: string; slug: string }>();
  const domainMap = new Map<string, { name: string; slug: string }>();
  for (const s of systemsData ?? []) {
    systemMap.set(s.id, { name: s.name, slug: s.slug });
  }
  for (const d of domainsData ?? []) {
    domainMap.set(d.id, { name: d.name, slug: d.slug });
  }

  const { data: qtData } = await supabase
    .from("question_types")
    .select("id, name, slug");
  const qtMap = new Map<string, { name: string; slug: string }>();
  for (const qt of qtData ?? []) {
    qtMap.set(qt.id, { name: qt.name, slug: qt.slug });
  }

  const bySystem = new Map<string, { correct: number; total: number }>();
  const byDomain = new Map<string, { correct: number; total: number }>();
  const byItemType = new Map<string, { correct: number; total: number }>();

  function record(
    sysId: string | null,
    domId: string | null,
    typeId: string,
    correct: boolean
  ) {
    if (sysId) {
      const cur = bySystem.get(sysId) ?? { correct: 0, total: 0 };
      cur.total++;
      if (correct) cur.correct++;
      bySystem.set(sysId, cur);
    }
    if (domId) {
      const cur = byDomain.get(domId) ?? { correct: 0, total: 0 };
      cur.total++;
      if (correct) cur.correct++;
      byDomain.set(domId, cur);
    }
    if (typeId) {
      const cur = byItemType.get(typeId) ?? { correct: 0, total: 0 };
      cur.total++;
      if (correct) cur.correct++;
      byItemType.set(typeId, cur);
    }
  }

  for (const a of attempts ?? []) {
    const q = qMap.get(a.question_id);
    if (!q) continue;
    record(q.system_id, q.domain_id, q.question_type_id, a.is_correct);
  }
  for (const e of esqRows) {
    const q = qMap.get(e.question_id);
    if (!q) continue;
    record(q.system_id, q.domain_id, q.question_type_id, e.is_correct === true);
  }

  const systemSlugMap: Record<string, string> = {};
  const systems: RawPerformanceRecord[] = Array.from(bySystem.entries()).map(([id, v]) => {
    const meta = systemMap.get(id);
    if (meta?.slug) systemSlugMap[id] = meta.slug;
    return {
      entityId: id,
      entityName: meta?.name ?? id,
      correct: v.correct,
      total: v.total,
    };
  });

  const domainSlugMap: Record<string, string> = {};
  const domains: RawPerformanceRecord[] = Array.from(byDomain.entries()).map(([id, v]) => {
    const meta = domainMap.get(id);
    if (meta?.slug) domainSlugMap[id] = meta.slug;
    return {
      entityId: id,
      entityName: meta?.name ?? id,
      correct: v.correct,
      total: v.total,
    };
  });

  const skills: RawPerformanceRecord[] = [];

  const itemTypeSlugMap: Record<string, string> = {};
  const itemTypes: RawPerformanceRecord[] = Array.from(byItemType.entries()).map(([id, v]) => {
    const meta = qtMap.get(id);
    if (meta?.slug) itemTypeSlugMap[id] = meta.slug;
    return {
      entityId: id,
      entityName: meta?.name ?? meta?.slug ?? id,
      correct: v.correct,
      total: v.total,
    };
  });

  return { systems, domains, skills, itemTypes, systemSlugMap, domainSlugMap, itemTypeSlugMap };
}

/**
 * Load high-yield topics for track from DB.
 * Uses exam_blueprints for system weights; topics from topic_system_links.
 * Falls back to blueprint-only ranking when telemetry/student signal absent.
 */
export async function loadHighYieldTopics(
  trackId: string | null,
  trackSlug: TrackSlug,
  limit = 10
): Promise<HighYieldTopic[]> {
  if (!trackId) return [];

  const supabase = await createClient();

  const { data: track } = await supabase.from("exam_tracks").select("id").eq("id", trackId).single();
  if (!track) return [];

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name, slug")
    .eq("exam_track_id", trackId);

  if (!systems || systems.length === 0) return [];

  const systemIds = systems.map((s) => s.id);
  const { data: links } = await supabase
    .from("topic_system_links")
    .select("topic_id, system_id")
    .in("system_id", systemIds);

  if (!links || links.length === 0) return [];

  const topicIds = [...new Set(links.map((l) => l.topic_id))];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, domain_id")
    .in("id", topicIds);

  if (!topics || topics.length === 0) return [];

  const { data: blueprintRows } = await supabase
    .from("exam_blueprints")
    .select("system_id, weight_pct")
    .eq("exam_track_id", trackId)
    .not("system_id", "is", null);

  const systemBlueprint: BlueprintWeight[] = (blueprintRows ?? []).map((r: { system_id: string; weight_pct: number }) => {
    const sys = systems.find((s) => s.id === r.system_id);
    return {
      systemId: r.system_id,
      systemName: sys?.name ?? r.system_id,
      weightPercent: Number(r.weight_pct ?? 0),
      track: trackSlug,
    };
  });

  const systemWeightBySystem = new Map<string, number>();
  for (const r of (blueprintRows ?? []) as { system_id: string; weight_pct: number }[]) {
    systemWeightBySystem.set(r.system_id, Number(r.weight_pct ?? 0));
  }

  const topicBlueprint: TopicBlueprintWeight[] = [];
  const topicsWithSystem = topics.map((t) => {
    const link = links.find((l) => l.topic_id === t.id);
    const sys = link ? systems.find((s) => s.id === link.system_id) : null;
    const weight = sys ? (systemWeightBySystem.get(sys.id) ?? 0) : 0;
    if (sys && weight > 0) {
      topicBlueprint.push({
        systemId: sys.id,
        systemName: sys.name,
        topicId: t.id,
        topicName: t.name,
        weightPercent: weight,
        track: trackSlug,
      });
    }
    return {
      id: t.id,
      name: t.name,
      systemId: sys?.id ?? "",
      systemName: sys?.name ?? "",
      systemSlug: sys?.slug,
    };
  }).filter((t) => t.systemId);

  // Intentional empty arrays when no telemetry/student signal data exists (DB-backed in future)
  return getHighYieldTopics(trackSlug, {
    topicBlueprint,
    systemBlueprint,
    telemetry: [],
    studentSignal: [],
    topics: topicsWithSystem,
  }, limit);
}

/**
 * Load last pre-practice exam completed date (YYYY-MM-DD) for user + track.
 */
export async function loadLastPrePracticeDate(
  userId: string | null,
  trackId: string | null
): Promise<string | null> {
  if (!userId || !trackId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_sessions")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .eq("session_type", "pre_practice")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const completed = data?.completed_at;
  return completed ? new Date(completed).toISOString().slice(0, 10) : null;
}

/**
 * Load personalized Continue Learning cards from study workflow orchestration.
 * Uses: weak systems/domains/skills/item types, high-yield, pre-practice due,
 * study guides, recommended content. Empty-state logic when no activity.
 */
export async function loadStudyWorkflowRecommendations(
  userId: string | null,
  trackId: string | null,
  trackSlug: TrackSlug
): Promise<ContinueLearningCard[]> {
  const {
    computeStudyWorkflowRecommendations,
    toContinueLearningCards,
  } = await import("@/lib/readiness/study-workflow");
  const { rollupBySystem, rollupByDomain, rollupBySkill, rollupByItemType, getWeakRollups } =
    await import("@/lib/readiness");
  const { loadStudyGuides } = await import("@/lib/content/loaders");

  const supabase = await createClient();
  const [mastery, highYieldTopics, studyGuides, lastPrePracticeDate, recommendedContent, studyGuideCompletion] =
    await Promise.all([
      loadMasteryData(userId, trackId),
      loadHighYieldTopics(trackId, trackSlug, 10),
      loadStudyGuides(trackId),
      loadLastPrePracticeDate(userId, trackId),
      loadRecommendedContent(userId, trackId, 3),
      userId && trackId ? loadStudyGuideCompletionPercent(supabase, userId, trackId) : Promise.resolve(undefined),
    ]);

  const hasActivity =
    mastery.systems.some((r) => r.total > 0) ||
    mastery.domains.some((r) => r.total > 0) ||
    mastery.skills.some((r) => r.total > 0) ||
    mastery.itemTypes.some((r) => r.total > 0);

  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const skillRollups = rollupBySkill(mastery.skills);
  const itemTypeRollups = rollupByItemType(mastery.itemTypes);

  const recs = computeStudyWorkflowRecommendations({
    trackId,
    trackSlug,
    userId,
    weakSystems: getWeakRollups(systemRollups),
    weakDomains: getWeakRollups(domainRollups),
    weakSkills: getWeakRollups(skillRollups),
    weakItemTypes: getWeakRollups(itemTypeRollups),
    systemSlugMap: mastery.systemSlugMap,
    domainSlugMap: mastery.domainSlugMap,
    itemTypeSlugMap: mastery.itemTypeSlugMap,
    studyGuides,
    highYieldTopics,
    lastPrePracticeDate,
    studyGuideCompletion,
    hasActivity,
    recommendedContent,
  });

  return toContinueLearningCards(recs);
}

/** @deprecated Use loadStudyWorkflowRecommendations for personalized cards. */
export async function loadContinueLearningCards(
  trackId: string | null,
  trackSlug: TrackSlug
): Promise<ContinueLearningCard[]> {
  return loadStudyWorkflowRecommendations(null, trackId, trackSlug);
}

/** Performance trend point for charts */
export interface PerformanceTrendPoint {
  date: string;
  questionsAnswered: number;
  questionsCorrect: number;
  scorePct: number;
}

/**
 * Load recent performance trends (last 7 days).
 * Uses user_performance_trends when available; otherwise derives from exam_sessions + user_question_attempts.
 */
export async function loadPerformanceTrends(
  userId: string | null,
  trackId: string | null,
  days = 7
): Promise<PerformanceTrendPoint[]> {
  if (!userId || !trackId) return [];

  const supabase = await createClient();
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data: trends } = await supabase
    .from("user_performance_trends")
    .select("period_start, questions_answered, questions_correct, score_pct")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .eq("period_type", "day")
    .gte("period_start", start.toISOString().slice(0, 10))
    .lte("period_start", end.toISOString().slice(0, 10))
    .order("period_start", { ascending: true });

  if (trends && trends.length > 0) {
    return trends.map((t: { period_start: string; questions_answered: number; questions_correct: number; score_pct: number | null }) => ({
      date: t.period_start,
      questionsAnswered: t.questions_answered ?? 0,
      questionsCorrect: t.questions_correct ?? 0,
      scorePct: t.score_pct != null ? Number(t.score_pct) : (t.questions_answered > 0 ? (t.questions_correct / t.questions_answered) * 100 : 0),
    }));
  }

  // Derive from exam_sessions + user_question_attempts (batch queries, aggregate in memory)
  const dayStart = start.toISOString().slice(0, 10);
  const dayEnd = end.toISOString().slice(0, 10);

  const { data: sessionsInRange } = await supabase
    .from("exam_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .gte("started_at", `${dayStart}T00:00:00Z`)
    .lte("started_at", `${dayEnd}T23:59:59.999Z`);

  const sessionIds: string[] = [];
  const sessionDateMap = new Map<string, string[]>();
  for (const s of sessionsInRange ?? []) {
    sessionIds.push(s.id);
    const dateStr = new Date(s.started_at).toISOString().slice(0, 10);
    if (!sessionDateMap.has(dateStr)) sessionDateMap.set(dateStr, []);
    sessionDateMap.get(dateStr)!.push(s.id);
  }

  const byDate = new Map<string, { answered: number; correct: number }>();
  if (sessionIds.length > 0) {
    const { data: esq } = await supabase
      .from("exam_session_questions")
      .select("exam_session_id, is_correct")
      .in("exam_session_id", sessionIds);
    const sessionToDate = new Map<string, string>();
    for (const s of sessionsInRange ?? []) {
      sessionToDate.set(s.id, new Date(s.started_at).toISOString().slice(0, 10));
    }
    for (const r of esq ?? []) {
      const dateStr = sessionToDate.get(r.exam_session_id);
      if (!dateStr) continue;
      const cur = byDate.get(dateStr) ?? { answered: 0, correct: 0 };
      cur.answered++;
      if (r.is_correct) cur.correct++;
      byDate.set(dateStr, cur);
    }
  }

  const { data: attemptsInRange } = await supabase
    .from("user_question_attempts")
    .select("created_at, is_correct")
    .eq("user_id", userId)
    .gte("created_at", `${dayStart}T00:00:00Z`)
    .lte("created_at", `${dayEnd}T23:59:59.999Z`);
  for (const a of attemptsInRange ?? []) {
    const dateStr = new Date(a.created_at).toISOString().slice(0, 10);
    const cur = byDate.get(dateStr) ?? { answered: 0, correct: 0 };
    cur.answered++;
    if (a.is_correct) cur.correct++;
    byDate.set(dateStr, cur);
  }

  const points: PerformanceTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const cur = byDate.get(dateStr) ?? { answered: 0, correct: 0 };
    points.push({
      date: dateStr,
      questionsAnswered: cur.answered,
      questionsCorrect: cur.correct,
      scorePct: cur.answered > 0 ? (cur.correct / cur.answered) * 100 : 0,
    });
  }
  return points;
}

/**
 * Load recommended content from recommended_content_queue.
 */
export async function loadRecommendedContent(
  userId: string | null,
  trackId: string | null,
  limit = 5
): Promise<{ id: string; type: string; title: string; href: string; priority: string }[]> {
  if (!userId || !trackId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("recommended_content_queue")
    .select("content_type, content_id, priority")
    .eq("user_id", userId)
    .eq("exam_track_id", trackId)
    .is("completed_at", null)
    .order("priority", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const recs: { id: string; type: string; title: string; href: string; priority: string }[] = [];
  for (const r of data) {
    let title = "Recommended content";
    let href = "/study-guides";
    if (r.content_type === "study_guide") {
      const { data: sg } = await supabase
        .from("study_guides")
        .select("title, exam_track_id")
        .eq("id", r.content_id)
        .single();
      if (!sg || sg.exam_track_id !== trackId) continue;
      title = sg?.title ?? "Study guide";
      href = `/study-guides/${r.content_id}`;
    } else if (r.content_type === "video") {
      const { data: v } = await supabase
        .from("video_lessons")
        .select("title, exam_track_id")
        .eq("id", r.content_id)
        .single();
      if (!v || v.exam_track_id !== trackId) continue;
      title = v?.title ?? "Video";
      href = `/videos/${r.content_id}`;
    } else if (r.content_type === "flashcard_deck") {
      const { data: fd } = await supabase
        .from("flashcard_decks")
        .select("name, exam_track_id")
        .eq("id", r.content_id)
        .single();
      if (!fd || fd.exam_track_id !== trackId) continue;
      title = fd?.name ?? "Flashcards";
      href = `/flashcards/${r.content_id}`;
    }
    recs.push({ id: r.content_id, type: r.content_type, title, href, priority: r.priority ?? "medium" });
  }
  return recs;
}
