import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { getEntitlements } from "@/lib/billing/access";
import { loadFlashcardDecks, loadFlashcardsByDeck } from "@/lib/content";
import { FlashcardStudyClient } from "./FlashcardStudyClient";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

type Props = { params: Promise<{ deckId: string }> };

export default async function FlashcardDeckPage({ params }: Props) {
  const { deckId } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;

  const [decks, cards, entitlements] = await Promise.all([
    loadFlashcardDecks(trackId, user?.id ?? null),
    loadFlashcardsByDeck(trackId, deckId),
    user ? getEntitlements(user.id) : null,
  ]);

  const deck = decks.find((d) => d.id === deckId);
  const deckIndex = deck ? decks.findIndex((d) => d.id === deckId) : -1;
  const limit = entitlements?.flashcardDecksLimit ?? 999;
  const canAccessDeck = deckIndex >= 0 && deckIndex < limit;

  if (!canAccessDeck && deck && cards.length > 0) {
    return (
      <div className="p-6 lg:p-8 max-w-xl mx-auto">
        <UpgradePrompt
          reason="This deck requires a paid plan"
          usage="Unlock all flashcard decks with Pro"
          variant="card"
        />
        <Link href="/flashcards" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">
          Back to Flashcards
        </Link>
      </div>
    );
  }

  if (!deck || cards.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-xl mx-auto">
        <div className="text-center py-8">
          <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Deck not available
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This deck may not exist, may not have any cards yet, or may not be published for your track.
          </p>
          <Link
            href="/flashcards"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Back to Flashcards
          </Link>
          <p className="mt-6">
            <Link href="/questions" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
              Practice questions →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <FlashcardStudyClient
      deck={{ id: deck.id, name: deck.name }}
      cards={cards}
    />
  );
}
