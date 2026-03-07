"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MOCK_FLASHCARD_DECKS, MOCK_FLASHCARDS } from "@/data/mock/flashcards";

export default function FlashcardsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Flashcards
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Study with decks by topic. Flip cards to reveal answers.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_FLASHCARD_DECKS.map((deck) => {
          const count = MOCK_FLASHCARDS.filter((f) => f.deckId === deck.id).length;
          return (
            <Link key={deck.id} href={`/flashcards/${deck.id}`}>
              <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer">
                <div>
                    <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                      {deck.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {count} cards
                    </p>
                  </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
