import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

interface EmptyExamStateProps {
  title: string;
  description: string;
  trackSlug: string;
  examType: "pre-practice" | "practice";
}

export function EmptyExamState({
  title,
  description,
  trackSlug,
  examType,
}: EmptyExamStateProps) {
  const icon = "file-check";
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
      <div className="text-center py-12">
        <span className="inline-block text-4xl mb-4 text-slate-400">{Icons[icon]}</span>
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {description}
        </p>
      </div>
    </Card>
  );
}
