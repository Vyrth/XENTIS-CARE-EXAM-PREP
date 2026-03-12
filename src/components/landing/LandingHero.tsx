import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh bg-slate-50 dark:bg-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/80 dark:to-slate-950/80" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-400/15 dark:bg-cyan-500/10 blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-violet-400/15 dark:bg-violet-500/10 blur-3xl" />

      {/* Abstract grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">
          Pass your nursing
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 dark:from-indigo-400 dark:via-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">
            board exam
          </span>
        </h1>

        <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Premium preparation for LVN, RN, FNP, and PMHNP. Adaptive learning,
          Jade Tutor, and blueprint-aligned content.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300"
          >
            View pricing
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          1 month free · No credit card required
        </p>
      </div>
    </section>
  );
}
