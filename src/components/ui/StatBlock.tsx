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
    down: "text-red-600 dark:text-red-400",
    neutral: "text-slate-500 dark:text-slate-400",
  };

  return (
    <div
      className={`rounded-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-heading font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
          {subtext && (
            <p
              className={`mt-0.5 text-sm ${
                trend ? trendColors[trend] : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {subtext}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
