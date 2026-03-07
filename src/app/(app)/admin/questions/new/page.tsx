"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { SourceCopyrightForm } from "@/components/admin/SourceCopyrightForm";
import { MOCK_CONTENT_SOURCES } from "@/data/mock/admin";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";
import { useState } from "react";

export default function NewQuestionPage() {
  const router = useRouter();
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  const handleCreate = () => {
    // Mock: create and redirect
    router.push("/admin/questions/q-new");
  };

  const toggleSource = (sid: string) => {
    setSourceIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        New Question
      </h1>

      <Tabs defaultValue="metadata">
        <TabsList>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="stem">Stem</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="rationales">Rationales</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="metadata">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">System</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  {MOCK_SYSTEMS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Domain</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  {MOCK_DOMAINS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
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
            <label className="block text-sm font-medium mb-2">Question Stem</label>
            <textarea rows={6} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Enter question stem..." />
          </Card>
        </TabsContent>

        <TabsContent value="options">
          <Card>
            <h3 className="font-medium mb-4">Answer Options</h3>
            <p className="text-sm text-slate-500 mb-4">Add options A, B, C, D... and mark the correct one(s).</p>
            <button type="button" className="text-sm text-indigo-600 hover:underline">+ Add option</button>
          </Card>
        </TabsContent>

        <TabsContent value="rationales">
          <Card>
            <label className="block text-sm font-medium mb-2">Rationale</label>
            <textarea rows={6} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder="Explanation for correct answer..." />
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <SourceCopyrightForm sources={MOCK_CONTENT_SOURCES} selectedIds={sourceIds} onToggle={toggleSource} onAddSource={() => {}} />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Create as Draft
        </button>
      </div>
    </div>
  );
}
