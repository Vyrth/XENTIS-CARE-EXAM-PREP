import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  MOCK_QUESTIONS_ADMIN,
  MOCK_REVIEW_QUEUE,
  MOCK_PUBLISH_QUEUE,
  MOCK_USER_ISSUES,
} from "@/data/mock/admin";

export default function AdminOverviewPage() {
  const draftCount = MOCK_QUESTIONS_ADMIN.filter((q) => q.status === "draft").length;
  const inReviewCount = MOCK_REVIEW_QUEUE.length;
  const readyToPublish = MOCK_PUBLISH_QUEUE.length;
  const openIssues = MOCK_USER_ISSUES.filter((i) => i.status === "open").length;

  const tiles = [
    { href: "/admin/curriculum", label: "Curriculum", icon: Icons.book },
    { href: "/admin/questions", label: "Questions", icon: Icons["help-circle"] },
    { href: "/admin/review-queue", label: "Review Queue", value: inReviewCount, icon: Icons.inbox },
    { href: "/admin/publish-queue", label: "Publish Queue", value: readyToPublish, icon: Icons.send },
    { href: "/admin/issue-reports", label: "Issue Reports", value: openIssues, icon: Icons.inbox },
    { href: "/admin/analytics", label: "Analytics", icon: Icons["bar-chart"] },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Admin Overview
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Content management, workflow, and platform administration.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-sm text-slate-500">Draft items</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{draftCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">In review</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{inReviewCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Ready to publish</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{readyToPublish}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Open issues</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{openIssues}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer h-full">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{tile.icon}</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{tile.label}</p>
                  {tile.value !== undefined && (
                    <p className="text-sm text-slate-500">{tile.value} items</p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
