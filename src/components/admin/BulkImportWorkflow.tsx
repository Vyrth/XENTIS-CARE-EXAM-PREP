"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  parseImportFile,
  type RawRow,
} from "@/lib/admin/bulk-import-parsers";
import {
  mapRowToQuestion,
  type FieldMapConfig,
} from "@/lib/admin/bulk-import-mapping";
import { validateImportRows, type ValidatedRow } from "@/lib/admin/bulk-import-validation";
import { commitBulkImport } from "@/app/(app)/actions/bulk-import";
import type { QuestionFormData } from "@/lib/admin/question-validation";

type Step = "upload" | "mapping" | "preview" | "done";

export interface BulkImportWorkflowProps {
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId: string }[];
  topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  domains: { id: string; slug: string; name: string }[];
  questionTypes: { id: string; slug: string; name: string }[];
  /** Pre-fill from ?trackId= when opening import from content inventory */
  defaultTrackId?: string;
}

export function BulkImportWorkflow({
  tracks,
  systems,
  topics,
  domains,
  questionTypes,
  defaultTrackId: defaultTrackIdProp,
}: BulkImportWorkflowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<FieldMapConfig>({
    stem: "stem",
    optionColumns: ["option_a", "option_b", "option_c", "option_d"],
    correctColumn: "correct_answer",
  });
  const [defaultTrackId, setDefaultTrackId] = useState(defaultTrackIdProp ?? "");
  useEffect(() => {
    if (defaultTrackIdProp) setDefaultTrackId(defaultTrackIdProp);
  }, [defaultTrackIdProp]);
  const [defaultSystemId, setDefaultSystemId] = useState("");
  const [defaultQuestionTypeId, setDefaultQuestionTypeId] = useState(questionTypes[0]?.id ?? "");
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importResult, setImportResult] = useState<{ importedCount: number; failedCount: number; batchId?: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const trackBySlug = new Map(tracks.map((t) => [t.slug.toLowerCase(), t.id]));
  const trackByName = new Map(tracks.map((t) => [t.name.toLowerCase(), t.id]));
  const systemBySlug = new Map(systems.map((s) => [`${s.examTrackId}:${s.slug}`, s.id]));
  const systemByName = new Map(systems.map((s) => [`${s.examTrackId}:${s.name}`, s.id]));
  const topicBySlug = new Map(topics.map((t) => [t.slug.toLowerCase(), t.id]));
  const topicByName = new Map(topics.map((t) => [t.name.toLowerCase(), t.id]));
  const typeBySlug = new Map(questionTypes.map((t) => [t.slug.toLowerCase(), t.id]));
  const typeByName = new Map(questionTypes.map((t) => [t.name.toLowerCase(), t.id]));

  const resolveTrackId = useCallback((slugOrName: string) => {
    const k = slugOrName.toLowerCase().trim();
    return trackBySlug.get(k) ?? trackByName.get(k) ?? "";
  }, [trackBySlug, trackByName]);

  const resolveSystemId = useCallback((slugOrName: string, trackId: string) => {
    const k = `${trackId}:${slugOrName.toLowerCase().trim()}`;
    return systemBySlug.get(k) ?? systemByName.get(k) ?? "";
  }, [systemBySlug, systemByName]);

  const resolveTopicId = useCallback((slugOrName: string) => {
    const k = slugOrName.toLowerCase().trim();
    return topicBySlug.get(k) ?? topicByName.get(k) ?? "";
  }, [topicBySlug, topicByName]);

  const resolveQuestionTypeId = useCallback((slugOrName: string) => {
    const k = slugOrName.toLowerCase().trim();
    return typeBySlug.get(k) ?? typeByName.get(k) ?? questionTypes[0]?.id ?? "";
  }, [typeBySlug, typeByName, questionTypes]);

  const handleFile = (content: string, name: string) => {
    const result = parseImportFile(content, name);
    if (!result.success) {
      alert(result.error);
      return;
    }
    const hdrs = result.headers ?? (result.rows[0] ? Object.keys(result.rows[0]) : []);
    setFileName(name);
    setRawRows(result.rows);
    setHeaders(hdrs);
    if (hdrs.length > 0) {
      const autoMap: FieldMapConfig = {
        stem: hdrs.find((h) => /stem|question|text/i.test(h)) ?? hdrs[0] ?? "stem",
        track: hdrs.find((h) => /track/i.test(h)),
        system: hdrs.find((h) => /system/i.test(h)),
        topic: hdrs.find((h) => /topic/i.test(h)),
        questionType: hdrs.find((h) => /type|item/i.test(h)),
        rationale: hdrs.find((h) => /rationale|explanation/i.test(h)),
        difficulty: hdrs.find((h) => /difficulty/i.test(h)),
        optionColumns: (() => {
          const optCols = hdrs.filter((h) => /^[a-f]$|option_?[a-f]|opt_?[a-f]/i.test(h.trim()));
          if (optCols.length >= 2) return optCols.slice(0, 6);
          return hdrs.slice(1, 7).length >= 2 ? hdrs.slice(1, 7) : hdrs.slice(0, 6);
        })(),
        correctColumn: hdrs.find((h) => /correct|answer/i.test(h)),
      };
      setFieldMap((prev) => ({ ...prev, ...autoMap }));
    }
    setStep("mapping");
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text) handleFile(text, "pasted.txt");
  };

  const applyMapping = () => {
    const mapped = rawRows.map((row) =>
      mapRowToQuestion(
        row,
        fieldMap,
        resolveTrackId,
        resolveSystemId,
        resolveTopicId,
        resolveQuestionTypeId
      )
    );
    const validated = validateImportRows(
      mapped,
      defaultTrackId || undefined,
      defaultSystemId || undefined,
      defaultQuestionTypeId || undefined
    );
    setValidatedRows(validated);
    setStep("preview");
  };

  const updateRow = (rowIndex: number, data: Partial<QuestionFormData>) => {
    setValidatedRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, data: { ...r.data, ...data }, errors: [], valid: true }
          : r
      )
    );
  };

  const revalidateRow = (rowIndex: number) => {
    const row = validatedRows.find((r) => r.rowIndex === rowIndex);
    if (!row) return;
    const data = {
      ...row.data,
      examTrackId: row.data.examTrackId || defaultTrackId,
      systemId: row.data.systemId || defaultSystemId,
      questionTypeId: row.data.questionTypeId || defaultQuestionTypeId,
    };
    const v = validateImportRows(
      [data],
      defaultTrackId || undefined,
      defaultSystemId || undefined,
      defaultQuestionTypeId || undefined
    );
    const updated = { ...v[0], rowIndex };
    setValidatedRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? updated : r))
    );
  };

  const handleCommit = async () => {
    const toImport = validatedRows.filter((r) => r.valid).map((r) => r.data);
    if (toImport.length === 0) {
      alert("No valid rows to import. Fix invalid rows first.");
      return;
    }
    setImporting(true);
    const result = await commitBulkImport(toImport, {
      sourceName: "Bulk import",
      sourceType: fileName.endsWith(".json") ? "json" : "csv",
      fileName: fileName || undefined,
    });
    setImporting(false);
    setImportResult({
      importedCount: result.importedCount,
      failedCount: result.failedCount,
      batchId: result.batchId,
    });
    setStep("done");
    if (result.importedCount > 0) router.refresh();
  };

  const validCount = validatedRows.filter((r) => r.valid).length;
  const invalidCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <Card>
          <h2 className="font-medium mb-3">Step 1: Upload or paste</h2>
          <p className="text-sm text-slate-500 mb-4">
            Upload JSON (array of objects) or CSV with header row. Paste into the area below or use the file input.
          </p>
          <div
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center"
            onPaste={handlePaste}
            tabIndex={0}
          >
            <p className="text-slate-500 mb-2">Paste JSON or CSV here (Ctrl+V)</p>
            <input
              type="file"
              accept=".json,.csv,.tsv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) f.text().then((t) => handleFile(t, f.name));
              }}
              className="text-sm"
            />
          </div>
        </Card>
      )}

      {step === "mapping" && (
        <>
          <Card>
            <h2 className="font-medium mb-3">Step 2: Field mapping</h2>
            <p className="text-sm text-slate-500 mb-4">
              Map columns to fields. Use defaults for track/system/type when not in file.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Default track</label>
                <select
                  value={defaultTrackId}
                  onChange={(e) => setDefaultTrackId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="">—</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Default system</label>
                <select
                  value={defaultSystemId}
                  onChange={(e) => setDefaultSystemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="">—</option>
                  {systems.filter((s) => !defaultTrackId || s.examTrackId === defaultTrackId).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Default item type</label>
                <select
                  value={defaultQuestionTypeId}
                  onChange={(e) => setDefaultQuestionTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  {questionTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Stem column</label>
                <select
                  value={fieldMap.stem}
                  onChange={(e) => setFieldMap((m) => ({ ...m, stem: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rationale column</label>
                <select
                  value={fieldMap.rationale ?? ""}
                  onChange={(e) => setFieldMap((m) => ({ ...m, rationale: e.target.value || undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Correct answer column</label>
                <select
                  value={fieldMap.correctColumn ?? ""}
                  onChange={(e) => setFieldMap((m) => ({ ...m, correctColumn: e.target.value || undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Detected columns: {headers.join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={applyMapping}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Preview & validate
            </button>
          </Card>
        </>
      )}

      {step === "preview" && (
        <>
          <Card>
            <h2 className="font-medium mb-3">Step 3: Validation preview</h2>
            <p className="text-sm text-slate-500 mb-4">
              {validCount} valid, {invalidCount} invalid. Fix invalid rows below, then import. All imports create drafts only.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="text-sm text-slate-600 hover:underline"
              >
                ← Back to mapping
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={validCount === 0 || importing}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${validCount} questions (draft)`}
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {validatedRows.map((row) => (
                <div
                  key={row.rowIndex}
                  className={`p-4 rounded-lg border ${
                    row.valid ? "border-slate-200 dark:border-slate-700" : "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 mb-1">Row {row.rowIndex}</p>
                      <p className="text-sm text-slate-900 dark:text-white truncate">{row.data.stem}</p>
                      {row.errors.length > 0 && (
                        <ul className="mt-2 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                          {row.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {!row.valid && (
                      <div className="shrink-0 flex gap-2">
                        <select
                          value={row.data.examTrackId || defaultTrackId}
                          onChange={(e) => {
                            updateRow(row.rowIndex, { examTrackId: e.target.value });
                            revalidateRow(row.rowIndex);
                          }}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs"
                        >
                          <option value="">Track</option>
                          {tracks.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <select
                          value={row.data.systemId || defaultSystemId}
                          onChange={(e) => {
                            updateRow(row.rowIndex, { systemId: e.target.value });
                            revalidateRow(row.rowIndex);
                          }}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs"
                        >
                          <option value="">System</option>
                          {systems.filter((s) => (row.data.examTrackId || defaultTrackId) ? s.examTrackId === (row.data.examTrackId || defaultTrackId) : true).map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.data.stem}
                          onChange={(e) => updateRow(row.rowIndex, { stem: e.target.value })}
                          placeholder="Stem"
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs w-48"
                        />
                        <button
                          type="button"
                          onClick={() => revalidateRow(row.rowIndex)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Revalidate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {step === "done" && importResult && (
        <Card>
          <h2 className="font-medium mb-3">Import complete</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Imported {importResult.importedCount} questions as drafts. {importResult.failedCount} failed.
          </p>
          <div className="mt-4 flex gap-4">
            <Link
              href="/admin/questions"
              className="text-indigo-600 hover:underline text-sm"
            >
              View questions
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setRawRows([]);
                setValidatedRows([]);
                setImportResult(null);
              }}
              className="text-indigo-600 hover:underline text-sm"
            >
              Import another batch
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
