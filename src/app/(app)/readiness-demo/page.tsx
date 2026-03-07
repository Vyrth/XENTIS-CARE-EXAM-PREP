/**
 * Readiness Demo - end-to-end example using seeded mock data
 * Demonstrates: readiness score, mastery rollups, trends, recommendations,
 * adaptive queue, content queue, remediation plan, system unlock
 */

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Link from "next/link";
import {
  computeReadinessScore,
  getReadinessBandInfo,
  rollupBySystem,
  rollupByDomain,
  rollupBySkill,
  rollupByItemType,
  getWeakRollups,
  getStrongRollups,
  aggregateDailyTrend,
  computeConsistencyScore,
  buildConfidenceBuckets,
  computeCalibrationScore,
  generateRecommendations,
  selectAdaptiveQuestions,
  selectRecommendedContent,
  generateRemediationPlan,
  getUnlockedSystems,
  getLockedSystemsWithGap,
} from "@/lib/readiness";
import {
  MOCK_READINESS_INPUTS,
  MOCK_RAW_SYSTEM_PERFORMANCE,
  MOCK_RAW_DOMAIN_PERFORMANCE,
  MOCK_RAW_SKILL_PERFORMANCE,
  MOCK_RAW_ITEM_TYPE_PERFORMANCE,
  MOCK_DAILY_PERFORMANCE,
  MOCK_SYSTEM_PROGRESS,
  MOCK_CONTENT_ITEMS,
  MOCK_QUESTION_CANDIDATES,
} from "@/data/mock/readiness";
import { MOCK_CONFIDENCE_DATA } from "@/data/mock/performance";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";
import { SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS } from "@/config/readiness";

function getSystemSlug(id: string) {
  return MOCK_SYSTEMS.find((s) => s.id === id)?.slug ?? id;
}

function getDomainSlug(id: string) {
  return MOCK_DOMAINS.find((d) => d.id === id)?.slug ?? id;
}

export default function ReadinessDemoPage() {
  const score = computeReadinessScore(MOCK_READINESS_INPUTS);
  const bandInfo = getReadinessBandInfo(score);

  const systemRollups = rollupBySystem(MOCK_RAW_SYSTEM_PERFORMANCE);
  const domainRollups = rollupByDomain(MOCK_RAW_DOMAIN_PERFORMANCE);
  const skillRollups = rollupBySkill(MOCK_RAW_SKILL_PERFORMANCE);
  const itemTypeRollups = rollupByItemType(MOCK_RAW_ITEM_TYPE_PERFORMANCE);

  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);
  const weakSkills = getWeakRollups(skillRollups);
  const weakItemTypes = getWeakRollups(itemTypeRollups);
  const strongSystems = getStrongRollups(systemRollups);

  const trend = aggregateDailyTrend(MOCK_DAILY_PERFORMANCE);
  const consistency = computeConsistencyScore(MOCK_DAILY_PERFORMANCE);

  const confidenceBuckets = buildConfidenceBuckets(
    MOCK_CONFIDENCE_DATA.map((r) => ({ range: r.range, correct: r.correct, total: r.total }))
  );
  const calibrationScore = computeCalibrationScore(confidenceBuckets);
  const overconfidentRanges = confidenceBuckets
    .filter((b) => !b.calibrated && b.expectedMidpoint < 50)
    .map((b) => b.range);

  const recommendations = generateRecommendations(
    {
      weakSystems,
      weakDomains,
      weakSkills,
      weakItemTypes,
      studyGuideProgress: 40,
      videoProgress: 30,
      lastPrePracticeDate: "2025-02-28",
      overconfidentRanges,
    },
    getSystemSlug,
    getDomainSlug
  );

  const adaptiveIds = selectAdaptiveQuestions(
    MOCK_QUESTION_CANDIDATES,
    weakSystems,
    weakItemTypes,
    { count: 5, preferWeakSystems: true, preferWeakItemTypes: true, mixItemTypes: true }
  );

  const recommendedContent = selectRecommendedContent(
    MOCK_CONTENT_ITEMS,
    weakSystems,
    weakDomains
  );

  const remediationPlan = generateRemediationPlan(
    [...weakSystems, ...weakDomains],
    (type, id) => {
      if (type === "system") return MOCK_SYSTEMS.find((s) => s.id === id)?.name ?? id;
      if (type === "domain") return MOCK_DOMAINS.find((d) => d.id === id)?.name ?? id;
      return id;
    }
  );

  const systemIds = MOCK_SYSTEMS.map((s) => s.id);
  const unlocked = getUnlockedSystems(MOCK_SYSTEM_PROGRESS, SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS);
  const locked = getLockedSystemsWithGap(
    MOCK_SYSTEM_PROGRESS,
    systemIds,
    SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS
  );

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Readiness Engine Demo
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          End-to-end example using seeded mock data. All values computed from mock inputs.
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          1. Readiness Score & Band
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold">{score}%</span>
          <Badge variant={bandInfo.gap <= 0 ? "success" : "warning"}>{bandInfo.label}</Badge>
          <span className="text-sm text-slate-500">Target: {bandInfo.target}%</span>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          2. Mastery Rollups
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Systems</h3>
            {systemRollups.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1">
                <span>{r.name}</span>
                <span>{r.percent}% {r.atTarget ? "✓" : ""}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Domains</h3>
            {domainRollups.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1">
                <span>{r.name}</span>
                <span>{r.percent}% {r.atTarget ? "✓" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          3. Trend & Consistency
        </h2>
        <p className="text-sm text-slate-500 mb-2">
          Consistency score: {consistency}% (higher = more stable performance)
        </p>
        <div className="flex gap-2 flex-wrap">
          {trend.slice(-7).map((t) => (
            <span key={t.date} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
              {t.date}: {t.value}%
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          4. Confidence Calibration
        </h2>
        <p className="text-sm text-slate-500 mb-2">Overall: {calibrationScore}%</p>
        <div className="space-y-2">
          {confidenceBuckets.map((b) => (
            <div key={b.range} className="flex justify-between text-sm">
              <span>{b.range}</span>
              <span>{Math.round(b.actualPercent)}% actual vs ~{Math.round(b.expectedMidpoint)}% expected</span>
              <Badge variant={b.calibrated ? "success" : "warning"} size="sm">
                {b.calibrated ? "OK" : "Mismatch"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          5. Recommendations
        </h2>
        <div className="space-y-2">
          {recommendations.map((r) => (
            <div key={r.id} className="flex justify-between items-start p-2 rounded bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-slate-500">{r.description}</p>
              </div>
              <Badge variant={r.priority === "high" ? "error" : "neutral"} size="sm">
                {r.priority}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          6. Adaptive Question Queue
        </h2>
        <p className="text-sm text-slate-500 mb-2">
          Next 5 questions (prioritizing weak systems/item types): {adaptiveIds.join(", ")}
        </p>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          7. Recommended Content
        </h2>
        <div className="space-y-2">
          {recommendedContent.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.title}</span>
              <span>{c.progress ?? 0}% complete</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          8. Remediation Plan
        </h2>
        <div className="space-y-3">
          {remediationPlan.map((item) => (
            <div key={item.id} className="p-3 rounded bg-slate-50 dark:bg-slate-800/50">
              <p className="font-medium">{item.name}: {item.currentPercent}% → {item.targetPercent}%</p>
              <p className="text-xs text-slate-500">~{item.estimatedQuestions} questions</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          9. System Exam Unlock
        </h2>
        <p className="text-sm text-slate-500 mb-2">
          Unlock threshold: {SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS} questions per system
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-emerald-600 mb-2">Unlocked</h3>
            {unlocked.map((id) => {
              const sys = MOCK_SYSTEMS.find((s) => s.id === id);
              return <p key={id} className="text-sm">{sys?.name ?? id}</p>;
            })}
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-600 mb-2">Locked</h3>
            {locked.map(({ systemId, remaining }) => {
              const sys = MOCK_SYSTEMS.find((s) => s.id === systemId);
              return (
                <p key={systemId} className="text-sm">
                  {sys?.name}: {remaining} more to unlock
                </p>
              );
            })}
          </div>
        </div>
        <Link href="/exam/system" className="text-indigo-600 text-sm mt-4 inline-block">
          View System Exams →
        </Link>
      </Card>
    </div>
  );
}
