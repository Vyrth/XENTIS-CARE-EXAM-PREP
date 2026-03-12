/**
 * Shared types - used across app for TrackSlug, Question, Note, etc.
 * TYPE-ONLY: No runtime mock data. Aligned with Supabase schema.
 * Location: data/mock/types (historical; consider moving to src/types/ in future).
 */
export type TrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

export type QuestionType =
  | "single_best_answer"
  | "multiple_response"
  | "image_based"
  | "case_study"
  | "dosage_calc";

export interface System {
  id: string;
  slug: string;
  name: string;
  track: TrackSlug;
}

export interface Domain {
  id: string;
  slug: string;
  name: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  systemId: string;
  domainId: string;
}

export interface Question {
  id: string;
  stem: string;
  type: QuestionType;
  systemId: string;
  domainId: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  rationale?: string;
  imageUrl?: string;
  caseStudyTabs?: CaseStudyTab[];
}

export interface QuestionOption {
  key: string;
  text: string;
  isCorrect?: boolean;
}

export interface CaseStudyTab {
  id: string;
  title: string;
  content: string;
}

export interface LabReference {
  id: string;
  name: string;
  abbreviation?: string;
  unit: string;
  low: number;
  high: number;
  set: string;
}

export interface StudyGuideSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
}

export interface Note {
  id: string;
  content: string;
  contentRef?: string;
  createdAt: string;
}

export interface AdaptiveRecommendation {
  id: string;
  type: "question" | "content" | "exam";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  reason: string;
  href?: string;
  entityId?: string;
}
