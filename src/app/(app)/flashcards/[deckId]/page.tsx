"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { MOCK_FLASHCARD_DECKS, MOCK_FLASHCARDS } from "@/data/mock/flashcards";

export default function FlashcardStudyPage() {
  const params = useParams();
  const deckId = params.deckId as string;
  const deck = MOCK_FLASHCARD_DECKS.find((d) => d.id === deckId);
  const cards = MOCK_FLASHCARDS.filter((c) => c.deckId === deckId);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!deck || cards.length === 0) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Deck not found.</p>
        <Link href="/flashcards" className="text-indigo-600 mt-4 inline-block">
          Back to Flashcards
        </Link>
      </div>
    );
  }

  const card = cards[index];
  const isLast = index === cards.length - 1;
  const isFirst = index === 0;

  const handleNext = () => {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  };
  const handlePrev = () => {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/flashcards"
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <span className="inline-block rotate-180">{Icons.chevronRight}</span>
          Back
        </Link>
        <span className="text-sm text-slate-500">
          {index + 1} / {cards.length}
        </span>
      </div>

      <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
        {deck.name}
      </h1>

      <Card
        className="min-h-[280px] flex flex-col items-center justify-center cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
          {flipped ? "Back" : "Front"} — tap to flip
        </p>
        <p className="text-lg text-slate-900 dark:text-white text-center px-6">
          {flipped ? card.back : card.front}
        </p>
      </Card>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isLast}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
