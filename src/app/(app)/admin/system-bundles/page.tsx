import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default function SystemBundleManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        System Bundle Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Manage system bundles: study guides, videos, questions, and flashcards grouped by system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_SYSTEMS.map((sys) => (
          <Card key={sys.id}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                  {sys.name}
                </h2>
                <Badge track={sys.track} size="sm" className="mt-2">
                  {sys.track.toUpperCase()}
                </Badge>
                <div className="mt-4 space-y-1 text-sm text-slate-500">
                  <p>Study guides: 1</p>
                  <p>Videos: 1</p>
                  <p>Questions: 12</p>
                  <p>Flashcards: 4</p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Edit
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
