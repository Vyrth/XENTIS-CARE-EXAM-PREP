import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatBlock } from "@/components/ui/StatBlock";
import { Badge } from "@/components/ui/Badge";

export default function ProgressPage() {
  const systems = [
    { name: "Cardiovascular", pct: 68, track: "rn" as const },
    { name: "Respiratory", pct: 45, track: "lvn" as const },
    { name: "Renal", pct: 32, track: "fnp" as const },
    { name: "Psychiatric", pct: 55, track: "pmhnp" as const },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Progress
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBlock label="Overall Readiness" value="62%" />
        <StatBlock label="Questions Answered" value="342" />
        <StatBlock label="Study Streak" value="5 days" />
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          By System
        </h2>
        <div className="space-y-6">
          {systems.map((sys) => (
            <div key={sys.name}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {sys.name}
                </span>
                <Badge track={sys.track} size="sm">
                  {sys.pct}%
                </Badge>
              </div>
              <ProgressBar value={sys.pct} trackSlug={sys.track} size="md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
