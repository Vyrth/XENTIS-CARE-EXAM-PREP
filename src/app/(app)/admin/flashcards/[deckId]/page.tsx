import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAdminFlashcardDeckForEdit,
  loadAllSystemsForAdmin,
  loadTopicsForTrackAdmin,
  loadAISavedFlashcardSets,
  loadStudyGuideSectionsForImport,
} from "@/lib/admin/flashcard-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence, AI_ORIGINAL_AUTHOR_NOTES } from "@/lib/admin/source-evidence";
import { loadAIGenerationForContent } from "@/lib/admin/ai-generation-lookup";
import { FlashcardProductionStudio } from "@/components/admin/FlashcardProductionStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";
import { AIGenerationSourcePanel } from "@/components/admin/AIGenerationSourcePanel";

export default async function FlashcardDeckEditorPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;

  const [tracks, deck, systems, allTopics, aiSets, sources, sourceIds, sourceEvidence, aiGeneration] = await Promise.all([
    loadExamTracks(),
    loadAdminFlashcardDeckForEdit(deckId),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadAISavedFlashcardSets(30),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("flashcard_deck", deckId),
    loadSourceEvidence("flashcard_deck", deckId),
    loadAIGenerationForContent("flashcard_deck", deckId),
  ]);

  const [topicsForTrack, guideSections] = await Promise.all([
    loadTopicsForTrackAdmin(deck?.examTrackId ?? null),
    loadStudyGuideSectionsForImport(deck?.examTrackId ?? null),
  ]);

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  if (!deck) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Deck not found.</p>
        <a
          href="/admin/flashcards"
          className="text-indigo-600 mt-4 inline-block"
        >
          Back to Flashcards
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {aiGeneration && (
        <AIGenerationSourcePanel record={aiGeneration} />
      )}
      <FlashcardProductionStudio
        deckId={deckId}
        initialDeck={deck}
        tracks={trackOptions}
        systems={systems}
        topics={topics}
        studyGuideSections={guideSections}
        aiSavedSets={aiSets}
        defaultTrackId={deck.examTrackId}
      />
      <SourceEvidencePanel
        contentType="flashcard_deck"
        contentId={deckId}
        initialSourceBasis={sourceEvidence?.sourceBasis}
        initialLegalStatus={sourceEvidence?.legalStatus}
        initialLegalNotes={sourceEvidence?.legalNotes}
        initialAuthorNotes={sourceEvidence?.authorNotes}
        sources={sources}
        selectedSourceIds={sourceIds}
        isAIAutoFilled={
          !!aiGeneration &&
          sourceEvidence?.sourceBasis === "internal" &&
          sourceEvidence?.legalStatus === "original" &&
          sourceEvidence?.authorNotes === AI_ORIGINAL_AUTHOR_NOTES
        }
      />
    </div>
  );
}
