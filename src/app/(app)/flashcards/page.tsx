import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { getEntitlements } from "@/lib/billing/access";
import { loadFlashcardDecks } from "@/lib/content";
import { FlashcardDecksList } from "@/components/flashcards/FlashcardDecksList";
import { EmptyContentState } from "@/components/content/EmptyContentState";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

export default async function FlashcardsPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const [decks, entitlements] = await Promise.all([
    loadFlashcardDecks(trackId, user?.id ?? null),
    user ? getEntitlements(user.id) : null,
  ]);

  const limit = entitlements?.flashcardDecksLimit ?? 999;
  const visibleDecks = decks.slice(0, limit);
  const hasMoreDecks = decks.length > limit;
  const hasDecks = visibleDecks.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Flashcards
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Study with decks by topic. Flip cards to reveal answers.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>
      {!hasDecks ? (
        <EmptyContentState
          title="No flashcard decks yet for your track"
          description={`The flashcard library for ${track.toUpperCase()} is empty. Decks will appear here once content is added.`}
          trackSlug={track}
          contentType="flashcards"
        />
      ) : (
        <>
          <FlashcardDecksList
            decks={visibleDecks.map((d) => ({
            id: d.id,
            name: d.name,
            systemId: d.systemId ?? "",
            count: d.cardCount,
          }))}
          />
          {hasMoreDecks && (
            <div className="mt-6">
              <UpgradePrompt
                reason="Unlock all flashcard decks"
                usage={`${decks.length - limit} more decks available with Pro`}
                variant="inline"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
