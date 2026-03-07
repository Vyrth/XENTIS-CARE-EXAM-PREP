import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { MOCK_SYSTEMS, MOCK_TOPICS } from "@/data/mock/systems";

export default function TopicHubPage() {
  const topicsBySystem = MOCK_SYSTEMS.map((sys) => ({
    system: sys,
    topics: MOCK_TOPICS.filter((t) => t.systemId === sys.id),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Topic Hub
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Browse topics by system. Each topic links to study guides, videos, and practice questions.
      </p>

      <div className="space-y-8">
        {topicsBySystem.map(({ system, topics }) => (
          <Card key={system.id}>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              {system.name}
              <Badge track={system.track} size="sm">
                {system.track.toUpperCase()}
              </Badge>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/questions/topic/${topic.slug}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {topic.name}
                  </span>
                  <span className="inline-block text-slate-400">{Icons.chevronRight}</span>
                </Link>
              ))}
            </div>
            {topics.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No topics yet for this system.
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
