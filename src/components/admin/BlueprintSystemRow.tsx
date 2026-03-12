"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type CoverageLevel,
  type SystemCoverage,
  type TopicCoverage,
} from "@/lib/admin/blueprint-coverage";
import { GenerateFromGapButtons } from "@/components/admin/GenerateFromGapButtons";

const COVERAGE_COLORS: Record<CoverageLevel, string> = {
  none: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  adequate: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  strong: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  none: "No coverage",
  low: "Low",
  adequate: "Adequate",
  strong: "Strong",
};

function CoverageBadge({ level }: { level: CoverageLevel }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COVERAGE_COLORS[level]}`}
    >
      {COVERAGE_LABELS[level]}
    </span>
  );
}

function ContentIndicators({
  questions,
  hasGuide,
  hasVideo,
  hasDeck,
  hasExam,
}: {
  questions: number;
  hasGuide: boolean;
  hasVideo: boolean;
  hasDeck: boolean;
  hasExam: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className={questions > 0 ? "text-emerald-600" : "text-slate-400"}>Q:{questions}</span>
      <span className={hasGuide ? "text-emerald-600" : "text-slate-400"}>G</span>
      <span className={hasVideo ? "text-emerald-600" : "text-slate-400"}>V</span>
      <span className={hasDeck ? "text-emerald-600" : "text-slate-400"}>F</span>
      <span className={hasExam ? "text-emerald-600" : "text-slate-400"}>E</span>
    </div>
  );
}

function CreateLinks({
  trackId,
  level,
  hasGuide,
  hasVideo,
  hasDeck,
  hasExam,
  questionCount,
}: {
  trackId: string;
  level: CoverageLevel;
  hasGuide: boolean;
  hasVideo: boolean;
  hasDeck: boolean;
  hasExam: boolean;
  questionCount: number;
}) {
  if (level === "strong") return null;
  const links: { href: string; label: string }[] = [];
  if (questionCount === 0)
    links.push({ href: `/admin/questions/new?trackId=${trackId}`, label: "Questions" });
  if (!hasGuide) links.push({ href: `/admin/study-guides/new?trackId=${trackId}`, label: "Guide" });
  if (!hasVideo) links.push({ href: `/admin/videos/new?trackId=${trackId}`, label: "Video" });
  if (!hasDeck) links.push({ href: `/admin/flashcards?trackId=${trackId}`, label: "Deck" });
  if (!hasExam && questionCount >= 50)
    links.push({ href: `/admin/curriculum?trackId=${trackId}`, label: "Exam" });

  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          +{l.label}
        </Link>
      ))}
    </div>
  );
}

function TopicRow({
  topic,
  trackId,
  systemId,
}: {
  topic: TopicCoverage;
  trackId: string;
  systemId: string;
}) {
  const isLow = topic.coverageLevel === "none" || topic.coverageLevel === "low";
  return (
    <div
      className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
        isLow ? "bg-amber-50 dark:bg-amber-900/10" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CoverageBadge level={topic.coverageLevel} />
        <span className="text-slate-700 dark:text-slate-300 truncate">{topic.topicName}</span>
        <ContentIndicators
          questions={topic.questionCount}
          hasGuide={topic.hasGuide}
          hasVideo={topic.hasVideo}
          hasDeck={topic.hasDeck}
          hasExam={topic.hasExamInclusion}
        />
      </div>
      {isLow && (
        <div className="flex flex-col items-end gap-1">
          <CreateLinks
            trackId={trackId}
            level={topic.coverageLevel}
            hasGuide={topic.hasGuide}
            hasVideo={topic.hasVideo}
            hasDeck={topic.hasDeck}
            hasExam={topic.hasExamInclusion}
            questionCount={topic.questionCount}
          />
          <GenerateFromGapButtons
            trackId={trackId}
            systemId={systemId}
            topicId={topic.topicId}
            domainId={topic.domainId}
            show={["questions", "guide", "flashcards", "highYield"]}
            compact
          />
        </div>
      )}
    </div>
  );
}

export function BlueprintSystemRow({
  sys,
  trackId,
}: {
  sys: SystemCoverage;
  trackId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLow = sys.coverageLevel === "none" || sys.coverageLevel === "low";

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between gap-4 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
          isLow ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
        }`}
        onClick={() => setIsExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-400 text-xs w-4">
            {sys.topics.length > 0 ? (isExpanded ? "▼" : "▶") : ""}
          </span>
          <CoverageBadge level={sys.coverageLevel} />
          <span className="font-medium text-slate-900 dark:text-white">{sys.systemName}</span>
          {sys.weightPct > 0 && (
            <span className="text-xs text-slate-500">{sys.weightPct}%</span>
          )}
          <ContentIndicators
            questions={sys.questionCount}
            hasGuide={sys.guideCount > 0}
            hasVideo={sys.videoCount > 0}
            hasDeck={sys.deckCount > 0}
            hasExam={sys.hasSystemExam}
          />
        </div>
        {isLow && (
          <div className="flex flex-col items-end gap-1">
            <CreateLinks
              trackId={trackId}
              level={sys.coverageLevel}
              hasGuide={sys.guideCount > 0}
              hasVideo={sys.videoCount > 0}
              hasDeck={sys.deckCount > 0}
              hasExam={sys.hasSystemExam}
              questionCount={sys.questionCount}
            />
            <GenerateFromGapButtons
              trackId={trackId}
              systemId={sys.systemId}
              topicId={sys.topics[0]?.topicId}
              domainId={sys.domainId || undefined}
              show={["questions", "guide", "flashcards", "highYield"]}
              compact
            />
          </div>
        )}
      </div>
      {isExpanded && sys.topics.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-2 space-y-1">
          <p className="text-xs font-medium text-slate-500 px-2 mb-2">Topics</p>
          {sys.topics.map((t) => (
            <TopicRow key={t.topicId} topic={t} trackId={trackId} systemId={sys.systemId} />
          ))}
        </div>
      )}
    </div>
  );
}
