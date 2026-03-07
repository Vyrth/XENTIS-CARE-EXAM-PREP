"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionButton } from "@/components/admin/StatusTransitionButton";
import { SourceCopyrightForm } from "@/components/admin/SourceCopyrightForm";
import { MOCK_QUESTIONS_ADMIN } from "@/data/mock/admin";
import { MOCK_CONTENT_SOURCES } from "@/data/mock/admin";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";
import { MOCK_REVIEW_NOTES } from "@/data/mock/admin";
import type { WorkflowStatus } from "@/types/admin";

export default function QuestionEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const question = MOCK_QUESTIONS_ADMIN.find((q) => q.id === id);
  const [sourceIds, setSourceIds] = useState<string[]>(question?.sourceIds ?? []);

  if (!question) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Question not found.</p>
        <Link href="/admin/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Questions
        </Link>
      </div>
    );
  }

  const toggleSource = (sid: string) => {
    setSourceIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/questions" className="text-slate-600 dark:text-slate-400 hover:underline">
          ← Back to Questions
        </Link>
        <div className="flex items-center gap-4">
          <StatusBadge status={question.status as WorkflowStatus} />
          <StatusTransitionButton
            currentStatus={question.status as WorkflowStatus}
            onTransition={(to) => console.log("Transition to", to)}
          />
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Edit Question: {question.id}
      </h1>

      <Tabs defaultValue="metadata">
        <TabsList>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="stem">Stem</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="rationales">Rationales</TabsTrigger>
          <TabsTrigger value="exhibits">Exhibits</TabsTrigger>
          <TabsTrigger value="interaction">Interaction</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="review">Review Notes</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="metadata">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  System
                </label>
                <select
                  defaultValue={question.systemId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  {MOCK_SYSTEMS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Domain
                </label>
                <select
                  defaultValue={question.domainId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  {MOCK_DOMAINS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  defaultValue={question.type}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  <option value="single_best_answer">Single Best Answer</option>
                  <option value="multiple_response">Multiple Response</option>
                  <option value="image_based">Image Based</option>
                  <option value="case_study">Case Study</option>
                  <option value="dosage_calc">Dosage Calc</option>
                </select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stem">
          <Card>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Question Stem
            </label>
            <textarea
              defaultValue={question.stem}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </Card>
        </TabsContent>

        <TabsContent value="options">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">Answer Options</h3>
            <div className="space-y-3">
              {question.options?.map((opt) => (
                <div
                  key={opt.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <span className="font-mono w-8">{opt.key}</span>
                  <input
                    type="text"
                    defaultValue={opt.text}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={opt.isCorrect} />
                    Correct
                  </label>
                </div>
              ))}
            </div>
            <button type="button" className="mt-4 text-sm text-indigo-600 hover:underline">
              + Add option
            </button>
          </Card>
        </TabsContent>

        <TabsContent value="rationales">
          <Card>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Rationale / Explanation
            </label>
            <textarea
              defaultValue={question.rationale}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </Card>
        </TabsContent>

        <TabsContent value="exhibits">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">Exhibits (Images/Media)</h3>
            <p className="text-sm text-slate-500 mb-4">
              Attach images, ECG strips, or other media. Link to Media Rights for licensing.
            </p>
            <div className="space-y-2">
              {question.exhibits?.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <span className="text-slate-500">{ex.type}</span>
                  <input type="text" defaultValue={ex.url} className="flex-1 px-2 py-1 rounded border text-sm" />
                  <input type="text" defaultValue={ex.alt} placeholder="Alt text" className="w-32 px-2 py-1 rounded border text-sm" />
                </div>
              ))}
            </div>
            <button type="button" className="mt-4 text-sm text-indigo-600 hover:underline">
              + Add exhibit
            </button>
          </Card>
        </TabsContent>

        <TabsContent value="interaction">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">Interaction Config</h3>
            <p className="text-sm text-slate-500 mb-4">
              Configure scoring, partial credit, or special interaction behavior (JSON).
            </p>
            <textarea
              defaultValue={JSON.stringify(question.interactionConfig ?? {}, null, 2)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
            />
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <SourceCopyrightForm
              sources={MOCK_CONTENT_SOURCES}
              selectedIds={sourceIds}
              onToggle={toggleSource}
              onAddSource={() => {}}
            />
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">Review Notes</h3>
            <div className="space-y-4">
              {MOCK_REVIEW_NOTES.filter((n) => n.entityId === question.id).map((n) => (
                <div key={n.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>{n.authorName} ({n.role})</span>
                    <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{n.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <textarea
                placeholder="Add a review note..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <button type="button" className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">
                Add Note
              </button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">Preview</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-6">{question.stem}</p>
            <div className="space-y-2">
              {question.options?.map((opt) => (
                <div
                  key={opt.key}
                  className={`p-3 rounded-lg border ${
                    opt.isCorrect ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="font-mono mr-2">{opt.key}.</span>
                  {opt.text}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
