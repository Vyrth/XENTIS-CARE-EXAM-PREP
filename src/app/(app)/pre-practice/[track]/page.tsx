import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { guardTrackParam, getPrimaryTrack } from "@/lib/auth/track";
import { loadPrePracticeTemplate, loadPrePracticeVersions } from "@/lib/exam/loaders";
import { loadQuestionCounts } from "@/lib/questions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { EXAM_TRACKS } from "@/config/auth";
import { EmptyExamState } from "@/components/exam/EmptyExamState";
import { PRE_PRACTICE_CONFIG } from "@/types/exam";

type Props = { params: Promise<{ track: string }> };

export default async function PrePracticeLobbyPage({ params }: Props) {
  const { track: paramTrack } = await params;
  const trackConfig = EXAM_TRACKS.find((t) => t.slug === paramTrack);
  if (!trackConfig) notFound();

  const user = await getSessionUser();
  const guard = await guardTrackParam(user?.id ?? null, paramTrack, "pre-practice");
  if (guard.redirect) redirect(guard.path);
  const track = guard.trackSlug;

  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const [template, versions, counts] = await Promise.all([
    loadPrePracticeTemplate(trackId),
    loadPrePracticeVersions(trackId),
    loadQuestionCounts(trackId),
  ]);

  const hasEnoughQuestions = counts.total >= 150;
  const hasVersions = versions.length > 0;
  const hasTemplate = !!template;
  const canStart = (hasVersions || hasTemplate) && hasEnoughQuestions;

  if (!hasVersions && !hasTemplate) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
        <Badge track={track} className="mb-2">
          {trackConfig.name}
        </Badge>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Pre-Practice Exam
        </h1>
        <EmptyExamState
          title="No Pre-Practice exam for your track yet"
          description={`The Pre-Practice exam for ${track.toUpperCase()} is not configured. This 150-question diagnostic will appear once exam templates are set up.`}
          trackSlug={track}
          examType="pre-practice"
        />
        <Link
          href="/pre-practice"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Back
        </Link>
      </div>
    );
  }

  if (!hasEnoughQuestions) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
        <Badge track={track} className="mb-2">
          {trackConfig.name}
        </Badge>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Pre-Practice Exam
        </h1>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="text-center py-8">
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Not enough questions yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              The Pre-Practice exam requires at least 150 questions. Your track has {counts.total} approved questions.
            </p>
          </div>
        </Card>
        <Link
          href="/pre-practice"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Back
        </Link>
      </div>
    );
  }

  const questionCount = template?.questionCount ?? PRE_PRACTICE_CONFIG.questionCount;
  const durationHours = Math.floor((template?.durationMinutes ?? PRE_PRACTICE_CONFIG.timeLimitMinutes) / 60);
  const rules = [
    `${questionCount} questions, single best answer format`,
    `${durationHours} hours total time`,
    "Lab reference, calculator, and whiteboard available",
    "Flag questions for review",
    "No pausing — timer runs continuously",
  ];

  const seed = Date.now();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <Badge track={track} className="mb-2">
          {trackConfig.name}
        </Badge>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Pre-Practice Exam Lobby
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Board-style exam simulation. Five exams by difficulty — start with I for a diagnostic.
        </p>
      </div>

      {hasVersions && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Pre-Practice Series I–V
          </h2>
          <div className="space-y-3">
            {versions.map((v) => (
              <Link
                key={v.id}
                href={`/exam/pre_practice_${v.versionKey}-${track}-${seed}`}
                className="block p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {v.displayName}
                      {v.versionKey === "i" && (
                        <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                          Diagnostic — identifies weak areas
                        </span>
                      )}
                    </span>
                    {v.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{v.description}</p>
                    )}
                  </div>
                  <span className="text-slate-500 shrink-0">{Icons.chevronRight}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!hasVersions && hasTemplate && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Pre-Practice Exam
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Single pre-practice exam (legacy). Upgrade to Pre-Practice I–V for difficulty-based series.
          </p>
          <Link
            href={`/exam/pre_practice-${track}-${seed}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Exam
            {Icons.chevronRight}
          </Link>
        </Card>
      )}

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Exam Rules
        </h2>
        <ul className="space-y-3">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-emerald-500 shrink-0 mt-0.5">{Icons.check}</span>
              {rule}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-4">
        <Link
          href={`/pre-practice/${track}/tutorial`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-fit"
        >
          Start Tutorial First
        </Link>
        <Link
          href="/pre-practice"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 w-fit"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
