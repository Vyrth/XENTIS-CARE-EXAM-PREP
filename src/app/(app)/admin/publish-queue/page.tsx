"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { MOCK_PUBLISH_QUEUE } from "@/data/mock/admin";

const EDIT_LINKS: Record<string, string> = {
  question: "/admin/questions",
  study_guide: "/admin/study-guides",
};

export default function PublishQueuePage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Publish Queue
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Approved items ready to publish. Review and publish to make them live.
      </p>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PUBLISH_QUEUE.map((item) => {
                const baseHref = EDIT_LINKS[item.type] ?? "/admin";
                const editHref = `${baseHref}/${item.id}`;
                return (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 text-slate-600 dark:text-slate-400 capitalize">{item.type.replace("_", " ")}</td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{item.title}</td>
                    <td className="p-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-4">
                      <Link href={editHref} className="text-indigo-600 hover:underline text-sm mr-4">View</Link>
                      <StatusTransitionButton currentStatus={item.status} onTransition={() => {}} />
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
