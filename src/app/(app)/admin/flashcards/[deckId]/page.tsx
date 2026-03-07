"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { MOCK_FLASHCARD_DECKS } from "@/data/mock/flashcards";
import { MOCK_FLASHCARDS_ADMIN } from "@/data/mock/admin";
import type { WorkflowStatus } from "@/types/admin";

export default function FlashcardDeckEditorPage() {
  const params = useParams();
  const deckId = params.deckId as string;
  const deck = MOCK_FLASHCARD_DECKS.find((d) => d.id === deckId);
  const cards = MOCK_FLASHCARDS_ADMIN.filter((c) => c.deckId === deckId);

  if (!deck) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Deck not found.</p>
        <Link href="/admin/flashcards" className="text-indigo-600 mt-4 inline-block">Back</Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/flashcards" className="text-slate-600 hover:underline">← Back</Link>
      </div>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        {deck.name}
      </h1>

      <Card>
        <h3 className="font-medium text-slate-900 dark:text-white mb-4">Cards</h3>
        <div className="space-y-4">
          {cards.map((card) => (
            <div key={card.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Front</p>
                    <p className="text-slate-900 dark:text-white">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Back</p>
                    <p className="text-slate-900 dark:text-white">{card.back}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={card.status as WorkflowStatus} />
                  <StatusTransitionButton currentStatus={card.status as WorkflowStatus} onTransition={() => {}} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="mt-4 text-sm text-indigo-600 hover:underline">+ Add card</button>
      </Card>
    </div>
  );
}
