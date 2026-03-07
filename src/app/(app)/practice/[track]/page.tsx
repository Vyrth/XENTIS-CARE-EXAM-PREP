import { Card } from "@/components/ui/Card";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";

const SYSTEM_EXAMS = [
  { name: "Cardiovascular", questions: 50, track: "rn" as const },
  { name: "Respiratory", questions: 55, track: "lvn" as const },
  { name: "Renal", questions: 50, track: "fnp" as const },
  { name: "Psychiatric", questions: 60, track: "pmhnp" as const },
];

export default function PracticeTrackPage({
  params,
}: {
  params: { track: string };
}) {
  const { track } = params;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Practice Exams
        </h1>
        <Badge track={track as "lvn" | "rn" | "fnp" | "pmhnp"}>
          {track.toUpperCase()}
        </Badge>
      </div>
      <p className="text-slate-600 dark:text-slate-400">
        50+ question exams per system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SYSTEM_EXAMS.map((exam) => (
          <ActionTile
            key={exam.name}
            href={`/practice/${track}/${exam.name.toLowerCase()}`}
            title={exam.name}
            description={`${exam.questions} questions`}
            icon={Icons["clipboard-list"]}
            trackColor={exam.track}
          />
        ))}
      </div>
    </div>
  );
}
