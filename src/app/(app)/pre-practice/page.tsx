import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { EXAM_TRACKS } from "@/config/auth";

export default function PrePracticePage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Pre-Practice Exam
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        150 questions, board-like format. Select your track to begin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXAM_TRACKS.map((track, i) => (
          <ActionTile
            key={track.slug}
            href={`/pre-practice/${track.slug}`}
            title={track.name}
            description="150 questions · 3 hours"
            icon={Icons["file-check"]}
            trackColor={["lvn", "rn", "fnp", "pmhnp"][i] as "lvn" | "rn" | "fnp" | "pmhnp"}
          />
        ))}
      </div>
    </div>
  );
}
