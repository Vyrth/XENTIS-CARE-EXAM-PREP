import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { guardTrackParam, getPrimaryTrack } from "@/lib/auth/track";
import { loadSystemExams } from "@/lib/exam/loaders";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyExamState } from "@/components/exam/EmptyExamState";

export default async function PracticeTrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track: paramTrack } = await params;
  const user = await getSessionUser();
  const guard = await guardTrackParam(user?.id ?? null, paramTrack, "practice");
  if (guard.redirect) redirect(guard.path);
  const trackSlug = guard.trackSlug;

  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const exams = await loadSystemExams(trackId);
  const hasExams = exams.length > 0;

  if (!hasExams) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Practice Exams
          </h1>
          <Badge track={trackSlug}>{trackSlug.toUpperCase()}</Badge>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          50+ question exams per system.
        </p>
        <EmptyExamState
          title="No practice exams for your track yet"
          description={`System exams for ${trackSlug.toUpperCase()} will appear here once configured. Each exam has 50+ questions focused on a single body system.`}
          trackSlug={trackSlug}
          examType="practice"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Practice Exams
        </h1>
        <Badge track={trackSlug}>{trackSlug.toUpperCase()}</Badge>
      </div>
      <p className="text-slate-600 dark:text-slate-400">
        50+ question exams per system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => (
          <ActionTile
            key={exam.id}
            href={`/exam/system/${exam.systemId}`}
            title={exam.name}
            description={`${exam.questionCount} questions · ${exam.durationMinutes} min`}
            icon={Icons["clipboard-list"]}
            trackColor={trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"}
          />
        ))}
      </div>
    </div>
  );
}
