"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { SourceCopyrightForm } from "@/components/admin/SourceCopyrightForm";
import { MOCK_STUDY_GUIDES_ADMIN } from "@/data/mock/admin";
import { MOCK_CONTENT_SOURCES } from "@/data/mock/admin";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import type { WorkflowStatus } from "@/types/admin";

export default function StudyGuideEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const guide = MOCK_STUDY_GUIDES_ADMIN.find((g) => g.id === id);
  const [sourceIds, setSourceIds] = useState<string[]>(guide?.sourceIds ?? []);

  if (!guide) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Study guide not found.</p>
        <Link href="/admin/study-guides" className="text-indigo-600 mt-4 inline-block">Back</Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/study-guides" className="text-slate-600 hover:underline">← Back</Link>
        <div className="flex items-center gap-4">
          <StatusBadge status={guide.status as WorkflowStatus} />
          <StatusTransitionButton currentStatus={guide.status as WorkflowStatus} onTransition={() => {}} />
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Edit: {guide.title}
      </h1>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" defaultValue={guide.title} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">System</label>
            <select defaultValue={guide.systemId} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              {MOCK_SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-slate-900 dark:text-white mb-4">Sections</h3>
        <div className="space-y-4">
          {guide.sections.map((sec) => (
            <div key={sec.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <input type="text" defaultValue={sec.title} className="w-full font-medium mb-2 px-2 py-1 rounded border" />
              <textarea defaultValue={sec.content} rows={6} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm" />
            </div>
          ))}
        </div>
        <button type="button" className="mt-4 text-sm text-indigo-600 hover:underline">+ Add section</button>
      </Card>

      <Card>
        <SourceCopyrightForm sources={MOCK_CONTENT_SOURCES} selectedIds={sourceIds} onToggle={(sid) => setSourceIds((p) => p.includes(sid) ? p.filter((x) => x !== sid) : [...p, sid])} onAddSource={() => {}} />
      </Card>
    </div>
  );
}
