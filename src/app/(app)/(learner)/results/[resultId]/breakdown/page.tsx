import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getSessionUser } from "@/lib/auth/session";
import { loadBreakdownForExam } from "@/app/(app)/actions/exam";

type Props = { params: Promise<{ resultId: string }> };

export default async function DomainSystemBreakdownPage({ params }: Props) {
  const { resultId } = await params;
  if (!resultId) notFound();

  const user = await getSessionUser();
  const breakdown = user ? await loadBreakdownForExam(resultId, user.id) : null;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Performance Breakdown
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Domain and system-level performance from your exam.
      </p>

      {!breakdown ? (
        <Card>
          <p className="text-slate-500 dark:text-slate-400">
            No breakdown available for this exam. Complete an exam to see your performance by system and domain.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round(breakdown.percentCorrect)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Correct</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {breakdown.rawScore} / {breakdown.maxScore}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Time</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.floor(breakdown.timeSpentSeconds / 60)} min
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Flagged</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {breakdown.flaggedCount}
                </p>
              </div>
            </div>
          </Card>

          {(() => {
            const WEAK_THRESHOLD = 70;
            const weakSystems = breakdown.bySystem.filter((p) => p.score < WEAK_THRESHOLD);
            const weakDomains = breakdown.byDomain.filter((p) => p.score < WEAK_THRESHOLD);
            if (weakSystems.length === 0 && weakDomains.length === 0) return null;
            return (
              <Card>
                <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
                  Areas to Review
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Systems and domains below {WEAK_THRESHOLD}% — consider extra practice.
                </p>
                <div className="space-y-3">
                  {weakSystems.map((p) => (
                    <div key={p.systemId} className="flex justify-between items-center">
                      <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                      <Badge variant="warning" size="sm">
                        {p.score}% (target {p.target}%)
                      </Badge>
                    </div>
                  ))}
                  {weakDomains.map((p) => (
                    <div key={p.domainId} className="flex justify-between items-center">
                      <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                      <Badge variant="warning" size="sm">
                        {p.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}

          {breakdown.byItemType && Object.keys(breakdown.byItemType).filter((k) => k !== "_unknown").length > 0 && (
            <Card>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
                By Question Type
              </h2>
              <div className="space-y-3">
                {Object.entries(breakdown.byItemType)
                  .filter(([k]) => k !== "_unknown")
                  .map(([typeKey, data]) => (
                    <div key={typeKey} className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 capitalize">
                        {typeKey.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium">
                        {data.correct}/{data.total} ({Math.round(data.percent)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
              By System
            </h2>
            <div className="space-y-6">
              {breakdown.bySystem.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No system data.</p>
              ) : (
                breakdown.bySystem.map((p) => (
                  <div key={p.systemId}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {p.name}
                      </span>
                      <Badge variant={p.score >= p.target ? "success" : "warning"} size="sm">
                        {p.score}% (target {p.target}%)
                      </Badge>
                    </div>
                    <ProgressBar value={p.score} size="md" />
                    <p className="text-sm text-slate-500 mt-1">{p.questions} questions</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
              By Domain
            </h2>
            <div className="space-y-6">
              {breakdown.byDomain.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No domain data.</p>
              ) : (
                breakdown.byDomain.map((p) => (
                  <div key={p.domainId}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {p.name}
                      </span>
                      <span className="text-sm font-medium">{p.score}%</span>
                    </div>
                    <ProgressBar value={p.score} size="md" />
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
