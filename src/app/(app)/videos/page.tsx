import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { MOCK_VIDEOS } from "@/data/mock/videos";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default function VideosPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Video Lessons
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Watch lessons by system. Each video links to study guides and practice questions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_VIDEOS.map((video) => {
          const system = MOCK_SYSTEMS.find((s) => s.id === video.systemId);
          return (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer">
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-slate-400">{Icons.video}</span>
                </div>
                <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                  {video.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge track={system?.track ?? "rn"} size="sm">
                    {system?.name ?? "General"}
                  </Badge>
                  <span className="text-sm text-slate-500">{video.duration} min</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
