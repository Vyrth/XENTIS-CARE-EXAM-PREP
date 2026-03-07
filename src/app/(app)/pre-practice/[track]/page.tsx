import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { EXAM_TRACKS } from "@/config/auth";

type Props = { params: Promise<{ track: string }> };

export default async function PrePracticeLobbyPage({ params }: Props) {
  const { track } = await params;
  const trackConfig = EXAM_TRACKS.find((t) => t.slug === track);
  if (!trackConfig) notFound();

  const rules = [
    "150 questions, single best answer format",
    "3 hours total time",
    "Lab reference, calculator, and whiteboard available",
    "Flag questions for review",
    "No pausing — timer runs continuously",
  ];

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <Badge track={track as "lvn" | "rn" | "fnp" | "pmhnp"} className="mb-2">
          {trackConfig.name}
        </Badge>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Pre-Practice Exam Lobby
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Board-style exam simulation. Review the rules before starting.
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Exam Rules
        </h2>
        <ul className="space-y-3">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <span className="text-emerald-500 shrink-0 mt-0.5">{Icons.check}</span>
              {rule}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href={`/pre-practice/${track}/tutorial`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Start Tutorial
          {Icons.chevronRight}
        </Link>
        <Link
          href="/pre-practice"
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Back to Tracks
        </Link>
      </div>
    </div>
  );
}
