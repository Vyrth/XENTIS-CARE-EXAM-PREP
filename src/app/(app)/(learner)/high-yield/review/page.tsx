import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { loadHighYieldTopics } from "@/lib/dashboard/loaders";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";

export default async function HighYieldReviewPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;
  const trackName = getTrackDisplayName(track);

  const highYieldTopics = await loadHighYieldTopics(trackId, track, 15);
  const systemsWithHighYield = [...new Set(highYieldTopics.map((t) => t.systemId))];
  const systemSlugMap = new Map<string, string>(
    highYieldTopics
      .filter((t) => t.systemSlug)
      .map((t) => [t.systemId, t.systemSlug!] as [string, string])
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <Link
          href="/high-yield"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4"
        >
          <span className="rotate-180">{Icons.chevronRight}</span>
          Back to High-Yield
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          High-Yield Review Mode
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Practice questions from high-yield topics only. Focus your study time where it matters most for the {trackName} exam.
        </p>
      </div>

      {highYieldTopics.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No high-yield topics yet for {trackName}. Complete onboarding and ensure content exists for your track.
            </p>
            <Link
              href="/high-yield"
              className="mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Return to High-Yield
              {Icons.chevronRight}
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Start a Session
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Questions will be drawn from: {highYieldTopics.map((t) => t.topicName).join(", ")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemsWithHighYield.map((sysId) => {
              const slug = systemSlugMap.get(sysId);
              const sysName = highYieldTopics.find((t) => t.systemId === sysId)?.systemName ?? sysId;
              const topicCount = highYieldTopics.filter((t) => t.systemId === sysId).length;
              if (!slug) return null;
              return (
                <ActionTile
                  key={sysId}
                  href={`/questions/system/${slug}?highYield=1`}
                  title={sysName}
                  description={`${topicCount} high-yield topic(s)`}
                  icon={Icons["help-circle"]}
                />
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
