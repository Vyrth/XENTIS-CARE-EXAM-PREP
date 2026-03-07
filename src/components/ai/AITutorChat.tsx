"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  explainHighlight,
  explainQuestion,
  compareConcepts,
  generateFlashcards,
  summarizeToNotebook,
  weakAreaCoaching,
  quizFollowup,
  generateMnemonic,
} from "@/app/actions/ai";
import type { TrackSlug } from "@/data/mock/types";
import type { MnemonicType } from "@/types/ai-tutor";

type Message = { role: "user" | "assistant"; content: string };

export interface AITutorChatProps {
  track: TrackSlug;
  /** Initial context from highlight or URL */
  initialContext?: string;
  initialAction?: "explain" | "mnemonic" | "flashcard" | "summarize" | "quiz";
  /** For explain question */
  questionContext?: { stem: string; rationale: string; correctAnswer: string };
  /** When true, run explain_question on mount if questionContext is set */
  runExplainQuestionOnMount?: boolean;
  /** For weak area coaching */
  weakAreas?: { systems: string[]; domains: string[] };
  onSaveToNotebook?: (content: string) => void;
  onSaveFlashcards?: (cards: { front: string; back: string }[]) => void;
}

export function AITutorChat({
  track,
  initialContext = "",
  initialAction,
  questionContext,
  weakAreas,
  onSaveToNotebook,
  onSaveFlashcards,
  runExplainQuestionOnMount,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFlashcards, setLastFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [lastSummary, setLastSummary] = useState("");

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const runAction = useCallback(
    async (
      action: string,
      params: Record<string, unknown>
    ): Promise<{ content: string; flashcards?: { front: string; back: string }[] } | null> => {
      setIsLoading(true);
      try {
        let result: { success: boolean; data?: { content: string; flashcards?: { front: string; back: string }[] } };
        switch (action) {
          case "explain_highlight":
            result = await explainHighlight({
              track,
              highlightedText: params.text as string,
              contentRef: params.contentRef as string,
            });
            break;
          case "explain_question":
            result = await explainQuestion({
              track,
              questionStem: params.stem as string,
              rationale: params.rationale as string,
              correctAnswer: params.correctAnswer as string,
            });
            break;
          case "compare_concepts":
            result = await compareConcepts({
              track,
              concepts: params.concepts as string[],
            });
            break;
          case "generate_flashcards":
            result = await generateFlashcards({
              track,
              content: params.content as string,
            });
            break;
          case "summarize_to_notebook":
            result = await summarizeToNotebook({
              track,
              notebookContent: params.content as string,
            });
            break;
          case "weak_area_coaching":
            result = await weakAreaCoaching({
              track,
              weakSystems: params.systems as string[],
              weakDomains: params.domains as string[],
            });
            break;
          case "quiz_followup":
            result = await quizFollowup({
              track,
              content: params.content as string,
            });
            break;
          case "generate_mnemonic":
            result = await generateMnemonic({
              track,
              topic: params.topic as string,
              mnemonicType: params.mnemonicType as MnemonicType,
            });
            break;
          default:
            return null;
        }

        if (result.success && result.data) {
          addMessage("assistant", result.data.content);
          if (result.data.flashcards) {
            setLastFlashcards(result.data.flashcards);
          }
          if (action === "summarize_to_notebook" && result.data.content) {
            setLastSummary(result.data.content);
          }
          return result.data;
        }
        addMessage("assistant", (result as { error?: string }).error ?? "Something went wrong.");
      } catch (e) {
        addMessage("assistant", "Failed to get AI response. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return null;
    },
    [track, addMessage]
  );

  // Run initial action when context or question is provided (once)
  const initialRunRef = useRef(false);
  useEffect(() => {
    if (initialRunRef.current) return;

    if (runExplainQuestionOnMount && questionContext) {
      initialRunRef.current = true;
      addMessage("user", `Explain this question: ${questionContext.stem.slice(0, 50)}...`);
      runAction("explain_question", {
        stem: questionContext.stem,
        rationale: questionContext.rationale,
        correctAnswer: questionContext.correctAnswer,
      });
      return;
    }

    if (initialContext && initialAction) {
      initialRunRef.current = true;
      const actionMap: Record<string, string> = {
        explain: "explain_highlight",
        mnemonic: "generate_mnemonic",
        flashcard: "generate_flashcards",
        summarize: "summarize_to_notebook",
        quiz: "quiz_followup",
      };
      const action = actionMap[initialAction];
      if (action) {
        runAction(action, {
          text: initialContext,
          content: initialContext,
          topic: initialContext,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContext, initialAction, runExplainQuestionOnMount, questionContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    addMessage("user", text);
    setInput("");

    await runAction("explain_highlight", { text, contentRef: "" });
  };

  const handleQuickAction = async (
    action: string,
    content?: string
  ) => {
    const c = content ?? input.trim() ?? messages[messages.length - 1]?.content ?? "";
    if (!c && !["weak_area_coaching"].includes(action)) return;

    addMessage("user", `[${action}] ${c.slice(0, 50)}...`);

    if (action === "weak_area_coaching" && weakAreas) {
      await runAction(action, {
        systems: weakAreas.systems,
        domains: weakAreas.domains,
      });
    } else {
      await runAction(action, {
        text: c,
        content: c,
        topic: c,
      });
    }
  };

  const handleExplainQuestion = async () => {
    if (!questionContext) return;
    addMessage("user", `Explain this question: ${questionContext.stem.slice(0, 50)}...`);
    await runAction("explain_question", {
      stem: questionContext.stem,
      rationale: questionContext.rationale,
      correctAnswer: questionContext.correctAnswer,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !initialContext && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 space-y-4">
            <span className="inline-block text-4xl">{Icons.sparkles}</span>
            <p>Ask anything about nursing concepts. Or use quick actions:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {questionContext && (
                <button
                  type="button"
                  onClick={handleExplainQuestion}
                  className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                >
                  Explain this question
                </button>
              )}
              {weakAreas && (weakAreas.systems.length > 0 || weakAreas.domains.length > 0) && (
                <button
                  type="button"
                  onClick={() => handleQuickAction("weak_area_coaching")}
                  className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50"
                >
                  Weak-area coaching
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickAction("generate_mnemonic", input || "heart failure signs")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Mnemonic
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction("quiz_followup", input || "cardiovascular")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Quiz me (5 questions)
              </button>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        {lastFlashcards.length > 0 && onSaveFlashcards && (
          <div className="flex justify-start">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Save {lastFlashcards.length} flashcards?
              </p>
              <button
                type="button"
                onClick={() => {
                  onSaveFlashcards(lastFlashcards);
                  setLastFlashcards([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Save to deck
              </button>
            </div>
          </div>
        )}

        {lastSummary && onSaveToNotebook && (
          <div className="flex justify-start">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Save to notebook?
              </p>
              <button
                type="button"
                onClick={() => {
                  onSaveToNotebook(lastSummary);
                  setLastSummary("");
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
