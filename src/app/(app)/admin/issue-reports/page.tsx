import { Card } from "@/components/ui/Card";
import { MOCK_USER_ISSUES } from "@/data/mock/admin";

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  dismissed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function UserIssueReportsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        User Issue Reports
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Reports from users about accuracy, typos, clarity, or other content issues.
      </p>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Entity</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Description</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Date</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_USER_ISSUES.map((issue) => (
                <tr key={issue.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 text-slate-600 dark:text-slate-400">
                    {issue.entityType} / {issue.entityId}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 capitalize">{issue.issueType}</td>
                  <td className="p-4 text-slate-900 dark:text-white max-w-md">{issue.description}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ISSUE_STATUS_COLORS[issue.status] ?? ""}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button type="button" className="text-indigo-600 hover:underline text-sm">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
