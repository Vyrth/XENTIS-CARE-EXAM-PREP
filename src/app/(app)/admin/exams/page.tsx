import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadExamTemplatesForAssembly,
  loadSystemExamsForAssembly,
} from "@/lib/admin/exam-assembly-loaders";
import { loadPrePracticeSeriesStatus } from "@/app/(app)/actions/pre-practice";
import { Icons } from "@/components/ui/icons";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function AdminExamsPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [tracks, templates, systemExams, prePracticeStatus] = await Promise.all([
    loadExamTracks(),
    loadExamTemplatesForAssembly(trackId ?? null),
    loadSystemExamsForAssembly(trackId ?? null),
    loadPrePracticeSeriesStatus(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Exam Assembly Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Build practice exams, pre-practice exams, and system exams from approved question pools.
          </p>
        </div>
        <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {Icons["clipboard-list"]} Practice & Pre-Practice Templates
          </h2>
          {templates.length === 0 ? (
            <p className="text-slate-500 py-4">
              No exam templates. Create pre_practice or custom templates via seed or admin.
            </p>
          ) : (
            <ul className="space-y-3">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/exams/templates/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <TrackBadge
                        slug={
                          tracks.find((tr) => tr.id === t.examTrackId)?.slug as
                            | "lvn"
                            | "rn"
                            | "fnp"
                            | "pmhnp"
                        }
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                        <p className="text-xs text-slate-500">
                          {t.questionCount}q · {t.durationMinutes}min · {t.poolCount} in pool
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400">{Icons.chevronRight}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {Icons.book} System Exams (50+ per system)
          </h2>
          {systemExams.length === 0 ? (
            <p className="text-slate-500 py-4">
              No system exams. Create via seed or admin.
            </p>
          ) : (
            <ul className="space-y-3">
              {systemExams.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/exams/system/${e.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <TrackBadge
                        slug={
                          tracks.find((tr) => tr.id === e.examTrackId)?.slug as
                            | "lvn"
                            | "rn"
                            | "fnp"
                            | "pmhnp"
                        }
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{e.name}</p>
                        <p className="text-xs text-slate-500">
                          {e.systemName} · {e.questionCount}q · {e.poolCount} in pool
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400">{Icons.chevronRight}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          {Icons["layers"]} Pre-Practice Series I–V
        </h2>
        {prePracticeStatus.length === 0 ? (
          <p className="text-slate-500 py-4">
            No Pre-Practice series. Run migration <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">20250313000001</code> and <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">20250313000002</code>.
          </p>
        ) : (
          <ul className="space-y-2">
            {prePracticeStatus.map((s) => (
              <li key={s.trackId} className="flex items-center gap-3">
                <TrackBadge slug={s.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
                <span className="text-slate-700 dark:text-slate-300">{s.trackName}</span>
                <span className="text-sm text-slate-500">
                  {s.versionCount} versions: {s.versions.map((v) => v.versionKey).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
        <h3 className="font-medium text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
          {Icons.alertTriangle} Pre-Practice Rule
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Pre-practice exams require 150 questions per track. Ensure the pool has enough approved questions and that composition aligns with blueprint weights. I–V use difficulty tiers from <code className="text-xs">question_adaptive_profiles</code>.
        </p>
      </Card>
    </div>
  );
}
