/**
 * Scoring pipeline - computes raw score and analytics from persisted session data
 * Uses exam_session_questions, question answer keys. No mock/demo calculations.
 */

import type { ExamSession, ExamResponse } from "@/types/exam";

export interface ScoredItem {
  questionId: string;
  correct: boolean;
  points: number;
  maxPoints: number;
  itemType: string;
}

export interface ExamScoreResult {
  sessionId: string;
  rawScore: number;
  maxScore: number;
  percentCorrect: number;
  items: ScoredItem[];
  bySystem: Record<string, { correct: number; total: number; percent: number }>;
  byDomain: Record<string, { correct: number; total: number; percent: number }>;
  byItemType: Record<string, { correct: number; total: number; percent: number }>;
  timeSpentSeconds: number;
  flaggedCount: number;
}

/** Compare user response to correct answer - supports all item types */
function scoreItem(
  response: ExamResponse | undefined,
  correctAnswer: string | string[] | number | Record<string, string> | undefined,
  itemType: string
): { correct: boolean; points: number; maxPoints: number } {
  const maxPoints = 1;

  if (!correctAnswer) {
    return { correct: false, points: 0, maxPoints };
  }

  if (!response) {
    return { correct: false, points: 0, maxPoints };
  }

  switch (response.type) {
    case "single": {
      const correct = Array.isArray(correctAnswer)
        ? correctAnswer.includes(response.value)
        : String(response.value) === String(correctAnswer);
      return { correct, points: correct ? 1 : 0, maxPoints };
    }
    case "multiple":
    case "ordered": {
      const expected = Array.isArray(correctAnswer)
        ? correctAnswer.map(String)
        : [String(correctAnswer)];
      const user = response.value.map(String);
      if (response.type === "ordered") {
        const correct = expected.length === user.length && expected.every((e, i) => e === user[i]);
        return { correct, points: correct ? 1 : 0, maxPoints };
      }
      const correct =
        expected.length === user.length &&
        expected.every((e) => user.includes(e)) &&
        user.every((u) => expected.includes(u));
      return { correct, points: correct ? 1 : 0, maxPoints };
    }
    case "numeric": {
      const expected = typeof correctAnswer === "number" ? correctAnswer : parseFloat(String(correctAnswer));
      const correct = !Number.isNaN(expected) && Math.abs(response.value - expected) < 0.01;
      return { correct, points: correct ? 1 : 0, maxPoints };
    }
    case "hotspot":
    case "highlight": {
      const expected = Array.isArray(correctAnswer)
        ? correctAnswer.map(String).sort()
        : [String(correctAnswer)].sort();
      const user = response.value.map(String).sort();
      const correct =
        expected.length === user.length &&
        expected.every((e, i) => e === user[i]);
      return { correct, points: correct ? 1 : 0, maxPoints };
    }
    case "dropdown":
    case "matrix": {
      const expected = correctAnswer && typeof correctAnswer === "object" && !Array.isArray(correctAnswer)
        ? correctAnswer as Record<string, string>
        : {};
      const user = response.value as Record<string, string>;
      const keys = new Set([...Object.keys(expected), ...Object.keys(user)]);
      let correct = true;
      for (const k of keys) {
        if (String(expected[k] ?? "") !== String(user[k] ?? "")) {
          correct = false;
          break;
        }
      }
      return { correct, points: correct ? 1 : 0, maxPoints };
    }
    default:
      // Unsupported or partially implemented item types (e.g. select_n, bow_tie) - score as incorrect without breaking
      return { correct: false, points: 0, maxPoints };
  }
}

export function computeScore(
  session: ExamSession,
  getCorrectAnswer: (questionId: string) => string | string[] | number | Record<string, string> | undefined,
  getSystemId: (questionId: string) => string | undefined,
  getDomainId: (questionId: string) => string | undefined,
  getItemType: (questionId: string) => string
): ExamScoreResult {
  const items: ScoredItem[] = [];
  const bySystem: Record<string, { correct: number; total: number }> = {};
  const byDomain: Record<string, { correct: number; total: number }> = {};
  const byItemType: Record<string, { correct: number; total: number }> = {};

  for (const qId of session.questionIds) {
    const response = session.responses[qId];
    const correctAnswer = getCorrectAnswer(qId);
    const itemType = getItemType(qId);
    const { correct, points, maxPoints } = scoreItem(response, correctAnswer, itemType);

    items.push({ questionId: qId, correct, points, maxPoints, itemType });

    const sysId = getSystemId(qId) ?? "_unknown";
    if (!bySystem[sysId]) bySystem[sysId] = { correct: 0, total: 0 };
    bySystem[sysId].total++;
    if (correct) bySystem[sysId].correct++;

    const domId = getDomainId(qId) ?? "_unknown";
    if (!byDomain[domId]) byDomain[domId] = { correct: 0, total: 0 };
    byDomain[domId].total++;
    if (correct) byDomain[domId].correct++;

    const typeKey = itemType || "_unknown";
    if (!byItemType[typeKey]) byItemType[typeKey] = { correct: 0, total: 0 };
    byItemType[typeKey].total++;
    if (correct) byItemType[typeKey].correct++;
  }

  const rawScore = items.reduce((s, i) => s + i.points, 0);
  const maxScore = items.reduce((s, i) => s + i.maxPoints, 0);
  const percentCorrect = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

  const started = new Date(session.startedAt).getTime();
  const ended = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const timeSpentSeconds = Math.floor((ended - started) / 1000);

  const withPercent = <T extends { correct: number; total: number }>(m: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(m).map(([k, v]) => [
        k,
        { ...v, percent: v.total > 0 ? (v.correct / v.total) * 100 : 0 },
      ])
    );

  return {
    sessionId: session.id,
    rawScore,
    maxScore,
    percentCorrect,
    items,
    bySystem: withPercent(bySystem),
    byDomain: withPercent(byDomain),
    byItemType: withPercent(byItemType),
    timeSpentSeconds,
    flaggedCount: session.flags.size,
  };
}
