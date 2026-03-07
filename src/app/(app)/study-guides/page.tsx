import { Card } from "@/components/ui/Card";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default function StudyGuidesPage() {
  const guides = [
    { id: "sg-1", name: "Cardiovascular", sections: 3, track: "rn" as const },
    { id: "sg-2", name: "Respiratory", sections: 2, track: "lvn" as const },
    { id: "sg-3", name: "Renal", sections: 2, track: "fnp" as const },
    { id: "sg-4", name: "Psychiatric", sections: 2, track: "pmhnp" as const },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Study Guides
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Detailed study materials by system. Highlight text to Ask AI or Save to Notebook.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guides.map((g) => (
          <ActionTile
            key={g.id}
            href={`/study-guides/${g.id}`}
            title={g.name}
            description={`${g.sections} sections`}
            icon={Icons["book-open"]}
            trackColor={g.track}
          />
        ))}
      </div>
    </div>
  );
}
