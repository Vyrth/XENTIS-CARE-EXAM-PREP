"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default function NewStudyGuidePage() {
  const router = useRouter();

  const handleCreate = () => {
    router.push("/admin/study-guides/sg-new");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        New Study Guide
      </h1>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" placeholder="e.g. Cardiovascular System" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">System</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              {MOCK_SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Link href="/admin/study-guides" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
          Cancel
        </Link>
        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          Create as Draft
        </button>
      </div>
    </div>
  );
}
