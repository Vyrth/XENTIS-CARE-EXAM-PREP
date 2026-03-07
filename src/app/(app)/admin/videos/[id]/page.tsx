"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { MOCK_VIDEOS_ADMIN } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import { MOCK_MEDIA_RIGHTS } from "@/data/mock/admin";
import type { WorkflowStatus } from "@/types/admin";

export default function VideoEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const video = MOCK_VIDEOS_ADMIN.find((v) => v.id === id);

  if (!video) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Video not found.</p>
        <Link href="/admin/videos" className="text-indigo-600 mt-4 inline-block">Back</Link>
      </div>
    );
  }

  const mediaRights = video.mediaRightsId
    ? MOCK_MEDIA_RIGHTS.find((mr) => mr.id === video.mediaRightsId)
    : null;
  const system = MOCK_SYSTEMS.find((s) => s.id === video.systemId);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/videos" className="text-slate-600 hover:underline">← Back</Link>
        <div className="flex items-center gap-4">
          <StatusBadge status={video.status as WorkflowStatus} />
          <StatusTransitionButton currentStatus={video.status as WorkflowStatus} onTransition={() => {}} />
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Edit: {video.title}
      </h1>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" defaultValue={video.title} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">System</label>
            <select defaultValue={video.systemId} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              {MOCK_SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (min)</label>
            <input type="number" defaultValue={video.duration} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input type="url" defaultValue={video.url} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-slate-900 dark:text-white mb-4">Media Rights</h3>
        <p className="text-sm text-slate-500 mb-4">
          Link this video to a Media Rights record for licensing and attribution.
        </p>
        <select
          defaultValue={video.mediaRightsId ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        >
          <option value="">— No media rights —</option>
          {MOCK_MEDIA_RIGHTS.filter((mr) => mr.mediaType === "video").map((mr) => (
            <option key={mr.id} value={mr.id}>{mr.title} ({mr.license})</option>
          ))}
        </select>
        {mediaRights && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm">
            <p><strong>License:</strong> {mediaRights.license}</p>
            {mediaRights.licenseExpiry && <p><strong>Expiry:</strong> {mediaRights.licenseExpiry}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
