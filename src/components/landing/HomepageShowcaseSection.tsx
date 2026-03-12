"use client";

import Image from "next/image";

/** Phone icon */
const PhoneIcon = () => (
  <svg className="w-20 h-20 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

/** Tablet icon */
const TabletIcon = () => (
  <svg className="w-24 h-24 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

/** Monitor icon */
const MonitorIcon = () => (
  <svg className="w-28 h-28 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export type HomepageShowcaseSectionProps = {
  /** Image for phone mockup. Omit for placeholder. */
  phoneImageSrc?: string;
  /** Image for tablet mockup. Omit for placeholder. */
  tabletImageSrc?: string;
  /** Image for desktop mockup. Omit for placeholder. */
  desktopImageSrc?: string;
};

export function HomepageShowcaseSection({
  phoneImageSrc,
  tabletImageSrc,
  desktopImageSrc,
}: HomepageShowcaseSectionProps) {
  return (
    <section className="py-20 px-6 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
      <div className="absolute top-1/2 left-0 w-1/3 h-full bg-gradient-to-r from-cyan-500/5 to-transparent" />
      <div className="absolute top-1/2 right-0 w-1/3 h-full bg-gradient-to-l from-violet-500/5 to-transparent" />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            From phone to desktop
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Study on the go or dive deep at your desk. Your progress syncs across every device.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
          {/* Phone */}
          <div className="relative group w-full max-w-[280px] mx-auto lg:mx-0">
            <div className="relative w-full aspect-[9/19] max-h-[420px] rounded-[2rem] border-[6px] sm:border-[8px] border-slate-800 dark:border-slate-700 p-2 bg-slate-900 shadow-2xl shadow-slate-900/50">
              <div className="absolute inset-0 rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                {phoneImageSrc ? (
                  <Image
                    src={phoneImageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <PhoneIcon />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm">
              Phone
            </div>
          </div>

          {/* Tablet */}
          <div className="relative group order-first lg:order-none w-full max-w-[360px] mx-auto lg:mx-0">
            <div className="relative w-full aspect-[4/3] rounded-2xl border-4 border-slate-700 dark:border-slate-600 p-3 bg-slate-800 shadow-2xl shadow-slate-900/50">
              <div className="absolute inset-0 rounded-xl overflow-hidden m-3 bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                {tabletImageSrc ? (
                  <Image
                    src={tabletImageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="360px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <TabletIcon />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm">
              Tablet
            </div>
          </div>

          {/* Desktop */}
          <div className="relative group w-full max-w-[400px] mx-auto lg:mx-0">
            <div className="relative w-full aspect-[16/10] rounded-2xl border-4 border-slate-700 dark:border-slate-600 p-4 bg-slate-800 shadow-2xl shadow-slate-900/50">
              <div className="absolute inset-0 rounded-xl overflow-hidden m-4 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20">
                {desktopImageSrc ? (
                  <Image
                    src={desktopImageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <MonitorIcon />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm">
              Desktop
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
