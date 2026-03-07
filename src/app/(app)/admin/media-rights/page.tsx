import { Card } from "@/components/ui/Card";
import { MOCK_MEDIA_RIGHTS } from "@/data/mock/admin";

export default function MediaRightsLibraryPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Media Rights Library
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track licensing, attribution, and expiry for images, videos, and audio.
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          + Add Record
        </button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Media</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">License</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Expiry</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Attribution</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MEDIA_RIGHTS.map((mr) => (
                <tr key={mr.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{mr.title}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 capitalize">{mr.mediaType}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{mr.license}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{mr.licenseExpiry ?? "—"}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-sm max-w-xs truncate">{mr.attribution ?? "—"}</td>
                  <td className="p-4">
                    <button type="button" className="text-indigo-600 hover:underline text-sm">Edit</button>
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
