"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Deck = { id: string; name: string; systemId: string; count: number };

export function FlashcardDecksList({ decks }: { decks: Deck[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <Link key={deck.id} href={`/flashcards/${deck.id}`}>
          <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer">
            <div>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                {deck.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {deck.count} cards
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
