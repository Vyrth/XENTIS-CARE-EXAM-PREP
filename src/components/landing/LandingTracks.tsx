import Link from "next/link";
import { Card } from "@/components/ui/Card";

const TRACKS = [
  { slug: "lvn", name: "LVN/LPN", color: "from-teal-500 to-emerald-600", desc: "Fundamentals & safe practice" },
  { slug: "rn", name: "RN", color: "from-blue-500 to-indigo-600", desc: "NCLEX-RN preparation" },
  { slug: "fnp", name: "FNP", color: "from-violet-500 to-purple-600", desc: "Primary care certification" },
  { slug: "pmhnp", name: "PMHNP", color: "from-fuchsia-500 to-pink-600", desc: "Psychiatric-mental health" },
];

export function LandingTracks() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Every track. One platform.
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Blueprint-aligned content for each certification path.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRACKS.map((track) => (
            <Card
              key={track.slug}
              variant="elevated"
              className="group relative overflow-hidden border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-card-elevated hover:shadow-glow transition-all duration-300 rounded-card-lg"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${track.color} opacity-5 group-hover:opacity-10 transition-opacity`}
              />
              <div className="relative p-6">
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${track.color} mb-4`}
                >
                  <span className="text-white font-bold text-lg">
                    {track.name.slice(0, 2)}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {track.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  {track.desc}
                </p>
                <Link
                  href="/login"
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Get started →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
