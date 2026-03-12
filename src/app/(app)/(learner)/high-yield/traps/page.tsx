import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { TopTrapsCard } from "@/components/high-yield/TopTrapsCard";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { loadHighYieldFeed } from "@/lib/high-yield";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";

export default async function TopTrapsPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const feed = await loadHighYieldFeed(trackId, track, 5);
  const traps = feed.traps;
  const trackName = getTrackDisplayName(track);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <Link
        href="/high-yield"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <span className="rotate-180">{Icons.chevronRight}</span>
        Back to High-Yield
      </Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Top Traps
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Common {trackName} exam pitfalls. Know these to avoid losing easy points.
      </p>
      {traps.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No traps data yet for {trackName}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Traps content will appear here as it is added for your track.
          </p>
          <Link
            href="/high-yield"
            className="mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Return to High-Yield
            {Icons.chevronRight}
          </Link>
        </div>
      ) : (
        <TopTrapsCard traps={traps} track={track} maxItems={20} />
      )}
    </div>
  );
}
