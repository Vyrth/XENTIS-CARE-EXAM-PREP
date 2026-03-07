import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MOCK_FLASHCARD_DECKS, MOCK_FLASHCARDS } from "@/data/mock/flashcards";
import { MOCK_FLASHCARDS_ADMIN } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import type { WorkflowStatus } from "@/types/admin";

export default function FlashcardStudioPage() {
  const decksWithCards = MOCK_FLASHCARD_DECKS.map((deck) => ({
    ...deck,
    cards: MOCK_FLASHCARDS.filter((c) => c.deckId === deck.id),
    adminCards: MOCK_FLASHCARDS_ADMIN.filter((c) => c.deckId === deck.id),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Flashcard Studio
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Create and manage flashcard decks. Cards support workflow statuses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decksWithCards.map((deck) => {
          const system = MOCK_SYSTEMS.find((s) => s.id === deck.systemId);
          return (
            <Card key={deck.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {deck.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {system?.name ?? "General"} · {deck.cards.length} cards
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {deck.adminCards.slice(0, 3).map((c) => (
                      <StatusBadge key={c.id} status={c.status as WorkflowStatus} />
                    ))}
                  </div>
                </div>
                <Link
                  href={`/admin/flashcards/${deck.id}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Edit
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
