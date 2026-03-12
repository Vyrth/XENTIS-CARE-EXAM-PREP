"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";

export function NewVideoForm({ tracks, systems = [] }: { tracks: ExamTrackOption[]; systems?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [trackId, setTrackId] = useState("");

  const handleCreate = () => {
    if (!trackId) return;
    router.push("/admin/videos/v-new");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        New Video
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Every video must be assigned to a track. Select track first.
      </p>

      <Card>
        <div className="space-y-4">
          <AdminTrackSelect
            tracks={tracks}
            value={trackId}
            onChange={setTrackId}
            required
          />
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" placeholder="e.g. Heart Failure Pathophysiology" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">System</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              {systems.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (min)</label>
            <input type="number" placeholder="12" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input type="url" placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Link href="/admin/videos" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
          Cancel
        </Link>
        <button
          onClick={handleCreate}
          disabled={!trackId}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create as Draft
        </button>
      </div>
    </div>
  );
}
