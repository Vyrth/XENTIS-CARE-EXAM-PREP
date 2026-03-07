import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MOCK_QUESTIONS_ADMIN } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import type { WorkflowStatus } from "@/types/admin";

export default function QuestionManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Question Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage questions. Full workflow from draft to published.
          </p>
        </div>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          + New Question
        </Link>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">ID</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Stem</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">System</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_QUESTIONS_ADMIN.map((q) => {
                const system = MOCK_SYSTEMS.find((s) => s.id === q.systemId);
                return (
                  <tr
                    key={q.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-4 font-mono text-sm">{q.id}</td>
                    <td className="p-4 text-slate-900 dark:text-white max-w-md truncate">
                      {q.stem}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {system?.name ?? q.systemId}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={q.status as WorkflowStatus} />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                      >
                        Edit
                      </Link>
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
