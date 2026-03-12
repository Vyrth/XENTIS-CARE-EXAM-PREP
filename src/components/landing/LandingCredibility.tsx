import { Icons } from "@/components/ui/icons";

const ITEMS = [
  {
    icon: "shield",
    title: "Blueprint-aligned",
    desc: "Content mapped to NCSBN and ANCC outlines.",
  },
  {
    icon: "file-check",
    title: "Quality-assured",
    desc: "Questions reviewed for accuracy and clinical relevance.",
  },
  {
    icon: "sparkles",
    title: "AI-enhanced",
    desc: "Jade Tutor powered by modern language models.",
  },
];

export function LandingCredibility() {
  return (
    <section className="py-24 px-6 bg-slate-100/50 dark:bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Built for nursing boards
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Trusted foundations for your exam prep.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="text-center p-6 rounded-card-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 shadow-card hover:shadow-card-elevated transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-400/15 dark:to-violet-400/15 text-indigo-600 dark:text-indigo-400 mb-4 [&>svg]:w-7 [&>svg]:h-7">
                {Icons[item.icon as keyof typeof Icons]}
              </div>
              <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
