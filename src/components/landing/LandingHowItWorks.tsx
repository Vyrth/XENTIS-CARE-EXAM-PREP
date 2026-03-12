import { Icons } from "@/components/ui/icons";

const STEPS: { icon: keyof typeof Icons; title: string; desc: string }[] = [
  {
    icon: "book-open",
    title: "Choose your track",
    desc: "Select LVN, RN, FNP, or PMHNP. We align content to official blueprints.",
  },
  {
    icon: "sparkles",
    title: "Study with Jade Tutor",
    desc: "Jade Tutor explanations, mnemonics, and weak-area coaching.",
  },
  {
    icon: "trending-up",
    title: "Adaptive practice",
    desc: "Questions adapt to your level. Focus on what you need most.",
  },
  {
    icon: "file-check",
    title: "Exam readiness",
    desc: "Pre-practice exams, system exams, and readiness analytics.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-24 px-6 bg-slate-100/50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            How it works
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Four steps to exam readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-indigo-200 to-transparent dark:from-indigo-800/50 -translate-x-1/2" />
              )}
              <div className="relative p-6 rounded-card-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 shadow-card-elevated hover:shadow-glow transition-all duration-300">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-400/15 dark:to-violet-400/15 text-indigo-600 dark:text-indigo-400 mb-4 [&>svg]:w-7 [&>svg]:h-7">
                  {Icons[step.icon]}
                </div>
                <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                  Step {i + 1}
                </div>
                <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
