"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createBatchPlan } from "@/app/(app)/actions/batch-plans";

export interface CreateBatchPlanFormProps {
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId: string }[];
  topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  onCreated?: () => void;
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

export function CreateBatchPlanForm({
  tracks,
  systems,
  topics,
  onCreated,
}: CreateBatchPlanFormProps) {
  const router = useRouter();
  const [trackId, setTrackId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [targetQuestions, setTargetQuestions] = useState(10);
  const [targetGuides, setTargetGuides] = useState(1);
  const [targetDecks, setTargetDecks] = useState(1);
  const [targetVideos, setTargetVideos] = useState(0);
  const [targetHighYield, setTargetHighYield] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredSystems = trackId ? systems.filter((s) => s.examTrackId === trackId) : [];
  const filteredTopics = trackId
    ? topics.filter((t) => !t.systemIds?.length || t.systemIds.some((sid) => filteredSystems.some((s) => s.id === sid)))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!trackId) {
      setError("Track is required");
      return;
    }
    setSaving(true);
    try {
      const r = await createBatchPlan({
        examTrackId: trackId,
        systemId: systemId || null,
        topicId: topicId || null,
        targetQuestions,
        targetGuides,
        targetDecks,
        targetVideos,
        targetHighYield,
        notes: notes.trim() || null,
      });
      if (r.success) {
        setTrackId("");
        setSystemId("");
        setTopicId("");
        setTargetQuestions(10);
        setTargetGuides(1);
        setTargetDecks(1);
        setTargetVideos(0);
        setTargetHighYield(1);
        setNotes("");
        onCreated?.();
        router.refresh();
      } else {
        setError(r.error ?? "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h3 className="font-medium text-slate-900 dark:text-white mb-4">New batch plan</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Track *</label>
            <select
              value={trackId}
              onChange={(e) => {
                setTrackId(e.target.value);
                setSystemId("");
                setTopicId("");
              }}
              className={INPUT_CLASS}
              required
            >
              <option value="">Select track</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">System</label>
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All systems</option>
              {filteredSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All topics</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target questions</label>
            <input
              type="number"
              min={0}
              value={targetQuestions}
              onChange={(e) => setTargetQuestions(Number(e.target.value) || 0)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target guides</label>
            <input
              type="number"
              min={0}
              value={targetGuides}
              onChange={(e) => setTargetGuides(Number(e.target.value) || 0)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target decks</label>
            <input
              type="number"
              min={0}
              value={targetDecks}
              onChange={(e) => setTargetDecks(Number(e.target.value) || 0)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target videos</label>
            <input
              type="number"
              min={0}
              value={targetVideos}
              onChange={(e) => setTargetVideos(Number(e.target.value) || 0)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target high-yield</label>
            <input
              type="number"
              min={0}
              value={targetHighYield}
              onChange={(e) => setTargetHighYield(Number(e.target.value) || 0)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={INPUT_CLASS}
            placeholder="Optional notes"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || !trackId}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create batch plan"}
        </button>
      </form>
    </Card>
  );
}
