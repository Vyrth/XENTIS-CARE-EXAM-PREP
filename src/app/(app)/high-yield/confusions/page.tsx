import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { CommonConfusionCard } from "@/components/high-yield/CommonConfusionCard";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { MOCK_COMMON_CONFUSIONS } from "@/data/mock/high-yield";

function trackIdToSlug(trackId: string | null): "lvn" | "rn" | "fnp" | "pmhnp" {
  if (!trackId) return "rn";
  const map: Record<string, "lvn" | "rn" | "fnp" | "pmhnp"> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function CommonConfusionsPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const track = trackIdToSlug(profile?.primary_exam_track_id ?? null);

  const confusions = MOCK_COMMON_CONFUSIONS.filter((c) => c.track === track);

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
        Students Commonly Confuse This With…
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Key distinctions for {track.toUpperCase()}. Avoid mix-ups on the exam.
      </p>
      <CommonConfusionCard confusions={confusions} maxItems={20} />
    </div>
  );
}
