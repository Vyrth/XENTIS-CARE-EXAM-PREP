import { ReactNode } from "react";

type ExamToolButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
  className?: string;
};

export function ExamToolButton({
  icon,
  label,
  active = false,
  onClick,
  "aria-label": ariaLabel,
  className = "",
}: ExamToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`
        flex flex-col items-center justify-center gap-1
        min-w-[4rem] py-2 px-3 rounded-xl
        text-sm font-medium
        transition-colors duration-200
        focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
        ${
          active
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        }
        ${className}
      `}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
