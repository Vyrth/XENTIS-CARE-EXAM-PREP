import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MOCK_STUDY_GUIDES_ADMIN } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import type { WorkflowStatus } from "@/types/admin";

export default function StudyGuideManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Study Guide Editor
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and edit study guides. Sections support markdown.
          </p>
        </div>
        <Link
          href="/admin/study-guides/new"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          + New Guide
        </Link>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">System</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Sections</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_STUDY_GUIDES_ADMIN.map((sg) => {
                const system = MOCK_SYSTEMS.find((s) => s.id === sg.systemId);
                return (
                  <tr key={sg.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{sg.title}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{system?.name ?? sg.systemId}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{sg.sections.length}</td>
                    <td className="p-4"><StatusBadge status={sg.status as WorkflowStatus} /></td>
                    <td className="p-4">
                      <Link href={`/admin/study-guides/${sg.id}`} className="text-indigo-600 hover:underline text-sm">Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
