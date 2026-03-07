import { forwardRef } from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", className = "", children, ...props }, ref) => {
    const paddingClass = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    }[padding];

    const variantClass = {
      default:
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card",
      elevated:
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card-elevated",
      outlined:
        "bg-transparent border-2 border-slate-200 dark:border-slate-700",
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-card ${variantClass} ${paddingClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
