"use client";

import Image from "next/image";

/** Laptop icon for placeholder */
const LaptopIcon = () => (
  <svg className="w-24 h-24 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export type HomepageImageFeatureProps = {
  /** Image path under /images/homepage/ (e.g. /images/homepage/study-laptop.jpg). Omit for placeholder. */
  imageSrc?: string;
  title: string;
  description: string;
  /** Optional: reverse layout (image on right) */
  reverse?: boolean;
};

export function HomepageImageFeature({
  imageSrc,
  title,
  description,
  reverse = false,
}: HomepageImageFeatureProps) {
  return (
    <section className="py-20 px-6 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
            reverse ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className={reverse ? "lg:order-2" : ""}>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-indigo-500/5 dark:shadow-indigo-500/10">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-cyan-500/10 -z-10" />
              <div className="aspect-[4/3] relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <LaptopIcon />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={reverse ? "lg:order-1" : ""}>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {title}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
