import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import {
  getUnlockedSystems,
  getLockedSystemsWithGap,
} from "@/lib/readiness/system-completion";
import { MOCK_SYSTEM_PROGRESS } from "@/data/mock/readiness";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import { SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS } from "@/config/readiness";

export default function SystemExamListPage() {
  const systemIds = MOCK_SYSTEMS.map((s) => s.id);
  const unlocked = getUnlockedSystems(MOCK_SYSTEM_PROGRESS, SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS);
  const locked = getLockedSystemsWithGap(
    MOCK_SYSTEM_PROGRESS,
    systemIds,
    SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        System Exams
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        50+ question exams per body system. Unlock each system by answering at least{" "}
        {SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS} practice questions in that system.
      </p>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Unlocked Systems
        </h2>
        {unlocked.length === 0 ? (
          <p className="text-slate-500">
            Complete practice questions in any system to unlock its full exam.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_SYSTEMS.filter((s) => unlocked.includes(s.id)).map((sys, i) => (
              <Link key={sys.id} href={`/exam/system/${sys.id}`}>
                <ActionTile
                  href={`/exam/system/${sys.id}`}
                  title={sys.name}
                  description="50+ questions · Full system exam"
                  icon={Icons["file-check"]}
                  trackColor={["rn", "lvn", "fnp", "pmhnp"][i] as "rn" | "lvn" | "fnp" | "pmhnp"}
                />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {locked.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Locked — Complete Practice to Unlock
          </h2>
          <div className="space-y-3">
            {locked.map(({ systemId, remaining }) => {
              const sys = MOCK_SYSTEMS.find((s) => s.id === systemId);
              if (!sys) return null;
              const progress = MOCK_SYSTEM_PROGRESS.find((p) => p.systemId === systemId);
              const answered = progress?.questionsAnswered ?? 0;
              return (
                <div
                  key={systemId}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{sys.name}</p>
                    <p className="text-sm text-slate-500">
                      {answered} / {SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS} questions answered
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {remaining} more to unlock
                    </Badge>
                    <Link
                      href={`/questions/system/${sys.slug}`}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
