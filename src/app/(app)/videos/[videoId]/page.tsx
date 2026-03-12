import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadVideoById, loadStudyGuides } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { VideoLessonClient } from "./VideoLessonClient";

type Props = { params: Promise<{ videoId: string }> };

export default async function VideoDetailPage({ params }: Props) {
  const { videoId } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;

  const video = await loadVideoById(trackId, videoId);
  const relatedGuides = video?.systemId
    ? await loadStudyGuides(trackId, { systemId: video.systemId })
    : [];

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

  const durationMin = video.durationSeconds ? Math.round(video.durationSeconds / 60) : null;

  return (
    <VideoLessonClient
      video={{
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        durationMin,
        systemName: video.systemName,
        systemSlug: video.systemSlug,
        transcript: video.transcript,
      }}
      relatedGuides={relatedGuides.map((g) => ({ id: g.id, title: g.title }))}
    />
  );
}
