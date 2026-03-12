import { LandingFeatureCard } from "./LandingFeatureCard";

const CARDS = [
  {
    title: "Study on every device",
    description:
      "Phone, tablet, or laptop—your progress syncs everywhere. Practice during commutes, deep study at your desk, or quick reviews on the couch.",
    badge: "Mobile-first",
    placeholderIcon: "devices" as const,
    gradient: "indigo" as const,
  },
  {
    title: "Adaptive practice that targets weak areas",
    description:
      "Our engine learns where you struggle and serves questions that build mastery. No more wasting time on what you already know.",
    badge: "Smart",
    placeholderIcon: "trending" as const,
    gradient: "violet" as const,
  },
  {
    title: "Jade Tutor for instant reinforcement",
    description:
      "Get explanations, mnemonics, and weak-area coaching the moment you need them. AI support that feels like a study partner.",
    badge: "AI-powered",
    placeholderIcon: "sparkles" as const,
    gradient: "cyan" as const,
  },
];

/**
 * "Why learners choose Xentis Care" marketing section.
 * Add images to /public/images/homepage/ to replace placeholders.
 */
export function LandingWhyChoose() {
  return (
    <section className="py-20 px-6 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-violet-500/[0.02] dark:from-indigo-500/[0.03] dark:to-violet-500/[0.03] pointer-events-none" aria-hidden />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Why learners choose Xentis Care
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Premium prep that adapts to you—wherever you study, however you learn.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {CARDS.map((card) => (
            <LandingFeatureCard
              key={card.title}
              title={card.title}
              description={card.description}
              badge={card.badge}
              placeholderIcon={card.placeholderIcon}
              gradient={card.gradient}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
