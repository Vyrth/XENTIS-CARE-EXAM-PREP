"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { AITutorChat } from "@/components/ai/AITutorChat";
import { useNotebook } from "@/hooks/useNotebook";
import type { TrackSlug } from "@/data/mock/types";

export interface NextStepSuggestion {
  href: string;
  title: string;
  description: string;
}

export interface AITutorPageClientProps {
  track: TrackSlug;
  weakAreas?: { systems: string[]; domains: string[] };
  /** Workflow-driven next-step suggestions (links to practice, study guides, etc.) */
  nextStepSuggestions?: NextStepSuggestion[];
}

export function AITutorPageClient({ track, weakAreas, nextStepSuggestions }: AITutorPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextFromUrl = searchParams.get("context") ?? "";
  const actionFromUrl = (searchParams.get("action") ?? "explain") as "explain" | "mnemonic" | "flashcard" | "summarize" | "quiz" | "explain_question";
  const stemFromUrl = searchParams.get("stem") ?? "";
  const rationaleFromUrl = searchParams.get("rationale") ?? "";
  const correctAnswerFromUrl = searchParams.get("correctAnswer") ?? "";

  const questionContext =
    actionFromUrl === "explain_question" && stemFromUrl
      ? { stem: stemFromUrl, rationale: rationaleFromUrl, correctAnswer: correctAnswerFromUrl }
      : undefined;

  const { addNote } = useNotebook();

  const handleSaveToNotebook = (content: string) => {
    addNote(content, "ai-tutor");
  };

  const handleSaveFlashcards = async (cards: { front: string; back: string }[]) => {
    const res = await fetch("/api/flashcards/save-deck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcards: cards, sourceContentType: "ai_tutor" }),
    });
    const json = await res.json();
    if (json.success && json.deckId) {
      router.push(`/flashcards/${json.deckId}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/10 text-violet-700 dark:text-violet-300 text-sm font-medium mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          AI study partner
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
          Jade Tutor
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your board-focused study coach for explanations, mnemonics, weak-area support, and high-yield review.
        </p>
      </div>

      <Card variant="elevated" className="flex-1 flex flex-col min-h-0 overflow-hidden border-violet-200/50 dark:border-violet-800/30">
        <AITutorChat
          track={track}
          initialContext={contextFromUrl || undefined}
          initialAction={
            actionFromUrl === "explain_question" ? undefined : contextFromUrl ? actionFromUrl : undefined
          }
          runExplainQuestionOnMount={actionFromUrl === "explain_question"}
          questionContext={questionContext}
          weakAreas={weakAreas}
          nextStepSuggestions={nextStepSuggestions}
          onSaveToNotebook={handleSaveToNotebook}
          onSaveFlashcards={handleSaveFlashcards}
        />
      </Card>
    </div>
  );
}
