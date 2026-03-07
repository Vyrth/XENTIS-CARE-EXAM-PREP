import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS } from "@/data/mock/systems";

export default function CurriculumManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Curriculum Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Plan curriculum by track, system, and topic. Map content and questions to learning objectives.
      </p>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Tracks & Systems
        </h2>
        <div className="space-y-4">
          {MOCK_SYSTEMS.map((sys) => (
            <div
              key={sys.id}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{sys.name}</p>
                <p className="text-sm text-slate-500">Track: {sys.track.toUpperCase()}</p>
              </div>
              <Badge track={sys.track} size="sm">
                {sys.track}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Domains
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MOCK_DOMAINS.map((dom) => (
            <div
              key={dom.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <p className="font-medium text-slate-900 dark:text-white">{dom.name}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Topics by System
        </h2>
        <div className="space-y-4">
          {MOCK_SYSTEMS.map((sys) => {
            const topics = MOCK_TOPICS.filter((t) => t.systemId === sys.id);
            return (
              <div key={sys.id}>
                <p className="font-medium text-slate-600 dark:text-slate-400 mb-2">{sys.name}</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t.id}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
