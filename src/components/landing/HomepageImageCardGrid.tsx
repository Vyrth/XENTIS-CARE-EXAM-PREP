"use client";

import Image from "next/image";

const PlaceholderIcons = {
  laptop: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  smartphone: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  users: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

export type HomepageImageCard = {
  /** Image path under /images/homepage/. Omit for placeholder. */
  imageSrc?: string;
  title: string;
  description: string;
  /** Placeholder icon when no image: laptop, smartphone, users */
  placeholderIcon?: keyof typeof PlaceholderIcons;
  /** Gradient accent for placeholder: teal, violet, cyan */
  gradient?: "teal" | "violet" | "cyan";
};

export type HomepageImageCardGridProps = {
  title: string;
  subtitle?: string;
  cards: HomepageImageCard[];
};

const GRADIENT_MAP = {
  teal: "from-teal-500/20 dark:from-teal-400/15 to-emerald-600/20 dark:to-emerald-400/15",
  violet: "from-violet-500/20 dark:from-violet-400/15 to-indigo-600/20 dark:to-indigo-400/15",
  cyan: "from-cyan-500/20 dark:from-cyan-400/15 to-blue-600/20 dark:to-blue-400/15",
};

export function HomepageImageCardGrid({ title, subtitle, cards }: HomepageImageCardGridProps) {
  return (
    <section className="py-20 px-6 sm:py-24 bg-slate-100/50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-card-lg border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-card-elevated hover:shadow-glow transition-all duration-300"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${GRADIENT_MAP[card.gradient ?? "violet"]} opacity-5 group-hover:opacity-10 transition-opacity`}
              />
              <div className="relative aspect-[4/3] overflow-hidden">
                {card.imageSrc ? (
                  <Image
                    src={card.imageSrc}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${GRADIENT_MAP[card.gradient ?? "violet"]}`}
                  >
                    {PlaceholderIcons[card.placeholderIcon ?? "laptop"]}
                  </div>
                )}
              </div>
              <div className="relative p-6">
                <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
