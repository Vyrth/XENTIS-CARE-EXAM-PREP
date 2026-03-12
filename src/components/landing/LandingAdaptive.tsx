import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export function LandingAdaptive() {
  return (
    <section className="py-24 px-6 bg-slate-100/50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card-elevated">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white [&>svg]:w-6 [&>svg]:h-6">
                  {Icons["trending-up"]}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Adaptive engine</p>
                  <p className="text-sm text-slate-500">Questions match your level</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Cardiovascular", score: 78, color: "bg-emerald-500" },
                  { label: "Respiratory", score: 65, color: "bg-amber-500" },
                  { label: "Renal", score: 82, color: "bg-emerald-500" },
                  { label: "Psychiatric", score: 58, color: "bg-rose-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{item.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 italic">
                Simulated readiness view
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-700 dark:text-cyan-300 text-sm font-medium mb-6 [&>svg]:w-4 [&>svg]:h-4">
              {Icons["bar-chart"]}
              <span>Adaptive learning</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Learn what you need
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              Our adaptive engine tracks your readiness by system and topic.
              Practice more where you&apos;re weak, less where you&apos;re strong.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Blueprint-aligned question bank",
                "System and topic readiness scores",
                "Personalized practice recommendations",
                "Pre-practice and system exams",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 [&>svg]:w-4 [&>svg]:h-4">
                    {Icons.check}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all"
            >
              See your readiness
              <span className="[&>svg]:w-5 [&>svg]:h-5">{Icons.chevronRight}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
