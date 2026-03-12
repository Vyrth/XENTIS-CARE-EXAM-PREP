"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/Badge";

const PlaceholderIcons = {
  devices: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  trending: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  sparkles: (
    <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

export type LandingFeatureCardProps = {
  /** Image path under /images/homepage/. Omit for placeholder. */
  imageSrc?: string;
  title: string;
  description: string;
  /** Optional badge text (e.g. "Popular") */
  badge?: string;
  /** Placeholder icon when no image */
  placeholderIcon?: keyof typeof PlaceholderIcons;
  /** Gradient accent for placeholder */
  gradient?: "indigo" | "violet" | "cyan";
};

const GRADIENT_MAP = {
  indigo: "from-indigo-500/20 dark:from-indigo-400/15 to-violet-600/20 dark:to-violet-400/15",
  violet: "from-violet-500/20 dark:from-violet-400/15 to-indigo-600/20 dark:to-indigo-400/15",
  cyan: "from-cyan-500/20 dark:from-cyan-400/15 to-indigo-600/20 dark:to-indigo-400/15",
};

export function LandingFeatureCard({
  imageSrc,
  title,
  description,
  badge,
  placeholderIcon = "devices",
  gradient = "indigo",
}: LandingFeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-card-lg border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-card-elevated hover:shadow-glow transition-all duration-300">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${GRADIENT_MAP[gradient]} opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`}
      />
      <div className="relative aspect-[4/3] overflow-hidden">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${GRADIENT_MAP[gradient]}`}
          >
            {PlaceholderIcons[placeholderIcon]}
          </div>
        )}
        {badge && (
          <div className="absolute top-3 right-3">
            <Badge variant="neutral" size="sm" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              {badge}
            </Badge>
          </div>
        )}
      </div>
      <div className="relative p-6">
        <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
