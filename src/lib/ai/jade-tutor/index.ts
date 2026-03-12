/**
 * Jade Tutor - Orchestration for Learner Chat
 *
 * Intent detection → route to handler → validated output.
 * Separate from admin content-factory. Tutoring mode only.
 */

import { detectIntent } from "./intents";
import { handleGenerateQuestions, handleExplainConcept, handleGenerateFlashcards } from "./handlers";
import { runAIAction } from "@/lib/ai/orchestrator";
import type { ExamTrack } from "@/lib/ai/jade-client";
import type { JadeIntent } from "./intents";
import type { AIRequest } from "@/types/ai-tutor";

export type JadeChatResult = {
  success: boolean;
  intent?: JadeIntent;
  mode?: "question_set" | "flashcard_set" | "concept_explanation";
  content?: string;
  questions?: { stem: string; options: { key: string; text: string; isCorrect: boolean }[]; rationale: string; correctKey: string }[];
  flashcards?: { front: string; back: string }[];
  conceptExplanation?: { title: string; summary: string; high_yield_points: string[]; common_traps: string[] };
  track?: string;
  topic?: string;
  error?: string;
};

/**
 * Process learner chat message: detect intent, route to handler, return validated output.
 */
export async function processJadeChat(
  message: string,
  track: ExamTrack,
  userId: string,
  options?: {
    weakAreas?: { systems: string[]; domains: string[] };
    messageHistory?: { role: "user" | "assistant"; content: string }[];
  }
): Promise<JadeChatResult> {
  const intent = detectIntent(message);

  switch (intent) {
    case "generate_questions": {
      const result = await handleGenerateQuestions(track, message);
      if (result.success && result.questions) {
        return {
          success: true,
          intent: "generate_questions",
          mode: "question_set",
          content: result.content,
          questions: result.questions,
          track: result.track,
          topic: result.topic,
          error: result.error,
        };
      }
      return {
        success: false,
        intent: "generate_questions",
        error: result.error ?? "Could not generate questions",
      };
    }

    case "generate_flashcards": {
      const result = await handleGenerateFlashcards(track, message);
      if (result.success && result.flashcards) {
        return {
          success: true,
          intent: "generate_flashcards",
          mode: "flashcard_set",
          content: result.content,
          flashcards: result.flashcards,
          error: result.error,
        };
      }
      return {
        success: false,
        intent: "generate_flashcards",
        error: result.error ?? "Could not generate flashcards",
      };
    }

    case "explain_concept":
    case "general": {
      const result = await handleExplainConcept(track, message);
      if (result.success && result.conceptExplanation) {
        return {
          success: true,
          intent: "explain_concept",
          mode: "concept_explanation",
          content: result.content,
          conceptExplanation: result.conceptExplanation,
          error: result.error,
        };
      }
      if (result.success && result.content) {
        return {
          success: true,
          intent: "explain_concept",
          content: result.content,
          error: result.error,
        };
      }
      return {
        success: false,
        intent: "explain_concept",
        error: result.error ?? "Could not explain",
      };
    }

    case "create_mnemonic":
    case "quiz_followup":
    case "high_yield_review":
    case "remediation":
    case "compare_concepts": {
      const actionMap: Record<string, AIRequest["action"]> = {
        create_mnemonic: "generate_mnemonic",
        quiz_followup: "quiz_followup",
        high_yield_review: "explain_highlight",
        remediation: "weak_area_coaching",
        compare_concepts: "compare_concepts",
      };
      const action = actionMap[intent] ?? "explain_highlight";
      const req: AIRequest = {
        action,
        track,
        userId,
        highlightedText: message,
        notebookContent: message,
        topic: message.slice(0, 200),
        weakSystems: options?.weakAreas?.systems ?? [],
        weakDomains: options?.weakAreas?.domains ?? [],
      };
      const orchestratorResult = await runAIAction(req);
      if (orchestratorResult.success && orchestratorResult.data) {
        const d = orchestratorResult.data;
        const questions = d.quizQuestions?.map((q) => {
          const opts = q.options ?? [];
          const correctIdx = ["A", "B", "C", "D"].indexOf(q.correctKey ?? "A");
          return {
            stem: q.stem,
            options: opts.map((o, i) => ({
              key: String.fromCharCode(65 + i),
              text: o,
              isCorrect: i === correctIdx,
            })),
            rationale: "",
            correctKey: q.correctKey ?? "A",
          };
        });
        return {
          success: true,
          intent,
          content: d.content,
          questions: questions && questions.length > 0 ? questions : undefined,
          flashcards: d.flashcards,
          error: orchestratorResult.error,
        };
      }
      return {
        success: false,
        intent,
        error: orchestratorResult.error ?? "Request failed",
      };
    }

    default:
      return handleExplainConcept(track, message).then((r) => ({
        success: r.success,
        intent: "general" as JadeIntent,
        content: r.content,
        error: r.error,
      }));
  }
}
