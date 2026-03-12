import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

export interface ContentInventory {
  guides: number;
  decks: number;
  videos: number;
  questions?: number;
  highYield?: number;
}

interface EmptyContentStateProps {
  title: string;
  description: string;
  trackSlug: string;
  contentType: "study guides" | "flashcards" | "videos" | "questions";
}

const COMING_NEXT_LINKS: Record<string, { href: string; label: string }[]> = {
  questions: [
    { href: "/study-guides", label: "Study guides" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/high-yield", label: "High-yield topics" },
  ],
  "study guides": [
    { href: "/questions", label: "Practice questions" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/high-yield", label: "High-yield topics" },
  ],
  flashcards: [
    { href: "/questions", label: "Practice questions" },
    { href: "/study-guides", label: "Study guides" },
    { href: "/high-yield", label: "High-yield topics" },
  ],
  videos: [
    { href: "/study-guides", label: "Study guides" },
    { href: "/questions", label: "Practice questions" },
    { href: "/high-yield", label: "High-yield topics" },
  ],
};

export function EmptyContentState({
  title,
  description,
  trackSlug,
  contentType,
}: EmptyContentStateProps) {
  const icon =
    contentType === "study guides"
      ? "book-open"
      : contentType === "flashcards"
        ? "layers"
        : contentType === "questions"
          ? "help-circle"
          : "video";
  const suggestions = COMING_NEXT_LINKS[contentType] ?? [];

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/5">
      <div className="h-1 bg-gradient-to-r from-amber-500/20 to-cyan-500/20 rounded-t-card" />
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-cyan-500/15 dark:from-amber-400/20 dark:to-cyan-400/20 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400 [&>svg]:w-8 [&>svg]:h-8">
          {Icons[icon]}
        </div>
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          {description}
        </p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
          In the meantime, try:
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {suggestions.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
            >
              {s.label}
              {Icons.chevronRight}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
