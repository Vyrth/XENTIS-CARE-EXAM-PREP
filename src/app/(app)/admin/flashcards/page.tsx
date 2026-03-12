import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadAdminFlashcardDecks, loadExamTracks } from "@/lib/admin/loaders";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function FlashcardStudioPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [decks, tracks] = await Promise.all([
    loadAdminFlashcardDecks(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Flashcard Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage flashcard decks. Every deck must be assigned to a track.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
          <Link
            href="/admin/flashcards/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
          >
            + New Deck
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decks.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
            No flashcard decks found. {trackId ? "Try a different track filter." : "Create your first deck."}
          </div>
        ) : (
          decks.map((deck) => (
            <Card key={deck.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {deck.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    {deck.systemName ?? "General"} · {deck.cardCount} cards · <TrackBadge slug={deck.examTrackSlug} />
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Source: {deck.source}</p>
                </div>
                <Link
                  href={`/admin/flashcards/${deck.id}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Edit
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
