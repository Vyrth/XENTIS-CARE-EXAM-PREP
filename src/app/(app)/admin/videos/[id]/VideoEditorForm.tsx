"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import type { WorkflowStatus } from "@/types/admin";
import type { VideoAdmin } from "@/types/admin";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";

const EMPTY_SYSTEMS: { id: string; name: string }[] = [];
const EMPTY_MEDIA_RIGHTS: { id: string; title: string; license: string; mediaType: string; licenseExpiry?: string }[] = [];

export function VideoEditorForm({
  tracks,
  video,
  systems = EMPTY_SYSTEMS,
  mediaRightsList = EMPTY_MEDIA_RIGHTS,
}: {
  tracks: ExamTrackOption[];
  video: VideoAdmin | undefined;
  systems?: { id: string; name: string }[];
  mediaRightsList?: { id: string; title: string; license: string; mediaType: string; licenseExpiry?: string }[];
}) {
  const slug = (video as { examTrackSlug?: string })?.examTrackSlug;
  const resolvedTrackId = (video as { examTrackId?: string })?.examTrackId ?? tracks.find((t) => t.slug === slug)?.id ?? "";
  const [trackId, setTrackId] = useState(resolvedTrackId);

  if (!video) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Video not found.</p>
        <Link href="/admin/videos" className="text-indigo-600 mt-4 inline-block">Back</Link>
      </div>
    );
  }

  const mediaRights = video.mediaRightsId
    ? mediaRightsList.find((mr) => mr.id === video.mediaRightsId)
    : null;
  const displayTrackSlug = slug ?? (trackId ? tracks.find((t) => t.id === trackId)?.slug : null);
  const hasTrack = !!trackId || !!slug;
  const blockPublishReason = !hasTrack ? "Assign a track before publishing" : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/videos" className="text-slate-600 hover:underline">← Back</Link>
        <div className="flex items-center gap-4">
          <TrackBadge slug={displayTrackSlug ?? null} />
          <StatusBadge status={video.status as WorkflowStatus} />
          <StatusTransitionButton
            currentStatus={video.status as WorkflowStatus}
            onTransition={() => {}}
            blockPublishReason={blockPublishReason}
          />
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Edit: {video.title}
      </h1>

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
            <input type="text" defaultValue={video.title} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">System</label>
            <select defaultValue={video.systemId} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              {systems.map((s) => (
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
          {mediaRightsList.filter((mr) => mr.mediaType === "video").map((mr) => (
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
