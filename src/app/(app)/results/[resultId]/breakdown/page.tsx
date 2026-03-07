import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MOCK_PERFORMANCE_BY_SYSTEM, MOCK_PERFORMANCE_BY_DOMAIN } from "@/data/mock/performance";
import { ProgressBar } from "@/components/ui/ProgressBar";

type Props = { params: Promise<{ resultId: string }> };

export default async function DomainSystemBreakdownPage({ params }: Props) {
  const { resultId } = await params;
  if (!resultId) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Performance Breakdown
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Domain and system-level performance from your last exam.
      </p>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          By System
        </h2>
        <div className="space-y-6">
          {MOCK_PERFORMANCE_BY_SYSTEM.map((p) => (
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
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          By Domain
        </h2>
        <div className="space-y-6">
          {MOCK_PERFORMANCE_BY_DOMAIN.map((p) => (
            <div key={p.domainId}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {p.name}
                </span>
                <span className="text-sm font-medium">{p.score}%</span>
              </div>
              <ProgressBar value={p.score} size="md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
