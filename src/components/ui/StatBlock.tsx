import { ReactNode } from "react";

type StatBlockProps = {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
};

export function StatBlock({
  label,
  value,
  subtext,
  icon,
  trend,
  className = "",
}: StatBlockProps) {
  const trendColors = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-rose-600 dark:text-rose-400",
    neutral: "text-slate-500 dark:text-slate-400",
  };

  return (
    <div
      className={`
        rounded-card-lg p-6
        bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm
        border border-slate-200/80 dark:border-slate-800/80
        shadow-card-premium hover:shadow-card-premium-hover
        transition-all duration-200
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-heading font-bold text-slate-900 dark:text-white tabular-nums">
            {value}
          </p>
          {subtext && (
            <p
              className={`mt-1 text-sm ${
                trend ? trendColors[trend] : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {subtext}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-400/15 dark:to-violet-400/15 text-indigo-600 dark:text-indigo-400 [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
