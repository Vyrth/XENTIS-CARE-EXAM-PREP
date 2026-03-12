import Link from "next/link";
import { Icons } from "@/components/ui/icons";

export function LandingJadeTutor() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/10 text-violet-700 dark:text-violet-300 text-sm font-medium mb-6 [&>svg]:w-4 [&>svg]:h-4">
              {Icons.sparkles}
              <span>Jade Tutor</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Meet Jade Tutor
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              Your AI study partner. Get instant explanations, mnemonics, and
              weak-area coaching—aligned to your exam blueprint.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Explain any question or concept",
                "Generate memory aids and mnemonics",
                "Weak-area coaching and remediation",
                "Board-style reasoning guidance",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 [&>svg]:w-4 [&>svg]:h-4">
                    {Icons.check}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 transition-all"
            >
              Try Jade Tutor free
              <span className="[&>svg]:w-5 [&>svg]:h-5">{Icons.chevronRight}</span>
            </Link>
          </div>

          <div className="relative">
            <div className="relative p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-glow-violet">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 -z-10 blur-xl opacity-50" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white [&>svg]:w-5 [&>svg]:h-5">
                    {Icons.sparkles}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Jade Tutor</p>
                    <p className="text-sm text-slate-500">Jade Tutor study assistant</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm">
                  &ldquo;Let me explain the key concept: In heart failure, the heart
                  can&apos;t pump effectively. Think of it like a weak pump—fluid
                  backs up, causing edema and shortness of breath.&rdquo;
                </div>
                <p className="text-xs text-slate-500">Sample explanation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
