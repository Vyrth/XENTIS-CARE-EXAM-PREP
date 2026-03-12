/**
 * Bulk import field mapping - map source columns to question schema
 */

import type { RawRow } from "./bulk-import-parsers";
import type { QuestionFormData, QuestionOptionInput } from "./question-validation";

export interface FieldMapConfig {
  stem: string;
  track?: string;
  system?: string;
  topic?: string;
  questionType?: string;
  leadIn?: string;
  instructions?: string;
  rationale?: string;
  difficulty?: string;
  imageUrl?: string;
  /** For CSV: column names for options, e.g. ['option_a','option_b','option_c','option_d'] */
  optionColumns?: string[];
  /** Column with correct key: A, B, C, D or 1,2,3,4 */
  correctColumn?: string;
  /** Map option key to rationale column: { 'A': 'option_a_rationale' } */
  distractorRationaleColumns?: Record<string, string>;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];
const OPTION_KEY_MAP: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F" };

function getStr(row: RawRow, col: string): string {
  if (!col) return "";
  const v = row[col];
  if (v == null) return "";
  return String(v).trim();
}

function getNum(row: RawRow, col: string): number | undefined {
  const s = getStr(row, col);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  if (isNaN(n)) return undefined;
  return n;
}

/** Map a raw row to QuestionFormData using field map. IDs must be resolved by caller. */
export function mapRowToQuestion(
  row: RawRow,
  map: FieldMapConfig,
  resolveTrackId: (slugOrName: string) => string,
  resolveSystemId: (slugOrName: string, trackId: string) => string,
  resolveTopicId: (slugOrName: string) => string,
  resolveQuestionTypeId: (slugOrName: string) => string
): Partial<QuestionFormData> & { stem: string; options: QuestionOptionInput[] } {
  const stem = getStr(row, map.stem);
  const trackSlug = map.track ? getStr(row, map.track) : "";
  const systemSlug = map.system ? getStr(row, map.system) : "";
  const topicSlug = map.topic ? getStr(row, map.topic) : "";
  const typeSlug = map.questionType ? getStr(row, map.questionType) : "single_best_answer";

  const trackId = trackSlug ? resolveTrackId(trackSlug) : "";
  const systemId = trackId && systemSlug ? resolveSystemId(systemSlug, trackId) : "";
  const topicId = topicSlug ? resolveTopicId(topicSlug) : "";
  const questionTypeId = typeSlug ? resolveQuestionTypeId(typeSlug) : "";

  let options: QuestionOptionInput[] = [];

  if (map.optionColumns?.length) {
    const correctRaw = map.correctColumn ? getStr(row, map.correctColumn).toUpperCase() : "";
    const correctKey = OPTION_KEY_MAP[correctRaw] ?? correctRaw;
    map.optionColumns.forEach((col, idx) => {
      const key = OPTION_KEYS[idx] ?? String(idx + 1);
      const text = getStr(row, col);
      if (text) {
        const distractorCol = map.distractorRationaleColumns?.[key];
        options.push({
          key,
          text,
          isCorrect: key === correctKey || correctKey === "" && idx === 0,
          distractorRationale: distractorCol ? getStr(row, distractorCol) : undefined,
        });
      }
    });
  } else {
    const optsRaw = row.options ?? row.Options;
    if (Array.isArray(optsRaw)) {
      options = optsRaw.map((o: unknown, idx: number) => {
        const obj = typeof o === "object" && o != null ? (o as Record<string, unknown>) : {};
        const key = String(obj.key ?? obj.option_key ?? OPTION_KEYS[idx] ?? (idx + 1));
        const text = String(obj.text ?? obj.option_text ?? obj.content ?? "");
        const isCorrect = Boolean(obj.isCorrect ?? obj.is_correct ?? obj.correct);
        return {
          key: key.length === 1 ? key : OPTION_KEYS[idx],
          text,
          isCorrect,
          distractorRationale: typeof obj.distractorRationale === "string" ? obj.distractorRationale : typeof obj.rationale === "string" ? obj.rationale : undefined,
        };
      });
    }
  }

  if (options.length === 0) {
    options = [{ key: "A", text: "", isCorrect: false }, { key: "B", text: "", isCorrect: false }];
  }

  return {
    examTrackId: trackId,
    systemId,
    domainId: undefined,
    topicId: topicId || undefined,
    subtopicId: undefined,
    questionTypeId,
    questionTypeSlug: typeSlug || "single_best_answer",
    stem,
    leadIn: map.leadIn ? getStr(row, map.leadIn) || undefined : undefined,
    instructions: map.instructions ? getStr(row, map.instructions) || undefined : undefined,
    rationale: map.rationale ? getStr(row, map.rationale) || undefined : undefined,
    difficultyTier: map.difficulty ? (getNum(row, map.difficulty) ?? undefined) : undefined,
    imageUrl: map.imageUrl ? getStr(row, map.imageUrl) || undefined : undefined,
    options,
  };
}
