/**
 * Question templates by item type - fast scaffolding for authors
 */

import type { QuestionOptionInput } from "@/lib/admin/question-validation";

export interface QuestionTemplate {
  leadIn?: string;
  instructions?: string;
  stemPlaceholder: string;
  options: QuestionOptionInput[];
}

export const QUESTION_TEMPLATES: Record<string, QuestionTemplate> = {
  single_best_answer: {
    stemPlaceholder: "A patient presents with [symptoms]. Which nursing action is the priority?",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: true },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
  multiple_response: {
    instructions: "Select all that apply.",
    stemPlaceholder: "Which interventions are appropriate for a patient with [condition]?",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: false },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
  select_n: {
    instructions: "Select the 2 most appropriate responses.",
    stemPlaceholder: "Which two findings indicate [condition]?",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: false },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
  image_based: {
    instructions: "Refer to the image above.",
    stemPlaceholder: "Based on the image, what is the correct interpretation?",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: true },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
  dosage_calc: {
    instructions: "Round to the nearest tenth. Include unit in your answer.",
    stemPlaceholder: "The provider orders [medication] [dose] [route]. The pharmacy supplies [concentration]. How many [units] should the nurse administer?",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: true },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
  case_study: {
    leadIn: "Use the following scenario to answer the question.",
    stemPlaceholder: "[Case scenario paragraph]\n\nQuestion: [Specific question]",
    options: [
      { key: "A", text: "", isCorrect: false },
      { key: "B", text: "", isCorrect: true },
      { key: "C", text: "", isCorrect: false },
      { key: "D", text: "", isCorrect: false },
    ],
  },
};
