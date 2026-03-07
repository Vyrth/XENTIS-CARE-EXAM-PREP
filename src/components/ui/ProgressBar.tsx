type ProgressBarProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "track";
  trackSlug?: "lvn" | "rn" | "fnp" | "pmhnp";
  showLabel?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

const trackFillClasses = {
  lvn: "bg-teal-500",
  rn: "bg-blue-600",
  fnp: "bg-violet-600",
  pmhnp: "bg-fuchsia-600",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  variant = "default",
  trackSlug,
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const fillClass =
    variant === "track" && trackSlug
      ? trackFillClasses[trackSlug]
      : "bg-indigo-600 dark:bg-indigo-500";

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
