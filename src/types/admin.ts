/**
 * Admin CMS types - aligned with Supabase schema for content workflow
 */

import type { QuestionType } from "@/data/mock/types";

export const WORKFLOW_STATUSES = [
  "draft",
  "editor_review",
  "sme_review",
  "legal_review",
  "qa_review",
  "approved",
  "published",
  "retired",
  "needs_revision",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  editor_review: "Editor Review",
  sme_review: "SME Review",
  legal_review: "Legal Review",
  qa_review: "QA Review",
  approved: "Approved",
  published: "Published",
  retired: "Retired",
  needs_revision: "Needs Revision",
};

/** Valid transitions: from -> to[] (includes send-back). draft/editor_review -> published allowed for auto-publish (gate bypass). */
export const STATUS_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ["editor_review", "published"],
  editor_review: ["draft", "needs_revision", "sme_review", "published"],
  sme_review: ["editor_review", "needs_revision", "legal_review"],
  legal_review: ["sme_review", "needs_revision", "qa_review"],
  qa_review: ["legal_review", "needs_revision", "approved"],
  approved: ["qa_review", "published"],
  published: ["retired"],
  retired: ["draft"],
  needs_revision: ["draft", "editor_review"],
};

export interface ContentSource {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  year?: number;
  url?: string;
  license?: string;
  notes?: string;
}

export interface MediaRightsRecord {
  id: string;
  mediaId: string;
  mediaType: "image" | "video" | "audio";
  title: string;
  license: string;
  licenseExpiry?: string;
  sourceUrl?: string;
  attribution?: string;
  restrictions?: string;
}

export interface ReviewNote {
  id: string;
  entityType: "question" | "study_guide" | "flashcard" | "video";
  entityId: string;
  authorId: string;
  authorName: string;
  role: "editor" | "sme" | "legal" | "qa";
  content: string;
  createdAt: string;
}

export interface QuestionAdmin extends Record<string, unknown> {
  id: string;
  stem: string;
  type: QuestionType;
  systemId: string;
  domainId: string;
  topicId?: string;
  examTrackId?: string;
  examTrackSlug?: string;
  status: WorkflowStatus;
  options?: { key: string; text: string; isCorrect?: boolean }[];
  correctAnswer?: string | string[];
  rationale?: string;
  exhibits?: { id: string; type: string; url: string; alt?: string }[];
  interactionConfig?: Record<string, unknown>;
  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyGuideAdmin extends Record<string, unknown> {
  id: string;
  title: string;
  systemId: string;
  examTrackId?: string;
  examTrackSlug?: string;
  status: WorkflowStatus;
  sections: { id: string; title: string; content: string; order: number }[];
  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardAdmin extends Record<string, unknown> {
  id: string;
  deckId: string;
  front: string;
  back: string;
  status: WorkflowStatus;
  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoAdmin extends Record<string, unknown> {
  id: string;
  title: string;
  systemId: string;
  examTrackId?: string;
  examTrackSlug?: string;
  duration: number;
  url: string;
  status: WorkflowStatus;
  mediaRightsId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserIssueReport {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  issueType: "accuracy" | "typo" | "clarity" | "other";
  description: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  createdAt: string;
}

export interface AIPromptConfig {
  id: string;
  name: string;
  purpose: string;
  systemPrompt: string;
  userPromptTemplate?: string;
  enabled: boolean;
}

export interface MasteryRule {
  id: string;
  name: string;
  systemId?: string;
  domainId?: string;
  thresholdPercent: number;
  minQuestions: number;
  enabled: boolean;
}
