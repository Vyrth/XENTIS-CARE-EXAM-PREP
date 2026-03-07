import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MOCK_VIDEOS_ADMIN } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import { Icons } from "@/components/ui/icons";
import type { WorkflowStatus } from "@/types/admin";

export default function VideoManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Video Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage video lessons. Link to Media Rights for licensing.
          </p>
        </div>
        <Link
          href="/admin/videos/new"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          + New Video
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_VIDEOS_ADMIN.map((v) => {
          const system = MOCK_SYSTEMS.find((s) => s.id === v.systemId);
          return (
            <Card key={v.id}>
              <div className="flex gap-4">
                <div className="w-24 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  {Icons.video}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white truncate">
                    {v.title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {system?.name ?? v.systemId} · {v.duration} min
                  </p>
                  <div className="mt-2" />
                  <StatusBadge status={v.status as WorkflowStatus} />
                </div>
                <Link
                  href={`/admin/videos/${v.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 self-start"
                >
                  Edit
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
