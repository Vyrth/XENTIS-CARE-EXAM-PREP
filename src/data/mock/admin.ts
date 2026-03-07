/**
 * Mock admin data for CMS workflow - aligned with schema
 */

import type {
  WorkflowStatus,
  QuestionAdmin,
  StudyGuideAdmin,
  FlashcardAdmin,
  VideoAdmin,
  ContentSource,
  MediaRightsRecord,
  ReviewNote,
  UserIssueReport,
  AIPromptConfig,
  MasteryRule,
} from "@/types/admin";

export const MOCK_CONTENT_SOURCES: ContentSource[] = [
  { id: "src-1", title: "Saunders NCLEX", author: "Silvestri", publisher: "Elsevier", year: 2024 },
  { id: "src-2", title: "ATI RN Review", publisher: "ATI", year: 2024 },
  { id: "src-3", title: "NCSBN Test Plan", url: "https://ncsbn.org", year: 2024 },
];

export const MOCK_MEDIA_RIGHTS: MediaRightsRecord[] = [
  { id: "mr-1", mediaId: "img-ecg", mediaType: "image", title: "ECG Rhythm Strip", license: "CC-BY", attribution: "Source: NCSBN" },
  { id: "mr-2", mediaId: "vid-hf", mediaType: "video", title: "Heart Failure Overview", license: "Internal", licenseExpiry: "2026-12-31" },
];

export const MOCK_QUESTIONS_ADMIN: QuestionAdmin[] = [
  {
    id: "q-1",
    stem: "A 65-year-old patient with hypertension presents with chest pain...",
    type: "single_best_answer",
    systemId: "sys-1",
    domainId: "dom-1",
    status: "sme_review",
    options: [
      { key: "A", text: "Administer nitroglycerin", isCorrect: false },
      { key: "B", text: "Obtain 12-lead ECG within 10 min", isCorrect: true },
      { key: "C", text: "Place in high Fowler's", isCorrect: false },
      { key: "D", text: "Start IV and draw enzymes", isCorrect: false },
    ],
    correctAnswer: "B",
    rationale: "ECG within 10 min drives STEMI identification...",
    sourceIds: ["src-1"],
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-05T14:00:00Z",
  },
  {
    id: "q-2",
    stem: "COPD patient on 4 L/min O2, RR decreased, drowsy...",
    type: "single_best_answer",
    systemId: "sys-2",
    domainId: "dom-1",
    status: "draft",
    options: [],
    sourceIds: ["src-1"],
    createdAt: "2025-03-02T09:00:00Z",
    updatedAt: "2025-03-02T09:00:00Z",
  },
];

export const MOCK_STUDY_GUIDES_ADMIN: StudyGuideAdmin[] = [
  {
    id: "sg-1",
    title: "Cardiovascular System",
    systemId: "sys-1",
    status: "published",
    sections: [
      { id: "sec-1", title: "Heart Failure Overview", content: "Heart failure (HF) is...", order: 1 },
      { id: "sec-2", title: "Assessment", content: "Signs and symptoms...", order: 2 },
    ],
    sourceIds: ["src-1"],
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-03-01T00:00:00Z",
  },
];

export const MOCK_FLASHCARDS_ADMIN: FlashcardAdmin[] = [
  { id: "fc-1", deckId: "deck-1", front: "Normal EF?", back: "55-70%", status: "approved", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
  { id: "fc-2", deckId: "deck-1", front: "S3 gallop indicates?", back: "Volume overload", status: "editor_review", createdAt: "2025-03-02T00:00:00Z", updatedAt: "2025-03-02T00:00:00Z" },
];

export const MOCK_VIDEOS_ADMIN: VideoAdmin[] = [
  { id: "v-1", title: "Heart Failure Pathophysiology", systemId: "sys-1", duration: 12, url: "#", status: "published", mediaRightsId: "mr-2", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
  { id: "v-2", title: "COPD Management", systemId: "sys-2", duration: 18, url: "#", status: "qa_review", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
];

export const MOCK_REVIEW_NOTES: ReviewNote[] = [
  { id: "rn-1", entityType: "question", entityId: "q-1", authorId: "u1", authorName: "Jane Editor", role: "editor", content: "Stem looks good. Please verify ECG timing.", createdAt: "2025-03-04T10:00:00Z" },
  { id: "rn-2", entityType: "question", entityId: "q-1", authorId: "u2", authorName: "Dr. Smith (SME)", role: "sme", content: "Verified. 10 min is correct per AHA guidelines.", createdAt: "2025-03-05T14:00:00Z" },
];

export const MOCK_USER_ISSUES: UserIssueReport[] = [
  { id: "iss-1", userId: "u1", entityType: "question", entityId: "q-1", issueType: "typo", description: "Typo in option C: 'Fowler's' not 'Fowlers'", status: "resolved", createdAt: "2025-03-03T12:00:00Z" },
  { id: "iss-2", userId: "u2", entityType: "study_guide", entityId: "sg-1", issueType: "accuracy", description: "SGLT2i dosing may have changed", status: "open", createdAt: "2025-03-06T09:00:00Z" },
];

export const MOCK_AI_PROMPTS: AIPromptConfig[] = [
  { id: "prompt-1", name: "Explain Concept", purpose: "Explain highlighted text", systemPrompt: "You are a nursing tutor...", enabled: true },
  { id: "prompt-2", name: "Create Mnemonic", purpose: "Generate mnemonics", systemPrompt: "Create memorable mnemonics...", enabled: true },
];

export const MOCK_MASTERY_RULES: MasteryRule[] = [
  { id: "rule-1", name: "Cardiovascular 80%", systemId: "sys-1", thresholdPercent: 80, minQuestions: 20, enabled: true },
  { id: "rule-2", name: "Safe Care Domain", domainId: "dom-1", thresholdPercent: 75, minQuestions: 30, enabled: true },
];

export const MOCK_REVIEW_QUEUE = [
  { id: "q-1", type: "question", title: "Chest pain / ECG priority", status: "sme_review" as WorkflowStatus },
  { id: "fc-2", type: "flashcard", title: "S3 gallop", status: "editor_review" as WorkflowStatus },
  { id: "v-2", type: "video", title: "COPD Management", status: "qa_review" as WorkflowStatus },
];

export const MOCK_PUBLISH_QUEUE = [
  { id: "q-3", type: "question", title: "Renal stone management", status: "approved" as WorkflowStatus },
  { id: "sg-2", type: "study_guide", title: "Respiratory System", status: "approved" as WorkflowStatus },
];
