import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadVideos } from "@/lib/content";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyContentState } from "@/components/content/EmptyContentState";
import { Icons } from "@/components/ui/icons";

export default async function VideosPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const videos = await loadVideos(trackId);
  const hasVideos = videos.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Video Lessons
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Watch lessons by system. Each video links to study guides and practice questions.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      {!hasVideos ? (
        <EmptyContentState
          title="No video lessons yet for your track"
          description={`The video library for ${track.toUpperCase()} is empty. Videos will appear here once published.`}
          trackSlug={track}
          contentType="videos"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((video) => {
            const durationMin = video.durationSeconds
              ? Math.round(video.durationSeconds / 60)
              : null;
            return (
              <Link key={video.id} href={`/videos/${video.id}`}>
                <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer">
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-slate-400">{Icons.video}</span>
                    )}
                  </div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {video.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge track={track as "lvn" | "rn" | "fnp" | "pmhnp"} size="sm">
                      {video.systemName ?? "General"}
                    </Badge>
                    {durationMin != null && (
                      <span className="text-sm text-slate-500">{durationMin} min</span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
