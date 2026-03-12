import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadStudyGuides } from "@/lib/content";
import { ActionTile } from "@/components/ui/ActionTile";
import { EmptyContentState } from "@/components/content/EmptyContentState";
import { Icons } from "@/components/ui/icons";

export default async function StudyGuidesPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const guides = await loadStudyGuides(trackId);
  const hasGuides = guides.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Study Guides
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Detailed study materials by system. Highlight text to ask Jade Tutor or Save to Notebook.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      {!hasGuides ? (
        <EmptyContentState
          title="No study guides yet for your track"
          description={`The study guide library for ${track.toUpperCase()} is empty. Content will appear here once published.`}
          trackSlug={track}
          contentType="study guides"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((g) => (
            <ActionTile
              key={g.id}
              href={`/study-guides/${g.id}`}
              title={g.title}
              description={`${g.sectionCount} section${g.sectionCount === 1 ? "" : "s"}${g.systemName ? ` · ${g.systemName}` : ""}`}
              icon={Icons["book-open"]}
              trackColor={track as "lvn" | "rn" | "fnp" | "pmhnp"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
