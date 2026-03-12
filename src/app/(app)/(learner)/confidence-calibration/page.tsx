import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  buildConfidenceBuckets,
  computeCalibrationScore,
} from "@/lib/readiness/confidence-calibration";
import { loadConfidenceData } from "@/lib/analytics/loaders";

export default async function ConfidenceCalibrationPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";

  const rawData = await loadConfidenceData(user?.id ?? null, trackId);
  const buckets = buildConfidenceBuckets(rawData);
  const calibrationScore = computeCalibrationScore(buckets);

  const overconfidentRanges = buckets.filter(
    (b) => b.total > 0 && b.actualPercent < b.expectedMidpoint - 15
  );
  const underconfidentRanges = buckets.filter(
    (b) => b.total > 0 && b.actualPercent > b.expectedMidpoint + 15
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Confidence Calibration
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        How well does your confidence match your accuracy? Well-calibrated learners know when they
        know.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
            Overall Calibration Score
          </h2>
          <Badge variant={buckets.length === 0 ? "neutral" : calibrationScore >= 70 ? "success" : calibrationScore >= 50 ? "warning" : "error"} size="sm">
            {buckets.length === 0 ? "No data yet" : `${calibrationScore}%`}
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Weighted by question volume. Higher = your confidence better matches actual accuracy.
        </p>

        <h3 className="font-medium text-slate-900 dark:text-white mb-4">
          By Confidence Range
        </h3>
        <div className="space-y-6">
          {buckets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">
                No confidence data yet. Answer questions with confidence ratings to see your calibration.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                When the question flow includes a confidence prompt (e.g. &quot;How confident are you?&quot;), your responses will appear here.
              </p>
            </div>
          ) : (
          buckets.map((row) => (
            <div
              key={row.range}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-white">
                  {row.range} confident
                </span>
                <p className="text-sm text-slate-500 mt-0.5">
                  {row.correct} / {row.total} correct (
                  {Math.round(row.actualPercent)}% actual vs ~
                  {Math.round(row.expectedMidpoint)}% expected)
                </p>
              </div>
              <Badge variant={row.calibrated ? "success" : "warning"} size="sm">
                {row.calibrated ? "Calibrated" : "Mismatch"}
              </Badge>
            </div>
          ))
          )}
        </div>
      </Card>

      {overconfidentRanges.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Overconfident Ranges
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            You reported high confidence but accuracy was lower. Review those topics.
          </p>
          <div className="flex flex-wrap gap-2">
            {overconfidentRanges.map((b) => (
              <Badge key={b.range} variant="warning" size="sm">
                {b.range}: {Math.round(b.actualPercent)}% actual vs ~{Math.round(b.expectedMidpoint)}% expected
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {underconfidentRanges.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Underconfident Ranges
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            You reported low confidence but accuracy was higher. Trust your knowledge more.
          </p>
          <div className="flex flex-wrap gap-2">
            {underconfidentRanges.map((b) => (
              <Badge key={b.range} variant="neutral" size="sm">
                {b.range}: {Math.round(b.actualPercent)}% actual vs ~{Math.round(b.expectedMidpoint)}% expected
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Tips
        </h2>
        <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
          <li>• Low confidence + correct = underconfident; trust your knowledge more.</li>
          <li>• High confidence + wrong = overconfident; review those topics.</li>
          <li>• Calibrated = your confidence matches your accuracy within ±15%.</li>
        </ul>
      </Card>
    </div>
  );
}
