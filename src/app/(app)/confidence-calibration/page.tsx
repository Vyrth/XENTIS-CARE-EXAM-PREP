import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  buildConfidenceBuckets,
  computeCalibrationScore,
} from "@/lib/readiness/confidence-calibration";
import { MOCK_CONFIDENCE_DATA } from "@/data/mock/performance";

export default function ConfidenceCalibrationPage() {
  const buckets = buildConfidenceBuckets(
    MOCK_CONFIDENCE_DATA.map((r) => ({ range: r.range, correct: r.correct, total: r.total }))
  );
  const calibrationScore = computeCalibrationScore(buckets);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Confidence Calibration
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        How well does your confidence match your accuracy? Well-calibrated learners know when they
        know.
      </p>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
            Overall Calibration Score
          </h2>
          <Badge variant={calibrationScore >= 70 ? "success" : "warning"} size="sm">
            {calibrationScore}%
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Weighted by question volume. Higher = your confidence better matches actual accuracy.
        </p>

        <h3 className="font-medium text-slate-900 dark:text-white mb-4">
          By Confidence Range
        </h3>
        <div className="space-y-6">
          {buckets.map((row) => (
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
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Tips
        </h2>
        <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
          <li>• Low confidence + correct = underconfident; trust your knowledge more.</li>
          <li>• High confidence + wrong = overconfident; review those topics.</li>
          <li>• Calibrated = your confidence matches your accuracy within tolerance.</li>
        </ul>
      </Card>
    </div>
  );
}
