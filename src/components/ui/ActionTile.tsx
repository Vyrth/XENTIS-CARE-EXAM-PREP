import Link from "next/link";
import { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

type ActionTileProps = {
  href?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  trackColor?: "lvn" | "rn" | "fnp" | "pmhnp";
  onClick?: () => void;
  className?: string;
};

const trackAccentClasses = {
  lvn: "border-l-teal-500",
  rn: "border-l-blue-600",
  fnp: "border-l-violet-600",
  pmhnp: "border-l-fuchsia-600",
};

export function ActionTile({
  href,
  title,
  description,
  icon,
  badge,
  trackColor,
  onClick,
  className = "",
}: ActionTileProps) {
  const content = (
    <>
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-400/15 dark:to-violet-400/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 [&>svg]:w-5 [&>svg]:h-5">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </span>
          {badge && (
            <Badge variant="neutral" size="sm" className="flex-shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </>
  );

  const baseClass = `
    flex items-start gap-4 p-5 rounded-card-lg
    bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm
    border border-slate-200/80 dark:border-slate-800/80
    shadow-card-premium hover:shadow-card-premium-hover
    transition-all duration-200
    hover:border-indigo-200/80 dark:hover:border-indigo-800/50
    focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
    ${trackColor ? `border-l-4 ${trackAccentClasses[trackColor]}` : ""}
    ${className}
  `;

  if (href) {
    return (
      <Link href={href} className={`block ${baseClass}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left ${baseClass}`}
    >
      {content}
    </button>
  );
}
