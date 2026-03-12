import { TRACK_COLORS, type TrackSlug } from "@/config/design-tokens";

type BadgeVariant = "default" | "track" | "success" | "warning" | "error" | "neutral";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  track?: TrackSlug;
  size?: "sm" | "md";
};

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  track: "", // overridden by track prop
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  error:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const trackBadgeClasses: Record<TrackSlug, string> = {
  lvn: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  rn: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  fnp: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  pmhnp: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
};

export function Badge({
  variant = "default",
  track,
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const variantClass = track ? trackBadgeClasses[track] : variantClasses[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
