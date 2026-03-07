"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { MOCK_VIDEOS } from "@/data/mock/videos";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default function VideoLessonPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const video = MOCK_VIDEOS.find((v) => v.id === videoId);
  const system = video ? MOCK_SYSTEMS.find((s) => s.id === video.systemId) : null;

  if (!video) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Video not found.</p>
        <Link href="/videos" className="text-indigo-600 mt-4 inline-block">
          Back to Videos
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <span className="inline-block rotate-180">{Icons.chevronRight}</span>
        Back to Videos
      </Link>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        {video.title}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {system?.name ?? "General"} · {video.duration} min
      </p>

      <Card className="aspect-video flex items-center justify-center bg-slate-900 rounded-xl">
        <div className="text-center text-slate-400">
          <span className="inline-block mb-2">{Icons.video}</span>
          <p>Video player placeholder</p>
          <p className="text-sm mt-1">Integrate with Vimeo, Wistia, or custom player</p>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Related Content
        </h2>
        <div className="space-y-2">
          <Link
            href={`/study-guides/sg-1`}
            className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Study Guide: {system?.name}
          </Link>
          <Link
            href={`/questions/system/${system?.slug ?? "cardiovascular"}`}
            className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Practice Questions
          </Link>
        </div>
      </Card>
    </div>
  );
}
