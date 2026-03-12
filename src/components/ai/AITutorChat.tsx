"use client";

import Link from "next/link";
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
  chatWithJade,
} from "@/app/actions/ai";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import type { TrackSlug } from "@/data/mock/types";
import type { MnemonicType } from "@/types/ai-tutor";

type Message = { role: "user" | "assistant"; content: string };
type QuestionItem = { stem: string; options: { key: string; text: string; isCorrect: boolean }[]; rationale: string; correctKey: string };

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
  /** Workflow-driven next-step suggestions */
  nextStepSuggestions?: { href: string; title: string; description: string }[];
  onSaveToNotebook?: (content: string) => void;
  onSaveFlashcards?: (cards: { front: string; back: string }[]) => void;
}

export function AITutorChat({
  track,
  initialContext = "",
  initialAction,
  questionContext,
  weakAreas,
  nextStepSuggestions,
  onSaveToNotebook,
  onSaveFlashcards,
  runExplainQuestionOnMount,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFlashcards, setLastFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [lastQuestions, setLastQuestions] = useState<QuestionItem[]>([]);
  const [lastConceptExplanation, setLastConceptExplanation] = useState<{
    title: string;
    summary: string;
    high_yield_points: string[];
    common_traps: string[];
  } | null>(null);
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
              highlightedText: params.text as string,
              contentRef: params.contentRef as string,
            });
            break;
          case "explain_question":
            result = await explainQuestion({
              questionStem: params.stem as string,
              rationale: params.rationale as string,
              correctAnswer: params.correctAnswer as string,
            });
            break;
          case "compare_concepts":
            result = await compareConcepts({
              concepts: params.concepts as string[],
            });
            break;
          case "generate_flashcards":
            result = await generateFlashcards({
              content: params.content as string,
            });
            break;
          case "summarize_to_notebook":
            result = await summarizeToNotebook({
              notebookContent: params.content as string,
            });
            break;
          case "weak_area_coaching":
            result = await weakAreaCoaching({
              weakSystems: params.systems as string[],
              weakDomains: params.domains as string[],
            });
            break;
          case "quiz_followup":
            result = await quizFollowup({
              content: params.content as string,
            });
            break;
          case "generate_mnemonic":
            result = await generateMnemonic({
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
        const errResult = result as { error?: string; upgradeRequired?: boolean };
        if (errResult.upgradeRequired) {
          addMessage("assistant", "UPGRADE_PROMPT");
          return null;
        }
        addMessage("assistant", errResult.error ?? "Request failed. Please try again.");
      } catch {
        addMessage("assistant", "Jade Tutor is temporarily unavailable. Please try again in a moment.");
      } finally {
        setIsLoading(false);
      }
      return null;
    },
    [addMessage]
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
    setIsLoading(true);

    try {
      const result = await chatWithJade({
        message: text,
        weakAreas: weakAreas
          ? { systems: weakAreas.systems, domains: weakAreas.domains }
          : undefined,
      });

      if (result.success) {
        if (result.questions && result.questions.length > 0) {
          setLastQuestions(result.questions);
          setLastFlashcards([]);
          setLastConceptExplanation(null);
          addMessage("assistant", result.content ?? `Here are ${result.questions.length} practice questions.`);
        } else if (result.flashcards && result.flashcards.length > 0) {
          setLastFlashcards(result.flashcards);
          setLastQuestions([]);
          setLastConceptExplanation(null);
          addMessage("assistant", result.content ?? `Here are ${result.flashcards.length} flashcards.`);
        } else if (result.conceptExplanation) {
          setLastConceptExplanation(result.conceptExplanation);
          setLastQuestions([]);
          setLastFlashcards([]);
          addMessage("assistant", result.content ?? result.conceptExplanation.summary);
        } else {
          setLastQuestions([]);
          setLastFlashcards([]);
          setLastConceptExplanation(null);
          addMessage("assistant", result.content ?? "I couldn't generate a response. Please try again.");
        }
      } else if (result.upgradeRequired) {
        addMessage("assistant", "UPGRADE_PROMPT");
      } else {
        addMessage(
          "assistant",
          result.error ?? "Jade couldn't respond. Check your connection or try a different request."
        );
      }
    } catch {
      addMessage(
        "assistant",
        "Jade Tutor is temporarily unavailable. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
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
            <p>Ask anything about nursing concepts. Jade Tutor is here to help—use quick actions below or type your question.</p>
            {nextStepSuggestions && nextStepSuggestions.length > 0 && (
              <div className="text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Suggested next steps</p>
                <div className="flex flex-col gap-2">
                  {nextStepSuggestions.slice(0, 3).map((s) => (
                    <Link
                      key={s.href + s.title}
                      href={s.href}
                      className="block px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm transition-colors"
                    >
                      <span className="font-medium">{s.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
            {m.role === "assistant" && m.content === "UPGRADE_PROMPT" ? (
              <div className="max-w-[85%] w-full">
                <UpgradePrompt
                  reason="Daily Jade Tutor limit reached"
                  usage="Upgrade for unlimited actions"
                  variant="inline"
                />
              </div>
            ) : (
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3">
              <span className="animate-pulse">Jade is thinking...</span>
            </div>
          </div>
        )}

        {lastQuestions.length > 0 && (
          <div className="flex justify-start max-w-[85%]">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 space-y-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {lastQuestions.length} practice questions
              </p>
              {lastQuestions.map((q, i) => (
                <div key={i} className="border-b border-slate-200 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{q.stem}</p>
                  <div className="space-y-1 mb-2">
                    {q.options.map((o) => (
                      <p key={o.key} className="text-xs text-slate-600 dark:text-slate-400">
                        {o.key}. {o.text} {o.isCorrect ? "✓" : ""}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">{q.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastConceptExplanation && (
          <div className="flex justify-start max-w-[85%]">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lastConceptExplanation.title}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {lastConceptExplanation.summary}
              </p>
              {lastConceptExplanation.high_yield_points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">High-yield points</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {lastConceptExplanation.high_yield_points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lastConceptExplanation.common_traps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Common traps</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {lastConceptExplanation.common_traps.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
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
            placeholder="Ask Jade Tutor anything..."
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
