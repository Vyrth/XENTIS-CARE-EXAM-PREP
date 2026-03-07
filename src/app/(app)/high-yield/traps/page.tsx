import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { TopTrapsCard } from "@/components/high-yield/TopTrapsCard";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { MOCK_TOP_TRAPS } from "@/data/mock/high-yield";

function trackIdToSlug(trackId: string | null): "lvn" | "rn" | "fnp" | "pmhnp" {
  if (!trackId) return "rn";
  const map: Record<string, "lvn" | "rn" | "fnp" | "pmhnp"> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function TopTrapsPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const track = trackIdToSlug(profile?.primary_exam_track_id ?? null);

  const traps = MOCK_TOP_TRAPS.filter((t) => t.track === track);

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
        Common exam pitfalls for {track.toUpperCase()}. Know these to avoid losing easy points.
      </p>
      <TopTrapsCard traps={traps} maxItems={20} />
    </div>
  );
}
