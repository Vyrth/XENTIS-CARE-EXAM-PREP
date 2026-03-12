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
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Jade Tutor
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Your board-focused study coach for explanations, mnemonics, weak-area support, and high-yield review.
      </p>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
