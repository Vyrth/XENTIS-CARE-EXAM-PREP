import Link from "next/link";
import { ReactNode } from "react";

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
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </span>
          {badge && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {badge}
            </span>
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
    flex items-start gap-4 p-5 rounded-card
    bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
    transition-all duration-200
    hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-700
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
