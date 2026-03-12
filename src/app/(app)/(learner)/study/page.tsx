import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EXAM_TRACKS } from "@/config/auth";
import { Icons } from "@/components/ui/icons";

export default function StudyPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Study
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Choose your track to access study materials, guides, and videos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXAM_TRACKS.map((track, i) => (
          <Link key={track.slug} href={`/study/${track.slug}`} className="block">
            <Card
              variant="elevated"
              className="hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center gap-3">
                {Icons["book-open"]}
                <div>
                  <p className="font-heading font-semibold text-slate-900 dark:text-white">
                    {track.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Study materials
                  </p>
                </div>
                <Badge
                  track={["lvn", "rn", "fnp", "pmhnp"][i] as "lvn" | "rn" | "fnp" | "pmhnp"}
                  size="sm"
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
