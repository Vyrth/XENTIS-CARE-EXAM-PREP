import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadAllTopicsForAdmin,
  loadDomainsAdmin,
  loadQuestionTypesAdmin,
} from "@/lib/admin/question-studio-loaders";
import { loadImportBatches } from "@/lib/admin/import-batch-loaders";
import { BulkImportWorkflow } from "@/components/admin/BulkImportWorkflow";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function BulkImportPage({ searchParams }: Props) {
  const { trackId } = await searchParams;

  const [tracks, systems, topics, domains, questionTypes, batches] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadDomainsAdmin(),
    loadQuestionTypesAdmin(),
    loadImportBatches(10),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link href="/admin/questions" className="text-slate-600 dark:text-slate-400 hover:underline text-sm">
          ← Questions
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mt-2">
          Bulk Question Import
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Import structured JSON or CSV. All imports create draft questions. Use defaults for track/system/type when not in file.
        </p>
      </div>

      <BulkImportWorkflow
        tracks={tracks}
        systems={systems}
        topics={topics}
        domains={domains}
        questionTypes={questionTypes}
        defaultTrackId={trackId ?? undefined}
      />

      {batches.length > 0 && (
        <div className="mt-8">
          <h2 className="font-medium text-slate-900 dark:text-white mb-3">Recent import batches</h2>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left p-3 font-medium text-slate-500">Date</th>
                  <th className="text-left p-3 font-medium text-slate-500">Source</th>
                  <th className="text-left p-3 font-medium text-slate-500">Imported</th>
                  <th className="text-left p-3 font-medium text-slate-500">Failed</th>
                  <th className="text-left p-3 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">{b.fileName ?? b.sourceName ?? "—"}</td>
                    <td className="p-3">{b.importedCount}</td>
                    <td className="p-3">{b.failedCount}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        b.status === "completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                        b.status === "partial" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
