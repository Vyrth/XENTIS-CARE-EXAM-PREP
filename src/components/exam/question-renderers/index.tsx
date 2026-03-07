"use client";

/**
 * Question renderer factory - maps item type to renderer component
 */

import type { ItemType, ExamResponse } from "@/types/exam";

export interface ExamQuestion {
  id: string;
  stem: string;
  type: string;
  options?: { key: string; text: string; isCorrect?: boolean }[];
  correctAnswer?: string | string[];
  imageUrl?: string;
  caseStudyTabs?: { id: string; title: string; content: string }[];
  chartTableData?: Record<string, unknown>;
  matrixRows?: string[];
  matrixCols?: string[];
  clozeBlanks?: { id: string; options: string[] }[];
  hotspotRegions?: { id: string; label: string }[];
  highlightTargets?: { id: string; text: string }[];
  bowTieLeft?: string[];
  bowTieRight?: string[];
  selectN?: number;
}

export interface QuestionRendererProps {
  question: ExamQuestion;
  response?: ExamResponse;
  onChange: (response: ExamResponse) => void;
  struckOut?: string[];
  onStrikeOut?: (keys: string[]) => void;
  disabled?: boolean;
}

import { SingleBestAnswerRenderer } from "./SingleBestAnswerRenderer";
import { MultipleResponseRenderer } from "./MultipleResponseRenderer";
import { ImageBasedRenderer } from "./ImageBasedRenderer";
import { CaseStudyRenderer } from "./CaseStudyRenderer";
import { DosageCalcRenderer } from "./DosageCalcRenderer";
import { SelectNRenderer } from "./SelectNRenderer";
import { ChartTableRenderer } from "./ChartTableRenderer";
import { MatrixRenderer } from "./MatrixRenderer";
import { DropdownClozeRenderer } from "./DropdownClozeRenderer";
import { OrderedResponseRenderer } from "./OrderedResponseRenderer";
import { HotspotRenderer } from "./HotspotRenderer";
import { HighlightTextRenderer } from "./HighlightTextRenderer";
import { BowTieRenderer } from "./BowTieRenderer";

const RENDERERS: Partial<Record<ItemType, React.ComponentType<QuestionRendererProps>>> = {
  single_best_answer: SingleBestAnswerRenderer,
  multiple_response: MultipleResponseRenderer,
  select_n: SelectNRenderer,
  image_based: ImageBasedRenderer,
  chart_table_exhibit: ChartTableRenderer,
  matrix: MatrixRenderer,
  dropdown_cloze: DropdownClozeRenderer,
  ordered_response: OrderedResponseRenderer,
  hotspot: HotspotRenderer,
  highlight_text_table: HighlightTextRenderer,
  case_study: CaseStudyRenderer,
  dosage_calc: DosageCalcRenderer,
  bow_tie_analog: BowTieRenderer,
};

export function getQuestionRenderer(type: string): React.ComponentType<QuestionRendererProps> {
  return RENDERERS[type as ItemType] ?? SingleBestAnswerRenderer;
}
