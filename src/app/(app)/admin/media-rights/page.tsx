import { Card } from "@/components/ui/Card";

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
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                  No media rights records yet. When media_rights table exists, records will appear here.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
